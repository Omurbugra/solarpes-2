import { ArchScene } from './scene.js';
import {
  defaultInputs, computeArch, model, derived, completeness, existingSystems,
  SYS, PLAN3D, WWR3D, CLASSES, ECOL, ecls, fmt,
} from './model.js';
import { openReport } from './report.js';
import { t, setLang, onLang, applyStatic, getLang } from './i18n.js';

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const inp = defaultInputs();
const state = { climate: 'present', tier: 'ts825', roof: false, wall: false, window: false, ground: false, shading: false, heatpump: false, pv: false };
let arch = null;
let step = 1;

/* ---------- tema ve dil ---------- */
try { const th = localStorage.getItem('sp-theme'); if (th) root.setAttribute('data-theme', th); } catch { /* yok */ }
$('themeBtn').addEventListener('click', () => {
  const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', nx);
  try { localStorage.setItem('sp-theme', nx); } catch { /* yok */ }
});
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
applyStatic();
onLang(() => {
  $('ldText').textContent = t('loading');
  changed();
  if (arch) { renderArch(); renderSystems(); render(); }
});

/* ---------- 3B ---------- */
const view = new ArchScene({ autoRotate: true });
view.attach($('mount1'));
view.onFrame = () => {
  const a = view.azimuth();
  for (const c of document.querySelectorAll('.compass i')) c.style.transform = `rotate(${a}rad)`;
};
$('ldText').textContent = t('loading');
view.init((p) => { $('ldBar').style.width = p * 100 + '%'; })
  .then(() => { $('loader').classList.add('done'); sync3d(); })
  .catch((e) => { console.error(e); $('ldText').textContent = t('loadFail'); });

function params3d() {
  return { plan: PLAN3D[inp.plan], floors: inp.floors, wwr: WWR3D[inp.wwr], orient: inp.orient, roofT: inp.roofT, fh: inp.hgt, glaz: inp.glaz };
}
function sync3d(pulse = []) {
  view.setParams(params3d());
  const ex = step === 1 ? existingSystems(inp) : arch.existing;
  const on = {};
  for (const s of SYS) on[s.c] = !!ex[s.c] || (step > 1 && state[s.c]);
  on.window = step > 1 && state.window && !ex.window;      // mevcut cam tipinin rengini sahne kendisi verir
  view.setSystems(on, pulse);
}
for (const b of document.querySelectorAll('[data-rot]')) {
  b.addEventListener('click', () => {
    const v = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', v);
    view.setAutoRotate(v);
  });
}
for (const b of document.querySelectorAll('[data-home]')) b.addEventListener('click', () => view.home());

/* ---------- adım 1: form ---------- */
function pressed(group, v) {
  for (const x of group.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x.dataset.v === String(v)));
}
for (const g of document.querySelectorAll('[data-seg]')) {
  g.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    inp[g.dataset.seg] = 'num' in g.dataset ? Number(b.dataset.v) : b.dataset.v;
    pressed(g, b.dataset.v);
    changed();
  });
}
for (const el of document.querySelectorAll('[data-k]')) {
  const k = el.dataset.k;
  el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
    if (el.type === 'checkbox') {
      inp[k] = el.checked;
      el.closest('.f').classList.toggle('on', el.checked);
    } else if (el.type === 'range') {
      inp[k] = Number(el.value);
      el.nextElementSibling.textContent = el.value + (/Thk$/.test(k) ? ' cm' : '');
    } else if (el.type === 'number') {
      inp[k] = el.value === '' ? null : Number(el.value);
    } else inp[k] = el.value;
    changed();
  });
}
for (const g of document.querySelectorAll('[data-multi]')) {
  g.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    inp[g.dataset.multi] = [...g.querySelectorAll('[aria-pressed="true"]')].map((x) => x.dataset.v);
    changed();
  });
}

