// Arketip ve senaryo hesabı. Şablondaki vekil model (gerçek simülasyonlardan türetilmiş indeksler) aynen korunur:
// baz bina enerjisi 100 puan (gaz 85, elektrik 15), sistemler bunu değiştirir.

import { getLang } from './i18n.js';

export const PLAN3D = { flat: 'I', l: 'L', u: 'U' };
export const WWR3D = { low: 'az', mid: 'orta', high: 'cok' };
export const CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const ECOL = { A: '#1E8E46', B: '#55A845', C: '#8DBE3F', D: '#E9C130', E: '#E39A2D', F: '#E0682A', G: '#D3322A' };
export const ecls = (i) => (i <= 40 ? 'A' : i <= 55 ? 'B' : i <= 70 ? 'C' : i <= 85 ? 'D' : i <= 100 ? 'E' : i <= 120 ? 'F' : 'G');
export const fmt = (n, d = 0) => (+n).toLocaleString(getLang() === 'en' ? 'en-GB' : 'tr-TR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

export const defaultInputs = () => ({
  schoolType: 'lise', plan: 'flat', floors: 3, era: '80_00', orient: 'ns', wall: 'brick_hollow', glaz: 'single', wwr: 'mid',
  insWall: false, insWallThk: 5, insRoof: false, insRoofThk: 8, insGround: false, insGroundThk: 4,
  heating: 'gas', cooling: 'none', students: 600, usage: 'full',
  rooms: 24, area: null, hgt: 3.2, roofT: 'flat', roofA: null, spaces: [], hours: 8, summer: 'none',
  gas: null, elec: null, light: 'fl', boiler: 'old',
});

// önlemler (metinleri i18n.js'de: sys.<anahtar>)
export const SYS = [
  { c: 'roof', icon: 'roof', grp: 'Kabuk' }, { c: 'wall', icon: 'wall', grp: 'Kabuk' },
  { c: 'window', icon: 'window', grp: 'Kabuk' }, { c: 'ground', icon: 'ground', grp: 'Kabuk' },
  { c: 'shading', icon: 'shade', grp: 'Pasif' }, { c: 'heatpump', icon: 'hp', grp: 'Sistem' },
  { c: 'pv', icon: 'pv', grp: 'Üretim' },
];

export const SYSDEF = {
  roof: { e: -14, m: -9, c: 9, cap: 95 },
  wall: { e: -9, m: -6, c: 7, cap: 120 },
  window: { e: -5, m: -2, c: 2, cap: 80 },
  ground: { e: -4, m: -3, c: -18, cap: 70 },
  shading: { e: -3, m: -2, c: 8, cap: 45 },
  heatpump: { e: 0, m: 0, c: 0, cap: 200 },
  pv: { e: -34, m: -22, c: 0, cap: 160 },
};

/** girdilerden türetilen MEVCUT sistemler (renovasyon değil) */
export function existingSystems(inp) {
  return { roof: inp.insRoof, wall: inp.insWall, ground: inp.insGround, window: inp.glaz !== 'single',
    shading: false, heatpump: inp.heating === 'hp' || inp.cooling === 'vrf', pv: false };
}

/** Çatı alanı türetimi: kapalı alan / kat = oturma alanı; bunun %45'i (eğimli çatıda %32) panel alanı. */
export function derived(inp) {
  const area = inp.area || Math.round((inp.students * 8.5) / 50) * 50;
  const foot = Math.round(area / Math.max(1, inp.floors));
  const frac = inp.roofT === 'pitch' ? 0.32 : 0.45;
  return { area, areaGuess: !inp.area, foot, roof: Math.round((foot * frac) / 5) * 5, frac };
}

export function completeness(inp) {
  let filled = 0;
  const total = 6;
  if (inp.area) filled++;
  if (inp.roofA) filled++;
  if (inp.gas) filled++;
  if (inp.elec) filled++;
  if (inp.spaces.length) filled++;
  if (inp.rooms !== 24) filled++;
  return { filled, total, pc: Math.round((100 * filled) / total) };
}

export function computeArch(inp) {
  let cp = 80;
  if (!inp.insRoof) cp -= 6;
  if (!inp.insWall) cp -= 4;
  if (inp.insGround) cp -= 3;                         // zemin yalıtımı yazın olumsuz
  cp -= inp.glaz === 'single' ? 4 : inp.glaz === 'double' ? 1 : 0;
  cp -= inp.wwr === 'high' ? 5 : inp.wwr === 'low' ? -3 : 0;
  if (inp.orient === 'ew') cp -= 4;
  cp -= inp.era === 'pre80' ? 5 : inp.era === '80_00' ? 3 : 0;
  cp += inp.wall === 'aac' ? 3 : inp.wall === 'rc' ? 2 : inp.wall === 'brick_hollow' ? 1 : 0;
  if (inp.plan === 'l') cp -= 3; else if (inp.plan === 'u') cp -= 6;
  cp -= Math.max(0, inp.floors - 2);
  if (inp.cooling === 'split') cp += 10; else if (inp.cooling === 'vrf') cp += 14;
  cp += Math.round((inp.hgt - 3.2) * 5);              // yüksek tavan: sıcak hava yukarıda toplanır, yaz konforu biraz iyileşir
  cp = Math.max(30, Math.min(94, Math.round(cp)));
  const cf = Math.max(18, cp - 22);
  const insCount = (inp.insRoof ? 1 : 0) + (inp.insWall ? 1 : 0) + (inp.insGround ? 1 : 0);
  const gain = Math.max(0.5, 1.35 - insCount * 0.27);
  const baseEnergy = Math.round(100 / Math.max(0.55, gain * 0.78));
  // vf: ısıtılan hacim katsayısı; kat yüksekliği ısıtma gazını hacimle orantılı değiştirir (3,2 m = 1)
  return { cp, cf, gain, students: inp.students, vf: inp.hgt / 3.2, existing: existingSystems(inp), baseEnergy };
}

export function model(state, arch) {
  const a = arch || { cp: 74, cf: 52, gain: 1.0, students: 600 };
  const fut = state.climate === 'future';
  const g = a.gain, m2 = (state.tier === 'passive' ? 1.35 : 1.0) * g;
  const ex = arch?.existing || {};
  let gas = 85, elecOther = 13, elecCool = 2, c = fut ? a.cf : a.cp, capex = 0;
  const contrib = [];

  // kabuk ve pasif önlemler ısıtma gazını azaltır
  for (const k of ['roof', 'wall', 'window', 'ground', 'shading']) {
    if (!state[k] || ex[k]) continue;
    const d = SYSDEF[k], dg = d.e * g;
    gas += dg; capex += d.cap; c += d.c * m2;
    contrib.push({ k, e: dg });
  }
  if (fut) { gas *= 0.72; elecCool *= 3; }            // 2050: ısıtma düşer, soğutma artar

  // ısı pompası: gaz elektriğe döner
  if (state.heatpump && !ex.heatpump) {
    const before = gas, conv = gas / 3.4;
    contrib.push({ k: 'heatpump', e: conv - before });
    gas = 0; elecOther += conv; capex += SYSDEF.heatpump.cap;
  }
  // PV elektriği azaltır
  if (state.pv && !ex.pv) {
    const el0 = elecOther + elecCool, cut = Math.min(el0 * 0.62, 34);
    contrib.push({ k: 'pv', e: -cut });
    elecOther = Math.max(0, elecOther - cut); capex += SYSDEF.pv.cap;
  }

  const energy = Math.max(8, Math.round(gas + elecOther + elecCool));
  // emisyon: gaz 0.20, şebeke bugün 0.42, 2050'de temizlenir
  const gf = 0.20, ef = fut ? 0.16 : 0.42;
  const emisRaw = gas * gf + (elecOther + elecCool) * ef;
  const emisBase = 85 * gf + 15 * ef;
  const emis = Math.max(6, Math.round((100 * emisRaw) / emisBase));

  c = Math.max(6, Math.min(100, Math.round(c)));
  const base = fut ? a.cf : a.cp;
  const hh = Math.max(0, Math.round((fut ? 95 : 39) * (1 - ((c - base) / 100) * 1.4)));
  const fin = finance(a.students, gas, elecOther + elecCool, capex, a.vf ?? 1);
  return { ...fin, payback: fin.pb, h: hh, c, energy, emis, capex, comfort0: base, students: a.students,
    gas: Math.max(0, gas), elec: Math.max(0, elecOther + elecCool), contrib,
    any: SYS.some((s) => state[s.c]) };
}

/** Bina_04 ölçümlerinden ölçeklenen yıllık kWh ve gerçek okul faturalarındaki fiyatlarla finans.
 *  Gösterge kartı ve rapor aynı geri ödeme süresini gösterir. */
export const PRICE = { gas: 1.70, elec: 4.61 };          // TL/kWh, vergiler dahil
export function finance(students, gasIdx, elecIdx, capexK, vf = 1) {
  const sc = (students || 600) / 600, TOT = 223800 * sc;
  const kwh = (idx) => (idx / 100) * TOT;
  const bGas = kwh(85) * vf, bEl = kwh(15), sGas = kwh(gasIdx) * vf, sEl = kwh(elecIdx);
  const baseTL = bGas * PRICE.gas + bEl * PRICE.elec, scenTL = sGas * PRICE.gas + sEl * PRICE.elec;
  const saveTL = baseTL - scenTL, capexTL = capexK * 1000;
  const pb = capexTL > 0 && saveTL > 0 ? Math.max(1, Math.round(capexTL / saveTL)) : null;
  return { sc, bGas, bEl, sGas, sEl, baseTL, scenTL, saveTL, capexTL, pb, net25: Math.round(saveTL * 25 - capexTL) };
}
