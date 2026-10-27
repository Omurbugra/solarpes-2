// Analiz raporu: şablondaki hesaplar (Bina_04 ölçümlerinden ölçeklenen kWh, fatura fiyatları, 25 yıllık nakit)
// ve SVG grafikleri, üstte senaryonun 3B görüntüsüyle.
import { SYS, ECOL, ecls, fmt, PRICE } from './model.js';
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const GAS_C = '#C1873B';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svgCarrier(bG, bE, sG, sE) {
  const W = 560, rowH = 34, pad = 96, barW = W - pad - 100, mx = Math.max(bG + bE, sG + sE) || 1;
  const row = (y, lab, g, e) => {
    const wg = (barW * g) / mx, we = (barW * e) / mx;
    return `<text x="0" y="${y + 15}" class="t-soft" font-size="11">${lab}</text>
      <rect x="${pad}" y="${y}" width="${wg}" height="20" rx="2" fill="${GAS_C}"/>
      <rect x="${pad + wg}" y="${y}" width="${we}" height="20" rx="2" class="f-energy"/>
      <text x="${W - 6}" y="${y + 15}" text-anchor="end" font-size="10.5" class="t-ink mono">${fmt(g + e)} kWh</text>`;
  };
  return `<svg class="rchart" viewBox="0 0 ${W} ${rowH * 2 + 26}" role="img" aria-label="Enerji taşıyıcıları">
    ${row(0, t('cBase'), bG, bE)}${row(rowH, t('cScen'), sG, sE)}
    <g font-size="10" class="t-faint mono">
      <rect x="${pad}" y="${rowH * 2 + 10}" width="9" height="9" fill="${GAS_C}"/><text x="${pad + 13}" y="${rowH * 2 + 18}">${t('gas')}</text>
      <rect x="${pad + 80}" y="${rowH * 2 + 10}" width="9" height="9" class="f-energy"/><text x="${pad + 93}" y="${rowH * 2 + 18}">${t('elec')}</text></g></svg>`;
}

function svgContrib(contrib, kwhFn) {
  if (!contrib.length) return '';
  const W = 560, rh = 24, pad = 132, half = (W - pad - 96) / 2, cx = pad + half, H = contrib.length * rh + 18;
  const mx = Math.max(...contrib.map((x) => Math.abs(x.e))) || 1;
  const body = contrib.map((x, i) => {
    const y = i * rh, w = (half * Math.abs(x.e)) / mx, dn = x.e < 0, cls = dn ? 'f-emis' : 'f-iod';
    return `<text x="0" y="${y + 15}" font-size="11" class="t-soft">${esc(t(`contrib.${x.k}`))}</text>
      <rect x="${dn ? cx - w : cx}" y="${y + 4}" width="${w}" height="14" rx="2" class="${cls}"/>
      <text x="${W - 6}" y="${y + 15}" text-anchor="end" font-size="10.5" class="mono ${dn ? 't-emis' : 't-iod'}">${x.e > 0 ? '+' : ''}${fmt(kwhFn(x.e))} kWh</text>`;
  }).join('');
  return `<svg class="rchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sistem katkıları">
    <line x1="${cx}" y1="0" x2="${cx}" y2="${contrib.length * rh}" class="s-ink" stroke-opacity=".45"/>${body}
    <text x="${cx - 5}" y="${H - 3}" text-anchor="end" font-size="9.5" class="t-faint mono">${t('cReduces')}</text>
    <text x="${cx + 5}" y="${H - 3}" font-size="9.5" class="t-faint mono">${t('cIncreases')}</text></svg>`;
}

function svgIndicators(m) {
  const W = 560, rh = 30, pad = 118, barW = W - pad - 58, SC = 140;
  const items = [[t('energy'), m.energy, 'f-energy', 100], [t('emis'), m.emis, 'f-emis', 100], [t('comfort'), m.c, 'f-iod', m.comfort0]];
  const H = items.length * rh + 14;
  const body = items.map((it, i) => {
    const y = i * rh, w = (barW * Math.min(it[1], SC)) / SC, bx = pad + (barW * it[3]) / SC;
    return `<text x="0" y="${y + 16}" font-size="11" class="t-soft">${it[0]}</text>
      <rect x="${pad}" y="${y + 5}" width="${barW}" height="15" rx="2" class="f-sunk"/>
      <rect x="${pad}" y="${y + 5}" width="${w}" height="15" rx="2" class="${it[2]}"/>
      <line x1="${bx}" y1="${y + 1}" x2="${bx}" y2="${y + 24}" class="s-ink" stroke-width="1.6" stroke-opacity=".6"/>
      <text x="${W - 6}" y="${y + 16}" text-anchor="end" font-size="11" font-weight="700" class="t-ink mono">${it[1]}</text>`;
  }).join('');
  return `<svg class="rchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="İndikatörler">${body}
    <text x="${pad}" y="${H - 2}" font-size="9.5" class="t-faint mono">${t('cBaseLine')}</text></svg>`;
}