const hgtTxt = () => fmt(inp.hgt, 1);
function existingNames(ex) {
  return Object.keys(ex).filter((k) => ex[k]).map((k) => t(`sys.${k}`)[0].toLocaleLowerCase(getLang()));
}
function titleBlock() {
  const ex = existingNames(existingSystems(inp));
  $('titleBlock').innerHTML = `
    <div class="tb-name">${t(`school.${inp.schoolType}`)}, ${t(`plan.${inp.plan}`)}</div>
    <dl>
      <dt>${t('tbMass')}</dt><dd>${t('floors', inp.floors)}, ${t('floorH', hgtTxt())}, ${t(inp.roofT === 'pitch' ? 'roofPitch' : 'roofFlat')}</dd>
      <dt>${t('tbFacade')}</dt><dd>${t(`wwrTxt.${inp.wwr}`)}, ${t(`glaz.${inp.glaz}`)}, ${t(inp.orient === 'ew' ? 'orientEW' : 'orientNS')}</dd>
      <dt>${t('tbExisting')}</dt><dd>${ex.length ? ex.join(', ') : t('noExisting')}</dd>
    </dl>`;
}

function changed() {
  const d = derived(inp);
  const ah = $('areaHint');
  ah.textContent = inp.area ? t('areaGiven') : t('areaGuess', fmt(d.area));
  ah.classList.toggle('guess', !inp.area);
  const rh = $('roofHint');
  rh.textContent = inp.roofA ? t('areaGiven') : t('roofGuess', fmt(d.area), inp.floors, fmt(d.foot), Math.round(d.frac * 100), fmt(d.roof));
  rh.classList.toggle('guess', !inp.roofA);
  document.querySelector('[data-k="roofA"]').placeholder = d.roof;
  const c = completeness(inp);
  $('cmpText').textContent = c.filled === 0 ? t('cmp0') : t('cmp', c.pc, c.filled, c.total);
  titleBlock();
  if (step === 1) sync3d();
}
changed();

/* ---------- adımlar ---------- */
const stepBtns = [...$('steps').children];
function markSteps(cur) {
  for (const b of stepBtns) {
    const s = Number(b.dataset.step);
    b.toggleAttribute('aria-current', s === cur);
    b.classList.toggle('done', s < cur);
    b.disabled = s > 1 && !arch;
  }
}
function goStep(n) {
  step = n;
  $('step1').hidden = n !== 1;
  $('step2').hidden = n !== 2;
  markSteps(n);
  view.attach($(n === 1 ? 'mount1' : 'mount2'));
  view.setAutoRotate(document.querySelector(`#view${n} [data-rot]`).getAttribute('aria-pressed') === 'true');
  if (n === 1) view.setHalo(null);
  view.home();
  window.scrollTo({ top: 0 });
}
function archLabel() {
  return `${t(`school.${inp.schoolType}`)}, ${t(`plan.${inp.plan}`)}, ${t('floors', inp.floors)}`;
}
function archLine() {
  const ins = [];
  for (const k of ['wall', 'roof', 'ground']) {
    const key = 'ins' + k[0].toUpperCase() + k.slice(1);
    if (inp[key]) ins.push(`${t(`insPart.${k}`)} ${inp[key + 'Thk']} cm`);
  }
  return [t(`era.${inp.era}`), t(`wall.${inp.wall}`), t(`glaz.${inp.glaz}`), ins.length ? t('ins', ins.join(', ')) : t('noIns'),
    t(`heat.${inp.heating}`), t(`cool.${inp.cooling}`), t('students', inp.students), t(inp.orient === 'ew' ? 'orientEW' : 'orientNS'),
    t('floorH', hgtTxt()), t(inp.roofT === 'pitch' ? 'roofPitch' : 'roofFlat')].join(', ');
}
function renderArch() {
  $('archBar').innerHTML = `<div><h1>${archLabel()}</h1><p>${archLine()}.</p></div>
    <button class="btn quiet" id="redoArch" type="button">${t('redo')}</button>`;
  $('redoArch').addEventListener('click', () => { goStep(1); changed(); });
}
$('setArch').addEventListener('click', () => {
  arch = computeArch(inp);
  for (const s of SYS) state[s.c] = false;
  renderArch();
  goStep(2);
  renderSystems();
  render();
});
$('steps').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const s = Number(b.dataset.step);
  if (s === 1 && step !== 1) { goStep(1); changed(); }
  else if (s === 2 && step !== 2) { goStep(2); render(); }
  else if (s === 3) report();
});

