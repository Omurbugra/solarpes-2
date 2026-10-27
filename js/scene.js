// Arketip binası: Rhino'da modellenen yapı kitini (assets/kit.glb) plan tipine, kat sayısına,
// pencere oranına, çatı tipine ve yönelime göre dizer; renovasyon sistemlerini katman olarak açıp kapatır.
// Rhino ekseni (x doğu, y kuzey, z yukarı) -> three (x, z, -y). Ön cephe Rhino y=0 hattında, güneye bakar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ASSETS = 'assets/';
const SYSKEYS = ['roof', 'wall', 'window', 'ground', 'shading', 'heatpump', 'pv'];
const GLASS = [0xa9d2ee, 0x5b97d0, 0x23568f];        // tek, çift, üçlü cam
const GLAZ = { single: 0, double: 1, triple: 2 };
const ENTRY = { I: 2, L: 2, U: 4 };                    // giriş kenarı: I'da uzun cephe, L ve U'da iç avlu cephesi
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- kit ---------- */
let kitP = null;
export function loadKit(onProgress) {
  if (kitP) return kitP;
  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const metaP = fetch(ASSETS + 'kit.json').then((r) => r.json());
  const glbP = new Promise((res, rej) => loader.load(ASSETS + 'kit.glb', res, (e) => {
    onProgress?.(e.total ? e.loaded / e.total : Math.min(0.95, e.loaded / 1.7e6));
  }, rej));
  kitP = Promise.all([metaP, glbP]).then(([meta, gltf]) => {
    const matDefs = {};
    for (const n in meta.materials) matDefs[THREE.PropertyBinding.sanitizeNodeName(n)] = meta.materials[n];
    const parts = {};                                   // modül -> grup -> [{mat, geo}]
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name.includes('__') ? o.name : o.parent?.name || '';
      const [mod, grp, mat] = name.split('__');
      if (!mat) return;
      const g = new THREE.BufferGeometry();
      const src = o.geometry;
      g.setAttribute('position', src.getAttribute('position').clone());
      g.setAttribute('normal', src.getAttribute('normal').clone());
      const uv = src.getAttribute('uv');
      g.setAttribute('uv', uv ? uv.clone() : new THREE.BufferAttribute(new Float32Array(src.getAttribute('position').count * 2), 2));
      if (src.index) g.setIndex(src.index.clone());
      else g.setIndex([...Array(src.getAttribute('position').count).keys()]);
      g.applyMatrix4(o.matrixWorld);
      ((parts[mod] ??= {})[grp] ??= []).push({ mat, geo: g });
    });
    return { meta, parts, matDefs };
  });
  return kitP;
}