function svgCash(capex, saveTL, pb) {
  const W = 560, H = 155, L = 70, R = 14, Tp = 12, B = 28, N = 25;
  const vals = [];
  let v = -capex;
  for (let y = 0; y <= N; y++) { vals.push(v); v += saveTL; }
  let vmin = Math.min(...vals), vmax = Math.max(...vals);
  if (vmax - vmin < 1) vmax = vmin + 1;
  const pw = W - L - R, ph = H - Tp - B;
  const X = (i) => L + (pw * i) / N, Y = (val) => Tp + (ph * (vmax - val)) / (vmax - vmin);
  const pts = vals.map((val, i) => X(i) + ',' + Y(val)).join(' ');
  const y0 = Y(0);
  const mark = pb != null && pb <= N
    ? `<line x1="${X(pb)}" y1="${Tp}" x2="${X(pb)}" y2="${Tp + ph}" class="s-cost" stroke-width="1.6" stroke-dasharray="3 3"/>
       <text x="${X(pb) + 5}" y="${Tp + 13}" font-size="10" class="t-cost mono">${t('cBreak', pb)}</text>` : '';
  return `<svg class="rchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="25 yıllık nakit akışı">
    <polygon points="${X(0)},${y0} ${pts} ${X(N)},${y0}" class="f-emis" fill-opacity=".13"/>
    <line x1="${L}" y1="${y0}" x2="${W - R}" y2="${y0}" class="s-ink" stroke-opacity=".45"/>
    <polyline points="${pts}" fill="none" class="s-emis" stroke-width="2"/>${mark}
    <text x="0" y="${Y(vmax) + 4}" font-size="9.5" class="t-faint mono">${fmt(vmax / 1000)}k ₺</text>
    <text x="0" y="${Y(vmin) + 4}" font-size="9.5" class="t-faint mono">${fmt(vmin / 1000)}k ₺</text>
    <text x="${L}" y="${H - 8}" font-size="9.5" class="t-faint mono">${t('cToday')}</text>
    <text x="${W - R}" y="${H - 8}" text-anchor="end" font-size="9.5" class="t-faint mono">${t('cY25')}</text></svg>`;
}