/* ---------- adım 2: önlemler ---------- */
const sysList = $('sysList');
function renderSystems() {
  sysList.innerHTML = '';
  let lastGrp = '';
  for (const sy of SYS) {
    if (sy.grp !== lastGrp) {
      const l = document.createElement('div');
      l.className = 'grp';
      l.textContent = t(`grp.${sy.grp}`);
      sysList.appendChild(l);
      lastGrp = sy.grp;
    }
    const [name, sub] = t(`sys.${sy.c}`);
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'sys';
    d.draggable = true;
    d.dataset.c = sy.c;
    d.innerHTML = `<span class="box"><svg class="ico"><use href="#i-check"/></svg></span><span><b>${name}</b><small>${sub}</small></span>`;
    d.addEventListener('click', () => toggle(sy.c));
    d.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', sy.c); e.dataTransfer.effectAllowed = 'copy'; });
    sysList.appendChild(d);
  }
}
const stage = $('view2');
stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('drop'); });
stage.addEventListener('dragleave', (e) => { if (!stage.contains(e.relatedTarget)) stage.classList.remove('drop'); });
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  stage.classList.remove('drop');
  const c = e.dataTransfer.getData('text/plain');
  if (c && !state[c]) toggle(c);
});
$('appliedTags').addEventListener('click', (e) => { const b = e.target.closest('button[data-x]'); if (b) toggle(b.dataset.x); });

function toggle(c) {
  if (arch?.existing[c]) return;
  state[c] = !state[c];
  render(state[c] ? [c] : []);
}
for (const [id, key] of [['segClimate', 'climate'], ['segTier', 'tier']]) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state[key] = b.dataset.v;
    pressed($(id), b.dataset.v);
    render();
  });
}

/* EKB merdiveni: mevcut bina solda (mürekkep), senaryo sağda (kalem mavisi) */
function ekb(base, scen) {
  const cb = ecls(base), cs = ecls(scen);
  return `<div class="cap"><span>${t('baseLine')}</span><span>${t('scenario')}</span></div>` + CLASSES.map((c, i) => `
    <div class="row">
      <div class="m l">${c === cb ? `<span>${base}</span>` : ''}</div>
      <div class="bar" style="background:${ECOL[c]};width:${42 + i * 9.6}%">${c}</div>
      <div class="m r">${c === cs ? `<span>${scen}</span>` : ''}</div>
    </div>`).join('');
}
function ind(label, val, unit, sub, fill, tgt, delta) {
  return `<div><dt>${label}</dt><dd>${val}${unit ? `<small>${unit}</small>` : ''}${delta}</dd>
    <span class="meter"><i style="width:${Math.max(0, Math.min(100, fill))}%"></i>${tgt != null ? `<b style="left:${tgt}%"></b>` : ''}</span>
    <span class="sub">${sub}</span></div>`;
}
function delta(v, base, lowerIsBetter) {
  const d = Math.round(v - base);
  if (!d) return '';
  const good = lowerIsBetter ? d < 0 : d > 0;
  return `<span class="d ${good ? 'up' : 'dn'}">${d > 0 ? '+' : '−'}${Math.abs(d)}</span>`;
}