/* ---------- malzemeler ---------- */
const texLoader = new THREE.TextureLoader();
function tex(file, rgb = true) {
  const t = texLoader.load(ASSETS + 'tex/' + file);
  if (rgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// Dünya ölçeğinde UV verilen dokulu malzemeler: dosya, metre başına tekrar (u, v), renk karışımı
const TEX = {
  A_Render: ['facade_mineral_stucco.png', 1 / 2.4, 1 / 2.4],
  A_RenderNew: ['facade_mineral_stucco.png', 1 / 2.4, 1 / 2.4],
  A_Pilaster: ['facade_mineral_stucco.png', 1 / 2.4, 1 / 2.4],
  A_Plinth: ['facade_andesite_v2.png', 1 / 1.6, 1 / 1.6],
  A_Tile: ['roof_terracotta_light_v2.png', 1 / 2.4, 1 / 3.9],
};

function pvTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const x = c.getContext('2d');
  x.fillStyle = '#d9dde2'; x.fillRect(0, 0, 256, 384);
  const cw = 256 / 6, ch = 384 / 10;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) {
    const g = x.createLinearGradient(0, j * ch, 0, (j + 1) * ch);
    g.addColorStop(0, '#203466'); g.addColorStop(1, '#16264d');
    x.fillStyle = g;
    x.fillRect(i * cw + 1.5, j * ch + 1.5, cw - 3, ch - 3);
    x.fillStyle = 'rgba(210,220,235,.35)';
    x.fillRect(i * cw + cw * 0.3, j * ch + 1.5, 1, ch - 3);
    x.fillRect(i * cw + cw * 0.7, j * ch + 1.5, 1, ch - 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ---------- yardımcılar ---------- */
const v2 = (x, y) => ({ x, y });
function edgesOf(foot) {
  const n = foot.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = foot[i], b = foot[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    out.push({ a: v2(a[0], a[1]), d: v2(dx / len, dy / len), n: v2(dy / len, -dx / len), len, rot: Math.atan2(dy, dx) });
  }
  return out;
}
// Rhino düzleminde yerel bir noktayı/eksen açısını three matrisine çevirir
function place(x, y, z, rot, sy = 1) {
  const m = new THREE.Matrix4().makeRotationY(rot);
  if (sy !== 1) m.scale(new THREE.Vector3(1, sy, 1));     // kat yüksekliği: modül düşeyde ölçeklenir
  m.setPosition(x, z, -y);
  return m;
}
// three düzleminde eksene hizalı kutu (x0..x1, y0..y1, z0..z1) ve UV'si metre ölçekli
function boxGeo(x0, y0, z0, x1, y1, z1, tile = 0) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (tile) worldUV(g, 1 / tile, 1 / tile);
  return g;
}
function railTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 64, 5);
  x.fillRect(0, 59, 64, 5);
  for (let i = 0; i < 4; i++) x.fillRect(i * 16 + 6, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
// Bina yerel ekseni dünyaya göre döner: ns 180° (giriş cephesi güneye), ew -90° (giriş doğuya)
const ROT = { ns: Math.PI, ew: -Math.PI / 2 };
function rotWorld(n, orient) { return orient === 'ew' ? v2(n.y, -n.x) : v2(-n.x, -n.y); }

// Dünya ölçekli UV: dokular cephede ve çatıda dikiş göstermeden, ölçekli akar
function worldUV(geo, su, sv) {
  const p = geo.getAttribute('position'), n = geo.getAttribute('normal'), uv = geo.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let u, v;
    if (Math.abs(ny) > 0.97) { u = x; v = z; }
    else if (Math.abs(ny) > 0.2) {                 // eğimli çatı: sıralar saçağa paralel
      const h = Math.hypot(nx, nz), hx = nx / h, hz = nz / h;
      u = x * -hz + z * hx;
      v = y / Math.sqrt(1 - ny * ny);
    } else if (Math.abs(nx) > Math.abs(nz)) { u = z; v = y; }
    else { u = x; v = y; }
    uv.setXY(i, u * su, v * sv);
  }
  uv.needsUpdate = true;
}

/* ================================================================ sahne */
export class ArchScene {
  constructor(opts = {}) {
    this.el = document.createElement('div');
    this.el.className = 'gl3d';
    this.P = { plan: 'I', floors: 3, wwr: 'orta', orient: 'ns', roofT: 'flat', fh: 3.2, glaz: 'single' };
    this.on = Object.fromEntries(SYSKEYS.map((k) => [k, false]));
    this.anim = [];
    this.dirty = true;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    this.el.appendChild(r.domElement);

    const s = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.5;
    s.add(new THREE.HemisphereLight(0xf4f7ff, 0xb6a98f, 1.3));
    const sun = this.sun = new THREE.DirectionalLight(0xfff3e2, 2.7);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    s.add(sun, sun.target);

    const cam = this.camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
    const c = this.controls = new OrbitControls(cam, r.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.maxPolarAngle = 1.38;
    c.minPolarAngle = 0.25;
    c.autoRotate = !!opts.autoRotate && !reduceMotion;
    c.autoRotateSpeed = 0.6;
    c.enablePan = false;
    c.addEventListener('change', () => (this.dirty = true));
    c.addEventListener('start', () => (this.userMoved = true));

    s.fog = new THREE.Fog(0xe3e8df, 150, 420);            // uzak sokaklar ve yapılar sayfa zeminine erir
    this.setSky();
    new MutationObserver(() => this.setSky()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.setSky());

    this.world = new THREE.Group();                      // hale (dönmez)
    this.bld = new THREE.Group();                        // yönelimle döner
    s.add(this.world, this.bld);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.el);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setSky() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--sky1').trim();
    if (c) this.scene.fog.color.set(c);
    this.dirty = true;
  }

  async init(onProgress) {
    this.kit = await loadKit(onProgress);
    this.makeMaterials();
    this.build();
    this.frameCamera(false);
  }

  attach(container) {
    container.appendChild(this.el);
    this.resize();
  }

  /* ---------- malzemeler ---------- */
  makeMaterials() {
    const defs = this.kit.matDefs;
    const base = {};
    this.texs = {};
    for (const k in TEX) this.texs[k] ??= tex(TEX[k][0]);
    const pvMap = pvTexture();
    const mk = (name) => {
      const d = defs[name] || { c: [0.7, 0.7, 0.7], r: 0.9, m: 0 };
      const col = new THREE.Color().setRGB(d.c[0], d.c[1], d.c[2], THREE.SRGBColorSpace);
      const m = new THREE.MeshStandardMaterial({
        color: col, roughness: THREE.MathUtils.clamp(d.r ?? 0.9, 0.3, 1), metalness: d.m ?? 0,
      });
      if (TEX[name]) {
        m.map = this.texs[name];
        if (name === 'A_Tile' || name === 'A_Plinth') m.color.set(0xffffff);
        else m.color.lerp(new THREE.Color(0xffffff), 0.35);
      }
      if (name === 'A_PVCell') { m.map = pvMap; m.color.set(0xffffff); m.roughness = 0.25; m.metalness = 0.35; m.envMapIntensity = 1.8; }
      if (/Glass/.test(name)) { m.roughness = 0.07; m.metalness = 0.35; m.envMapIntensity = 1.8; }
      if (/Leaf/.test(name)) m.flatShading = true;
      return m;
    };
    this.mk = (name) => (base[name] ??= mk(name));
    // cam: tek camdan üçlü cama açık maviden koyu maviye; yalıtımlı camda kasa beyaz PVC
    this.glass = GLASS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.12, metalness: 0.15, envMapIntensity: 1.3 }));
    this.frameNew = new THREE.MeshStandardMaterial({ color: 0xf3f3ef, roughness: 0.45, metalness: 0.05 });
    // çevre: avlu, kaldırım, asfalt, komşu yapı kütleleri (maket beyazı)
    const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.95, ...o });
    this.ctxMat = {
      yard: M({ color: 0xffffff, map: tex('paving_600mm_staggered_variation_v5.jpg') }),
      walk: M({ color: 0xdedbd3, map: tex('tex_concrete.png') }),
      road: M({ color: 0xffffff, map: tex('tex_asphalt.png') }),
      line: M({ color: 0xf4f2ea }),
      ground: M({ color: 0xe3e1da }),
      wall: M({ color: 0xd9d3c6 }),
      pier: M({ color: 0xc9c2b4 }),
      rail: M({ color: 0x59606a, alphaMap: railTexture(), alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 }),
      block: M({ color: 0xf1efe9, roughness: 1 }),
      blockTop: M({ color: 0xdcd9d1, roughness: 1 }),
    };
    this.haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, opacity: 0.5, color: 0xffc107, visible: false });
  }

  /* ---------- kurulum ---------- */
  build() {
    const { meta, parts } = this.kit;
    const P = this.P, BAY = meta.bay;
    const FH = P.fh, sy = P.fh / meta.fh;               // kit 3,4 m kat yüksekliğiyle modellendi
    const foot = meta.foot[P.plan];
    const E = edgesOf(foot);
    const H = P.floors * FH;
    const buckets = new Map();             // "sys|grp|mat" -> [geo]
    const put = (mod, grps, m, sysOf) => {
      const md = parts[mod];
      if (!md) return;
      for (const grp of grps) {
        for (const { mat, geo } of md[grp] || []) {
          const sys = sysOf(grp);
          if (!sys) continue;
          const k = sys + '|' + mat;
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k).push([geo, m]);
        }
      }
    };
    const SYS = { base: 'base', win: 'win', wall: 'wall', ground: 'ground', shadeH: 'shading', shadeV: 'shading',
      hp: 'heatpump', rfFlat: 'base', rfPitch: 'base', insFlat: 'roof', insPitch: 'roof', ctx: 'base' };
    const sysOf = (g) => SYS[g] ?? (g.startsWith('pv') ? 'pv' : null);

    const ent = ENTRY[P.plan];
    const k0 = Math.floor(Math.round(E[ent].len / BAY) / 2) - 1;   // giriş akslarının ilki
    const convex = E.map((e, i) => {
      const p = E[(i + E.length - 1) % E.length].d;
      return p.x * e.d.y - p.y * e.d.x > 0;
    });

    E.forEach((e, ei) => {
      const nb = Math.round(e.len / BAY);
      const wn = rotWorld(e.n, P.orient);
      const shade = wn.y < -0.7 ? 'shadeH' : Math.abs(wn.x) > 0.7 ? 'shadeV' : null;
      const at = (s, z, off = 0, k = 1) => place(e.a.x + e.d.x * s + e.n.x * off, e.a.y + e.d.y * s + e.n.y * off, z, e.rot, k);
      for (let f = 0; f < P.floors; f++) {
        const kind = f === 0 ? 'g' : 'u';
        for (let i = 0; i < nb; i++) {
          if (f === 0 && ei === ent && (i === k0 || i === k0 + 1)) continue;
          const g = ['base', 'win', 'wall', 'ground'];
          if (shade) g.push(shade);
          put(`bay_${P.wwr}_${kind}`, g, at(i * BAY, f * FH, 0, sy), sysOf);
        }
        for (let i = 2; i < nb; i += 2) {
          if (f === 0 && ei === ent && i === k0 + 1) continue;
          put('pil_' + kind, ['base', 'wall', 'ground'], at(i * BAY, f * FH, 0, sy), sysOf);
        }
        if (convex[ei]) put('cor_' + kind, ['base', 'wall', 'ground'], at(0, f * FH, 0, sy), sysOf);
      }
      const top = P.roofT === 'flat' ? 'par' : 'cnc';
      for (let i = 0; i < nb; i++) put(top, ['base', 'wall'], at(i * BAY, H), sysOf);
      if (convex[ei]) put(top + 'c', ['base', 'wall'], at(0, H), sysOf);
      if (ei === ent) {
        put('ent', ['base', 'win', 'wall', 'ground'], at(k0 * BAY, 0, 0, sy), sysOf);
        put('flag', ['ctx'], at(Math.max(1.5, k0 * BAY - 3.5), 0, 6.5), sysOf);
      }
    });

    // ısı pompası servis avlusu: girişin karşısındaki dış cephe (avlu içi değil), mümkünse kuzey;
    // grup iki pilastır arasındaki 7 m'lik aksa ortalanır, kenarın ortasına en yakın aksa oturur
    const fx = foot.map((p) => p[0]), fy = foot.map((p) => p[1]);
    const onBox = (e) => (Math.abs(e.n.x) > 0.5 ? [Math.min(...fx), Math.max(...fx)] : [Math.min(...fy), Math.max(...fy)])
      .some((v) => Math.abs((Math.abs(e.n.x) > 0.5 ? e.a.x : e.a.y) - v) < 0.01);
    let best = null;
    E.forEach((e, ei) => {
      if (ei === ent || e.len < 14 || !onBox(e)) return;
      const score = rotWorld(e.n, P.orient).y * 100 + e.len;
      if (!best || score > best.score) best = { e, score };
    });
    {
      const e = best.e, span = 2 * BAY, wHP = 5.2;
      let s = Math.floor(e.len / 2 / span) * span + (span - wHP) / 2;
      if (s + wHP > e.len - 0.6) s = e.len - span + (span - wHP) / 2;
      put('hp', ['hp'], place(e.a.x + e.d.x * s, e.a.y + e.d.y * s, 0, e.rot), sysOf);
    }

    // çatı
    const rm = 'roof_' + P.plan;
    if (P.roofT === 'flat') {
      put(rm, ['rfFlat', 'insFlat', 'pvFlat_' + P.orient], place(0, 0, H, 0), sysOf);
    } else {
      put(rm, ['rfPitch', 'insPitch', 'pvPitch_' + P.orient], place(0, 0, H + 0.28 + meta.fascia, 0), sysOf);
    }

    /* --- birleştir --- */
    for (const c of [...this.bld.children]) { this.bld.remove(c); c.traverse((o) => o.geometry?.dispose()); }
    this.sysMeshes = Object.fromEntries(['base', 'win', ...SYSKEYS].map((k) => [k, []]));
    this.sysMats = {};
    const inner = new THREE.Group();
    for (const [k, list] of buckets) {
      const [sys, mat] = k.split('|');
      const geos = list.map(([g, m]) => g.clone().applyMatrix4(m));
      const geo = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (TEX[mat]) worldUV(geo, TEX[mat][1], TEX[mat][2]);
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      let material = this.mk(mat);
      if (sys !== 'base' && sys !== 'win') {
        // her sistem kendi malzeme kopyasını taşır: ekleme animasyonu (belirme + parlama) yalnız onu etkiler
        material = material.clone();
        material.userData.baseEmissive = material.emissive.clone();
        (this.sysMats[sys] ??= []).push(material);
      }
      const mesh = new THREE.Mesh(geo, material);
      mesh.userData = { sys, mat };
      mesh.castShadow = !/Leaf|Glass/.test(mat) || true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.sysMeshes[sys].push(mesh);
      inner.add(mesh);
    }
    // bina merkezini orijine al, yönelim etrafında döndür
    const xs = foot.map((p) => p[0]), ys = foot.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    inner.position.set(-cx, 0, cy);
    inner.updateMatrixWorld(true);
    inner.children.forEach((m) => m.updateMatrix());

    // okul parseli ve çevresi binayla birlikte döner (sokak ızgarası binaya paralel)
    const bw = Math.max(...xs) - Math.min(...xs), bd = Math.max(...ys) - Math.min(...ys);
    this.bld.rotation.y = ROT[P.orient];
    this.bld.add(inner, this.buildSite(bw, bd));
    this.H = H + (P.roofT === 'flat' ? 1 : 4);
    this.radius = Math.hypot(bw + 8, bd + 8, this.H) / 2;

    this.applySystems(null);
    this.fitSun();
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  /** Okul parseli (avlu, çevre duvarı ve korkuluk), kaldırımlar, sokaklar ve maket beyazı komşu yapı kütleleri. */
  buildSite(bw, bd) {
    const G = {};                                          // malzeme -> [geometri]
    const add = (mat, g) => (G[mat] ??= []).push(g);
    const px = bw / 2 + 11, pz = bd / 2 + 11;              // parsel yarı boyları
    const W = 3, RD = 5.5;                                 // kaldırım genişliği, yol yarı genişliği
    const rx = px + W + RD, rz = pz + W + RD;              // sokak eksenleri
    const L = Math.max(rx, rz) + 120;
    const ext = rx + RD + W, ezt = rz + RD + W;

    // avlu
    add('yard', boxGeo(-px, -0.15, -pz, px, 0, pz, 3.6));
    // çevre duvarı, ayaklar ve korkuluk; giriş tarafında 8 m kapı boşluğu
    const rails = [];
    const side = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 5));
      const dx = (bx - ax) / len, dz = (bz - az) / len;
      for (let i = 0; i < n; i++) {
        const s0 = (i * len) / n, s1 = ((i + 1) * len) / n;
        const x0 = ax + dx * s0, z0 = az + dz * s0, x1 = ax + dx * s1, z1 = az + dz * s1;
        add('wall', boxGeo(Math.min(x0, x1) - 0.15, 0, Math.min(z0, z1) - 0.15, Math.max(x0, x1) + 0.15, 0.55, Math.max(z0, z1) + 0.15));
        add('pier', boxGeo(x0 - 0.23, 0, z0 - 0.23, x0 + 0.23, 1.95, z0 + 0.23));
        if (i === n - 1) add('pier', boxGeo(x1 - 0.23, 0, z1 - 0.23, x1 + 0.23, 1.95, z1 + 0.23));
        const g = new THREE.PlaneGeometry(s1 - s0 - 0.46, 1.25);
        const uv = g.getAttribute('uv');
        for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) * (s1 - s0)) / 0.64);
        g.rotateY(-Math.atan2(dz, dx));
        g.translate((x0 + x1) / 2, 0.55 + 0.625, (z0 + z1) / 2);
        rails.push(g);
      }
    };
    // kapı boşluğu giriş cephesi tarafında (yerel -z = Rhino +y)
    side(-px, -pz, -4, -pz);
    side(4, -pz, px, -pz);
    side(px, -pz, px, pz);
    side(px, pz, -px, pz);
    side(-px, pz, -px, -pz);
    add('rail', mergeGeometries(rails));

    // sokaklar boydan boya; kaldırımlar kavşaklarda kesilir
    const cuts = (c) => [[-L, -c - RD], [-c + RD, c - RD], [c + RD, L]].filter(([a, b]) => b - a > 0.5);
    for (const sx of [-1, 1]) {
      const x = sx * rx;
      add('road', boxGeo(x - RD, -0.08, -L, x + RD, -0.02, L, 6));
      for (const [a, b] of cuts(rz)) {
        add('walk', boxGeo(x - RD - W, -0.1, a, x - RD, 0.1, b, 2));
        add('walk', boxGeo(x + RD, -0.1, a, x + RD + W, 0.1, b, 2));
        for (let z = a + 2; z < b - 3; z += 6) add('line', boxGeo(x - 0.08, -0.02, z, x + 0.08, -0.01, z + 3));
      }
    }
    for (const sz of [-1, 1]) {
      const z = sz * rz;
      add('road', boxGeo(-L, -0.08, z - RD, L, -0.025, z + RD, 6));
      for (const [a, b] of cuts(rx)) {
        add('walk', boxGeo(a, -0.1, z - RD - W, b, 0.1, z - RD, 2));
        add('walk', boxGeo(a, -0.1, z + RD, b, 0.1, z + RD + W, 2));
        for (let x = a + 2; x < b - 3; x += 6) add('line', boxGeo(x, -0.025, z - 0.08, x + 3, -0.015, z + 0.08));
      }
    }
    add('ground', boxGeo(-L, -0.4, -L, L, -0.09, L));

    // komşu yapı kütleleri: sokak ızgarasına paralel, yollara ve parsele taşmadan; tohumlu, her seferinde aynı
    let seed = 11 + this.P.plan.charCodeAt(0);
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const placed = [];
    const clearRoad = (c, h, a) => Math.abs(Math.abs(c) - a) > h + RD + W + 4;
    for (let t = 0; t < 900 && placed.length < 64; t++) {
      const w = 12 + rnd() * 14, d = 10 + rnd() * 8, h = (2 + Math.floor(rnd() * 4)) * 3;
      const x = (rnd() * 2 - 1) * (L - 25), z = (rnd() * 2 - 1) * (L - 25);
      if (Math.abs(x) < ext + w / 2 + 5 && Math.abs(z) < ezt + d / 2 + 5) continue;
      if (!clearRoad(x, w / 2, rx) || !clearRoad(z, d / 2, rz)) continue;
      if (placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 6 && Math.abs(p.z - z) < (p.d + d) / 2 + 6)) continue;
      placed.push({ x, z, w, d });
      add('block', boxGeo(x - w / 2, -0.1, z - d / 2, x + w / 2, h, z + d / 2));
      add('blockTop', boxGeo(x - w / 2 + 0.25, h, z - d / 2 + 0.25, x + w / 2 - 0.25, h + 0.05, z + d / 2 - 0.25));
    }

    const site = new THREE.Group();
    for (const k in G) {
      const mesh = new THREE.Mesh(G[k].length > 1 ? mergeGeometries(G[k]) : G[k][0], this.ctxMat[k]);
      mesh.receiveShadow = true;
      mesh.castShadow = !['yard', 'road', 'walk', 'line', 'ground'].includes(k);
      site.add(mesh);
    }
    // enerji sınıfı halesi (avlu üstünde)
    for (const c of [...this.world.children]) this.world.remove(c);
    const halo = this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.03;
    halo.scale.setScalar(Math.max(bw, bd) * 1.7);
    halo.renderOrder = -1;
    this.world.add(halo);
    this.worldR = Math.max(px, pz) + 22;
    this.siteL = L;
    return site;
  }

  fitSun() {
    const R = this.worldR;
    this.sun.position.set(-R * 0.55, R * 1.1, R * 0.95);
    this.sun.target.position.set(0, 0, 0);
    Object.assign(this.sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: R * 4 });
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  /* ---------- parametre / sistem ---------- */
  setParams(p) {
    const ch = Object.keys(p).filter((k) => p[k] != null && this.P[k] !== p[k]);
    for (const k of ch) this.P[k] = p[k];
    if (!ch.length || !this.kit) return;
    if (ch.every((k) => k === 'glaz')) { this.applySystems(null); return; }   // cam rengi yeniden kurmadan değişir
    this.build();
    this.frameCamera(true);
  }

  setSystems(o, pulse = []) {
    let ch = false;
    for (const k of SYSKEYS) if (k in o && this.on[k] !== !!o[k]) { this.on[k] = !!o[k]; ch = true; }
    if (!this.kit) return;
    if (ch) this.applySystems(pulse);
  }

  applySystems(pulse) {
    for (const k of SYSKEYS) for (const m of this.sysMeshes[k]) m.visible = this.on[k];
    // cam seviyesi: mevcut cam tipi; pencere yenilemesi üçlü cama çıkarır
    const lvl = this.on.window ? 2 : GLAZ[this.P.glaz] ?? 0;
    for (const m of this.sysMeshes.win) {
      const k = m.userData.mat;
      m.material = k === 'A_GlassOld' ? this.glass[lvl] : k === 'A_FrameOld' && lvl > 0 ? this.frameNew : this.mk(k);
    }
    for (const k of pulse || []) if (this.on[k]) this.pulse(k);
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  pulse(k) {
    const mats = [...(this.sysMats[k] || [])];
    if (k === 'window') mats.push(this.glass[2], this.frameNew);
    if (reduceMotion || !mats.length) return;
    const brand = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#0C9384');
    this.anim = this.anim.filter((a) => a.k !== k);
    // eğimli çatıda yalıtım kiremidin altında kalır: kiremit bir süre saydamlaşıp yalıtımı gösterir
    const ghost = k === 'roof' && this.P.roofT === 'pitch' ? ['A_Tile', 'A_Fascia', 'A_Soffit', 'A_Chimney', 'A_Coping'].map(this.mk) : null;
    this.anim.push({ k, mats, t0: performance.now(), brand, fade: k !== 'window', ghost, dur: ghost ? 3200 : 1400 });
  }

  setHalo(color) {
    if (!this.haloMat) return;
    this.haloMat.visible = !!color;
    if (color) this.haloMat.color.set(color);
    this.dirty = true;
  }

  /* ---------- kamera ---------- */
  frameCamera(smooth) {
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const asp = Math.max(0.6, this.camera.aspect || 1.5);
    const r = this.radius * 1.3;
    const dV = r / Math.sin(fov / 2), dH = r / Math.sin(Math.atan(Math.tan(fov / 2) * asp));
    const dist = Math.max(dV, dH);
    const target = new THREE.Vector3(0, this.H * 0.32, 0);
    this.controls.minDistance = dist * 0.35;
    this.controls.maxDistance = dist * 2.2;
    if (!smooth || !this.placed) {
      const sph = new THREE.Spherical(dist, 1.08, 0.62);
      this.camera.position.setFromSpherical(sph).add(target);
      this.controls.target.copy(target);
      this.placed = true;
      this.controls.update();
    } else {
      const cur = this.camera.position.distanceTo(this.controls.target);
      this.goal = { target, dist: this.userMoved ? THREE.MathUtils.clamp(cur, dist * 0.6, dist * 1.6) : dist, t0: performance.now() };
    }
    this.dirty = true;
  }

  home() {
    this.userMoved = false;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const r = this.radius * 1.3;
    const asp = Math.max(0.6, this.camera.aspect || 1.5);
    const dist = Math.max(r / Math.sin(fov / 2), r / Math.sin(Math.atan(Math.tan(fov / 2) * asp)));
    const target = new THREE.Vector3(0, this.H * 0.32, 0);
    this.goal = { target, pos: new THREE.Vector3().setFromSpherical(new THREE.Spherical(dist, 1.08, 0.62)).add(target), t0: performance.now() };
  }

  setAutoRotate(v) { this.controls.autoRotate = v && !reduceMotion; this.dirty = true; }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (w < 2 || h < 2) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.kit && !this.userMoved) this.frameCamera(false);
    this.dirty = true;
  }

  /** Rapor görseli: başlangıç açısından, sayfanın gökyüzü rengi üzerine (tuval saydam). */
  snapshot(bg = '#EEF1EA') {
    const cam = this.camera.clone();
    const fov = THREE.MathUtils.degToRad(cam.fov);
    const W = 1200, H = 720;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    const r = this.radius * 1.15;
    const dist = Math.max(r / Math.sin(fov / 2), r / Math.sin(Math.atan(Math.tan(fov / 2) * cam.aspect)));
    const target = new THREE.Vector3(0, this.H * 0.32, 0);
    cam.position.setFromSpherical(new THREE.Spherical(dist, 1.08, 0.62)).add(target);
    cam.lookAt(target);
    cam.near = dist * 0.05; cam.far = dist * 6 + 400;
    cam.updateProjectionMatrix();
    const fog = [this.scene.fog.near, this.scene.fog.far];
    this.scene.fog.near = dist + this.radius * 0.8;
    this.scene.fog.far = dist + (this.siteL || 150) * 0.85;
    const size = this.renderer.getSize(new THREE.Vector2());
    const pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.render(this.scene, cam);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.drawImage(this.renderer.domElement, 0, 0);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(size.x, size.y, false);
    [this.scene.fog.near, this.scene.fog.far] = fog;
    this.dirty = true;
    return c.toDataURL('image/jpeg', 0.88);
  }

  azimuth() { return this.controls.getAzimuthalAngle(); }

  loop(now) {
    requestAnimationFrame(this.loop);
    if (!this.el.isConnected || this.el.clientWidth < 2) return;
    if (this.goal) {
      // hedefe yumuşak geçiş; otomatik dönüş sürer, geçiş en geç 1,5 sn'de biter (önceden dönüşle çekişip takılıyordu)
      const g = this.goal, k = reduceMotion ? 1 : 0.12;
      const off = this.camera.position.clone().sub(this.controls.target);
      this.controls.target.lerp(g.target, k);
      if (g.pos) {
        this.camera.position.lerp(g.pos, k);
      } else {
        off.setLength(THREE.MathUtils.lerp(off.length(), g.dist, k));
        this.camera.position.copy(this.controls.target).add(off);
      }
      const done = g.pos ? this.camera.position.distanceTo(g.pos) < 0.3 : Math.abs(off.length() - g.dist) < 0.2 && this.controls.target.distanceTo(g.target) < 0.05;
      if (done || now - g.t0 > 1500) this.goal = null;
      this.dirty = true;
    }
    if (this.controls.update() || this.controls.autoRotate) this.dirty = true;
    if (this.anim.length) {
      this.anim = this.anim.filter((a) => {
        const t = (now - a.t0) / a.dur;
        const glow = t < 1 ? Math.sin(Math.min(1, t) * Math.PI) * 0.55 : 0;
        const op = a.fade ? Math.min(1, t * 2.2) : 1;
        for (const m of a.mats) {
          m.emissive.copy(a.brand).multiplyScalar(glow);
          m.transparent = op < 1;
          m.opacity = op;
        }
        if (a.ghost) {
          const g = 1 - 0.82 * Math.min(1, Math.sin(Math.min(1, t) * Math.PI) * 1.6);
          for (const m of a.ghost) { m.transparent = g < 0.999; m.opacity = g; m.depthWrite = g > 0.95; }
        }
        if (t >= 1) {
          for (const m of a.mats) { m.emissive.set(0x000000); m.transparent = false; m.opacity = 1; }
          for (const m of a.ghost || []) { m.transparent = false; m.opacity = 1; m.depthWrite = true; }
        }
        return t < 1;
      });
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    // derinlik aralığı mesafeye bağlı: uzaktan bakarken ince katmanlar titremesin
    const d = this.camera.position.distanceTo(this.controls.target);
    this.camera.near = Math.max(0.5, d * 0.05);
    this.camera.far = d * 6 + 400;
    this.camera.updateProjectionMatrix();
    this.scene.fog.near = d + this.radius * 0.8;
    this.scene.fog.far = d + (this.siteL || 150) * 0.85;
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
  }
}