export function openReport({ m, arch, state, label, img, onClose }) {
  const ex = arch?.existing || {};
  const fut = state.climate === 'future';
  const nm = (k) => t(`sys.${k}`)[0];
  const newSys = SYS.filter((sy) => state[sy.c] && !ex[sy.c]);
  const tags = newSys.map((sy) => `<span>${nm(sy.c)}</span>`).join('') || `<span class="ex">${t('rNoReno')}</span>`;
  const exTags = SYS.filter((sy) => ex[sy.c]).map((sy) => `<span class="ex">${t('rExisting', nm(sy.c).toLocaleLowerCase())}</span>`).join('');

  // Bina_04 ölçülen değerleri öğrenci sayısına göre ölçeklenir (model.finance, gösterge listesiyle aynı)
  const { sc, bGas, bEl, sGas, sEl, baseTL, scenTL, saveTL, capexTL: capex, pb, net25 } = m;
  const kwh = (idx) => (idx / 100) * 223800 * sc * (arch?.vf ?? 1);
  const baseTot = bGas + bEl, scenTot = sGas + sEl;
  const co2cut = 100 - m.emis;
  const dt = new Date().toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'tr-TR');
  const yrs = (v) => (v == null ? '—' : `${v} ${t('yr')}`);

  const row = (k, b, s, inv, unit = '') => {
    const d = s - b;
    let cls = (inv ? d < 0 : d > 0) ? 'dn' : 'up';
    if (Math.abs(d) < 0.5) cls = '';
    return `<tr><td>${k}</td><td>${fmt(b)}${unit}</td><td>${fmt(s)}${unit}</td><td class="${cls}">${d > 0 ? '+' : ''}${fmt(d)}${unit}</td></tr>`;
  };
  const contribRows = m.contrib.length
    ? m.contrib.map((x) => `<tr><td>${t(`contrib.${x.k}`)}</td><td colspan="2">${x.e > 0 ? '+' : ''}${fmt(kwh(x.e))} kWh</td>
        <td class="${x.e < 0 ? 'dn' : 'up'}">${x.e > 0 ? '+' : ''}${x.e.toFixed(0)}</td></tr>`).join('')
    : `<tr><td colspan="4" class="faint">${t('rNone')}</td></tr>`;
  const cls = ecls(m.energy);
  const tl = (v) => `${fmt(v)} ₺`;

  $('report').innerHTML = `
    <div class="r-head">
      <div><b>SolarPES</b><span>${t('rTitle')}, ${dt}</span></div>
      <div class="r-act">
        <button class="btn quiet" id="repPrint" type="button"><svg class="ico"><use href="#i-print"/></svg>${t('rPrint')}</button>
        <button class="iconbtn" id="repClose" type="button" aria-label="${t('rClose')}"><svg class="ico"><use href="#i-close"/></svg></button>
      </div>
    </div>
    <div class="r-hero">
      <div class="r-img"><img src="${img}" alt="${t('rImgAlt')}"></div>
      <div class="r-sum">
        <h2>${label}</h2>
        <p class="r-meta"><span>${t('rClimate', t(fut ? 'r2050' : 'rToday'))}</span><span>${t('rTier', state.tier === 'passive' ? 'Passive' : 'TS 825')}</span>
          <span>${t('students', m.students)}</span><span>${t('rArea', fmt(3553 * sc))}</span></p>
        <div class="r-tags">${tags}${exTags}</div>
        <div class="r-big">
          <div><span class="cls" style="background:${ECOL[cls]}">${cls}</span><small>${t('rClass')}</small></div>
          <div><b>${m.energy}</b><small>${t('rPts')}</small></div>
          <div><b>${t('pct', co2cut)}</b><small>${t('rCo2')}</small></div>
          <div><b>${yrs(pb)}</b><small>${t('rPb')}</small></div>
        </div>
      </div>
    </div>
    <div class="r-body">
      <section><h3><i>1</i>${t('rS1')}</h3>
        <table class="rt"><thead><tr><th>${t('rInd')}</th><th>${t('rBase')}</th><th>${t('rScen')}</th><th>${t('rChange')}</th></tr></thead><tbody>
        ${row(t('rEnergyIdx'), 100, m.energy, true)}${row(t('rEmisIdx'), 100, m.emis, true)}
        <tr><td>${t('rPbRow')}</td><td>—</td><td>${yrs(pb)}</td><td class="faint">—</td></tr>
        ${row(t('rComfortRow'), m.comfort0, m.c, false)}</tbody></table>
        ${svgIndicators(m)}</section>
      <section><h3><i>2</i>${t('rS2')}</h3>
        <table class="rt"><thead><tr><th>${t('rCarrier')}</th><th>${t('rBase')}</th><th>${t('rScen')}</th><th>${t('rChange')}</th></tr></thead><tbody>
        ${row(t('rGasRow'), bGas, sGas, true)}${row(t('rElecRow'), bEl, sEl, true)}
        <tr class="tot"><td>${t('rTotal')}</td><td>${fmt(baseTot)}</td><td>${fmt(scenTot)}</td><td class="${scenTot < baseTot ? 'dn' : 'up'}">${scenTot > baseTot ? '+' : ''}${fmt(scenTot - baseTot)}</td></tr>
        </tbody></table>
        ${svgCarrier(bGas, bEl, sGas, sEl)}
        <p class="rsub">${t('rGasNote')}</p></section>
      <section><h3><i>3</i>${t('rS3')}</h3>
        <table class="rt"><thead><tr><th>${t('rSys')}</th><th colspan="2">${t('rEffect')}</th><th>${t('rIdx')}</th></tr></thead><tbody>${contribRows}</tbody></table>
        ${svgContrib(m.contrib, kwh)}</section>
      <section><h3><i>4</i>${t('rS4')}</h3>
        <table class="rt"><tbody>
          <tr><td>${t('rCapex')}</td><td>${capex > 0 ? tl(capex) : '—'}</td></tr>
          <tr><td>${t('rCostBase')}</td><td>${tl(baseTL)}</td></tr>
          <tr><td>${t('rCostScen')}</td><td>${tl(scenTL)}</td></tr>
          <tr><td>${t('rSave')}</td><td>${tl(saveTL)}</td></tr>
          <tr><td>${t('rPbTime')}</td><td>${yrs(pb)}</td></tr>
          <tr><td>${t('rCo2Year')}</td><td>${t('pct', co2cut)}</td></tr>
          <tr class="tot"><td>${t('rNet')}</td><td>${tl(net25)}</td></tr>
        </tbody></table>
        ${capex > 0 ? svgCash(capex, saveTL, pb) : ''}</section>
      <p class="rnote">${t('rNotes', fmt(PRICE.gas, 2), fmt(PRICE.elec, 2))}</p>
    </div>`;

  const ov = $('reportOv');
  ov.classList.add('open');
  document.body.classList.add('locked');
  const close = () => {
    ov.classList.remove('open');
    document.body.classList.remove('locked');
    document.removeEventListener('keydown', onKey);
    ov.removeEventListener('click', onOv);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onOv = (e) => { if (e.target === ov) close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', onOv);
  $('repClose').addEventListener('click', close);
  $('repPrint').addEventListener('click', () => window.print());
  $('repClose').focus();
}