function render(pulse = []) {
  const ex = arch?.existing || {};
  for (const sy of SYS) {
    const card = sysList.querySelector(`.sys[data-c="${sy.c}"]`);
    const isEx = !!ex[sy.c];
    card.classList.toggle('existing', isEx);
    card.classList.toggle('applied', !isEx && state[sy.c]);
    card.setAttribute('aria-pressed', String(isEx || state[sy.c]));
    card.disabled = isEx;
    card.querySelector('small').textContent = isEx ? t('existing') : t(`sys.${sy.c}`)[1];
  }
  const m = model(state, arch);
  sync3d(pulse);
  view.setHalo(ECOL[ecls(m.energy)]);

  $('ekb').innerHTML = ekb(100, m.energy);
  const fut = state.climate === 'future';
  $('kpiBox').innerHTML =
    ind(t('energy'), m.energy, t('pts'), `<span>${t('energyDet')}</span><span>${t('target', 60)}</span>`, m.energy, 60, delta(m.energy, 100, true))
    + ind(t('emis'), m.emis, t('pts'), `<span>${t('emisDet')}</span><span>${t('target', 50)}</span>`, m.emis, 50, delta(m.emis, 100, true))
    + ind(t('payback'), m.payback == null ? '—' : m.payback, m.payback == null ? '' : t('yr'),
      `<span>${m.capex > 0 ? t('capex', fmt(m.capex / 1000, 2)) : t('noCapex')}</span><span>${m.payback == null ? '' : t('net25', fmt(m.net25 / 1e6, 1))}</span>`,
      m.payback == null ? 0 : (m.payback / 25) * 100, null, '')
    + ind(t('comfort'), m.c, '%', `<span>${t(fut ? 'comfortDet50' : 'comfortDet')}</span><span>${t('target', t('pct', 90))}</span>`, m.c, 90, delta(m.c, m.comfort0, false));

  const on = SYS.filter((s) => state[s.c]);
  $('appliedTags').innerHTML = on.length
    ? on.map((s) => { const n = t(`sys.${s.c}`)[0]; return `<span class="tag">${n}<button type="button" aria-label="${t('remove', n)}" data-x="${s.c}"><svg class="ico"><use href="#i-close"/></svg></button></span>`; }).join('')
    : `<p>${t('noneAdded')}</p>`;
  $('warnText').textContent = t('warnGround');
  $('warnbox').classList.toggle('show', state.ground && !(state.roof || ex.roof || state.shading));

  const stack = (gas, elec, lab) => {
    const tot = Math.max(1, gas + elec);
    return `<div class="crow"><div class="ct"><span>${lab}</span><b>${Math.round(gas + elec)} ${t('pts')}</b></div>
      <div class="cstack" style="width:${Math.min(100, tot)}%"><i class="cg" style="width:${(100 * gas) / tot}%">${gas / tot > 0.15 ? Math.round(gas) : ''}</i><i class="ce" style="width:${(100 * elec) / tot}%">${elec / tot > 0.15 ? Math.round(elec) : ''}</i></div></div>`;
  };
  $('carrierBox').innerHTML = stack(85, 15, t('baseLine')) + stack(m.gas, m.elec, t('scenario'))
    + `<div class="ckey"><span><i class="cg"></i>${t('gas')}</span><span><i class="ce"></i>${t('elec')}</span></div>`;

  const wf = $('wfallBox');
  if (!m.contrib.length) {
    wf.innerHTML = `<p class="empty">${t('contribEmpty')}</p>`;
  } else {
    const mx = Math.max(...m.contrib.map((x) => Math.abs(x.e)));
    wf.innerHTML = m.contrib.map((x) => {
      const w = Math.round((100 * Math.abs(x.e)) / (mx || 1)), dn = x.e < 0;
      return `<div class="wrow ${dn ? 'dn' : 'up'}"><span class="wn">${t(`contrib.${x.k}`)}</span>
        <span class="wb"><i style="${dn ? 'right:50%' : 'left:50%'};width:${w / 2}%"></i></span>
        <span class="wv">${x.e > 0 ? '+' : '−'}${Math.abs(x.e).toFixed(0)}</span></div>`;
    }).join('') + `<div class="wrow total"><span class="wn">${t('totalEnergy')}</span><span class="wb"></span><span class="wv">${m.energy}</span></div>`;
  }
}

/* ---------- rapor ---------- */
function report() {
  const m = model(state, arch);
  markSteps(3);
  openReport({ m, arch, state, label: archLabel(), img: view.snapshot(getComputedStyle(root).getPropertyValue('--sky1').trim() || '#E7EBE3'),
    onClose: () => markSteps(step) });
}
$('analyzeBtn').addEventListener('click', report);
markSteps(1);
