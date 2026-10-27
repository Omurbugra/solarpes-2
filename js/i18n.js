// Türkçe / İngilizce metinler. Statik metinler HTML'de Türkçe durur (data-i18n="anahtar"); İngilizceleri burada.
// Dinamik metinler t('anahtar', {değişken}) ile gelir.

const D = {
  tr: {
    loading: 'Yapı kiti yükleniyor',
    loadFail: 'Model yüklenemedi. Sayfayı yenileyin.',
    floors: (n) => `${n} kat`,
    floorH: (h) => `${h} m kat yüksekliği`,
    roofFlat: 'düz çatı', roofPitch: 'eğimli çatı',
    orientNS: 'kuzey–güney', orientEW: 'doğu–batı',
    tbArch: 'Arketip', tbMass: 'Kütle', tbFacade: 'Cephe', tbExisting: 'Mevcut',
    wwrTxt: { low: 'az pencere', mid: 'orta pencere', high: 'çok pencere' },
    noExisting: 'renovasyon yok',
    areaGiven: 'Girilen değer kullanılıyor.',
    areaGuess: (a) => `Boş bırakılırsa öğrenci sayısından ${a} m² tahmin edilir (8,5 m² / öğrenci).`,
    roofGuess: (a, f, foot, pc, r) => `${a} m² / ${f} kat = ${foot} m² oturma alanı. Panel konabilecek kısım bunun %${pc}'i, yaklaşık ${r} m².`,
    cmp0: 'Bütün alanlar varsayılan; sonuç kaba bir tahmin olur.',
    cmp: (pc, f, n) => `Girdilerin %${pc}'i gerçek veri (${f}/${n} alan).`,
    redo: 'Binayı yeniden tanımla',
    baseLine: 'Mevcut bina',
    scenario: 'Senaryo',
    add: 'Ekle', added: 'Eklendi', existing: 'Var',
    noneAdded: 'Henüz sistem eklenmedi. Soldaki listeden seçin ya da modelin üstüne sürükleyin.',
    remove: (n) => `${n} kaldır`,
    energy: 'Enerji', emis: 'Emisyon', payback: 'Geri ödeme', comfort: 'Yaz konforu',
    pts: 'puan', yr: 'yıl',
    energyDet: 'mevcut bina 100', emisDet: 'yıllık CO₂, mevcut 100', comfortDet: 'konforlu sınıf oranı',
    comfortDet50: 'konforlu sınıf oranı, 2050',
    target: (v) => `hedef ${v}`,
    capex: (v) => `yatırım yaklaşık ${v} milyon ₺`, noCapex: 'henüz yatırım yok',
    net25: (v) => `25 yılda net ${v} milyon ₺`,
    gas: 'doğalgaz', elec: 'elektrik',
    totalEnergy: 'Toplam enerji',
    contribEmpty: 'Bir sistem eklediğinizde enerjiye katkısı burada görünür.',
    warnGround: 'Zemin yalıtımı tek başına bu binada yaz konforunu düşürüyor. Çatı yalıtımı ya da gölgeleme ile birlikte düşünün.',
    grp: { Kabuk: 'Kabuk', Pasif: 'Pasif', Sistem: 'Sistem', Üretim: 'Üretim' },
    sys: {
      roof: ['Çatı yalıtımı', 'Isıtma yükünü azaltır'], wall: ['Duvar yalıtımı', 'Dıştan mantolama'],
      window: ['Pencere', 'Üçlü cam, PVC kasa'], ground: ['Zemin yalıtımı', 'Yaz konforunu düşürebilir'],
      shading: ['Güneş kırıcı', 'Güneyde saçak, doğu-batıda kanat'], heatpump: ['Isı pompası (VRF)', 'Kazan ve klimanın yerine'],
      pv: ['Çatıya güneş paneli', 'Yerinde elektrik üretimi'],
    },
    contrib: { roof: 'Çatı yalıtımı', wall: 'Duvar yalıtımı', window: 'Pencere', ground: 'Zemin yalıtımı', shading: 'Güneş kırıcı', heatpump: 'Isı pompası', pv: 'Güneş paneli' },
    school: { ilk: 'İlkokul', orta: 'Ortaokul', lise: 'Lise' },
    plan: { flat: 'düz (I) plan', l: 'L plan', u: 'U plan' },
    era: { pre80: '1980 öncesi', '80_00': '1980–2000', post00: '2000 sonrası' },
    wall: { brick_hollow: 'delikli tuğla', brick_solid: 'dolu tuğla', aac: 'gazbeton', rc: 'betonarme' },
    glaz: { single: 'tek cam', double: 'çift cam', triple: 'üçlü cam' },
    heat: { gas: 'doğalgaz kazanı', coal: 'kömür kazanı', elec: 'elektrikli ısıtma', hp: 'ısı pompası' },
    cool: { none: 'soğutma yok', split: 'split klima', vrf: 'VRF' },
    ins: (l) => `yalıtım: ${l}`, noIns: 'yalıtımsız', insPart: { wall: 'duvar', roof: 'çatı', ground: 'zemin' },
    students: (n) => `${n} öğrenci`,
    pct: (v) => `%${v}`,
    // rapor
    rTitle: 'Analiz raporu', rPrint: 'PDF olarak kaydet', rClose: 'Kapat', rImgAlt: 'Senaryonun 3B görünümü',
    rClimate: (c) => `İklim: ${c}`, rToday: 'bugün (TMY 2009–2023)', r2050: '2050 (SSP5-8.5)',
    rTier: (v) => `Kabuk düzeyi: ${v}`, rArea: (v) => `${v} m²`,
    rNoReno: 'Renovasyon yok; mevcut bina', rExisting: (n) => `var: ${n}`,
    rClass: 'enerji sınıfı', rPts: 'enerji puanı', rCo2: 'CO₂ azalması', rPb: 'geri ödeme',
    rS1: 'Değerlendirme göstergeleri', rS2: 'Enerji taşıyıcıları, yıllık kWh', rS3: 'Sistemlerin katkısı', rS4: 'Yirmi beş yıllık finans',
    rInd: 'Gösterge', rBase: 'Mevcut', rScen: 'Senaryo', rChange: 'Değişim', rCarrier: 'Taşıyıcı', rSys: 'Sistem',
    rEffect: 'Yıllık enerji etkisi', rIdx: 'İndeks', rTotal: 'Toplam',
    rEnergyIdx: 'Enerji, indeks', rEmisIdx: 'Emisyon, indeks', rPbRow: 'Maliyet, geri ödeme', rComfortRow: 'Yaz konforu, uyumlu %',
    rGasRow: 'Doğalgaz, ısıtma', rElecRow: 'Elektrik', rNone: 'Renovasyon uygulanmadı.',
    rCapex: 'İlk yatırım', rCostBase: 'Yıllık enerji gideri, mevcut', rCostScen: 'Yıllık enerji gideri, senaryo',
    rSave: 'Yıllık tasarruf', rPbTime: 'Geri ödeme süresi', rCo2Year: 'Yıllık CO₂ azalması', rNet: 'Yirmi beş yılda net kazanç',
    rGasNote: 'Mevcut binada enerjinin %85\'i ısıtma gazıdır. Isı pompası bu yükü elektriğe taşır.',
    rNotes: (pg, pe) => `<b>Varsayımlar.</b> Enerji fiyatları gerçek okul faturalarından alınmıştır: doğalgaz ${pg} TL/kWh, elektrik ${pe} TL/kWh, vergiler dahil. Fiyat artışı ve iskonto uygulanmamıştır. Yaz konforu, okullar 15 Haziran–1 Eylül arası tatilde olduğu için yalnızca mayıs, haziran ve eylülde ölçülür.<br><b>Bu değerler tahmindir.</b> Arketip sonuçları gerçek simülasyonlardan türetilmiş bir vekil modelle hesaplanır; bina tek tek simüle edilmez.`,
    cBase: 'Mevcut', cScen: 'Senaryo', cReduces: 'azaltır', cIncreases: 'artırır', cBaseLine: 'dikey çizgi: mevcut bina',
    cToday: 'bugün', cY25: '25. yıl', cBreak: (y) => `${y}. yıl, başabaş`,
  },
  en: {
    loading: 'Loading building kit',
    loadFail: 'The model could not be loaded. Reload the page.',
    floors: (n) => `${n} ${n === 1 ? 'storey' : 'storeys'}`,
    floorH: (h) => `${h} m floor height`,
    roofFlat: 'flat roof', roofPitch: 'pitched roof',
    orientNS: 'north–south', orientEW: 'east–west',
    tbArch: 'Archetype', tbMass: 'Massing', tbFacade: 'Facade', tbExisting: 'Existing',
    wwrTxt: { low: 'few windows', mid: 'medium glazing', high: 'large windows' },
    noExisting: 'no retrofit yet',
    areaGiven: 'Using the value you entered.',
    areaGuess: (a) => `If left empty, ${a} m² is estimated from the number of students (8.5 m² per student).`,
    roofGuess: (a, f, foot, pc, r) => `${a} m² / ${f} storeys = ${foot} m² footprint. Panels fit on ${pc}% of it, about ${r} m².`,
    cmp0: 'Every field is a default, so the result is a rough estimate.',
    cmp: (pc, f, n) => `${pc}% of the inputs are real data (${f} of ${n} fields).`,
    redo: 'Redefine the building',
    baseLine: 'Existing building',
    scenario: 'Scenario',
    add: 'Add', added: 'Added', existing: 'In place',
    noneAdded: 'No measures added yet. Pick one from the list or drag it onto the model.',
    remove: (n) => `Remove ${n}`,
    energy: 'Energy', emis: 'Emissions', payback: 'Payback', comfort: 'Summer comfort',
    pts: 'pts', yr: 'yr',
    energyDet: 'existing building = 100', emisDet: 'annual CO₂, existing = 100', comfortDet: 'share of comfortable classrooms',
    comfortDet50: 'share of comfortable classrooms, 2050',
    target: (v) => `target ${v}`,
    capex: (v) => `investment about ₺${v} million`, noCapex: 'no investment yet',
    net25: (v) => `net ₺${v} million over 25 years`,
    gas: 'natural gas', elec: 'electricity',
    totalEnergy: 'Total energy',
    contribEmpty: 'Add a measure to see how much energy it saves.',
    warnGround: 'On its own, ground insulation lowers summer comfort in this building. Combine it with roof insulation or shading.',
    grp: { Kabuk: 'Envelope', Pasif: 'Passive', Sistem: 'Systems', Üretim: 'Generation' },
    sys: {
      roof: ['Roof insulation', 'Cuts the heating load'], wall: ['Wall insulation', 'External thermal cladding'],
      window: ['Windows', 'Triple glazing, PVC frames'], ground: ['Ground insulation', 'Can lower summer comfort'],
      shading: ['Solar shading', 'Overhangs south, fins east and west'], heatpump: ['Heat pump (VRF)', 'Replaces boiler and AC'],
      pv: ['Rooftop solar panels', 'On-site electricity'],
    },
    contrib: { roof: 'Roof insulation', wall: 'Wall insulation', window: 'Windows', ground: 'Ground insulation', shading: 'Solar shading', heatpump: 'Heat pump', pv: 'Solar panels' },
    school: { ilk: 'Primary school', orta: 'Middle school', lise: 'High school' },
    plan: { flat: 'bar (I) plan', l: 'L plan', u: 'U plan' },
    era: { pre80: 'before 1980', '80_00': '1980–2000', post00: 'after 2000' },
    wall: { brick_hollow: 'hollow brick', brick_solid: 'solid brick', aac: 'aerated concrete', rc: 'reinforced concrete' },
    glaz: { single: 'single glazing', double: 'double glazing', triple: 'triple glazing' },
    heat: { gas: 'gas boiler', coal: 'coal boiler', elec: 'electric heating', hp: 'heat pump' },
    cool: { none: 'no cooling', split: 'split AC', vrf: 'VRF' },
    ins: (l) => `insulation: ${l}`, noIns: 'uninsulated', insPart: { wall: 'wall', roof: 'roof', ground: 'ground' },
    students: (n) => `${n} students`,
    pct: (v) => `${v}%`,
    rTitle: 'Analysis report', rPrint: 'Save as PDF', rClose: 'Close', rImgAlt: '3D view of the scenario',
    rClimate: (c) => `Climate: ${c}`, rToday: 'today (TMY 2009–2023)', r2050: '2050 (SSP5-8.5)',
    rTier: (v) => `Envelope level: ${v}`, rArea: (v) => `${v} m²`,
    rNoReno: 'No retrofit; existing building', rExisting: (n) => `in place: ${n}`,
    rClass: 'energy class', rPts: 'energy score', rCo2: 'CO₂ reduction', rPb: 'payback',
    rS1: 'Indicators', rS2: 'Energy carriers, kWh per year', rS3: 'What each measure contributes', rS4: 'Twenty-five-year finances',
    rInd: 'Indicator', rBase: 'Existing', rScen: 'Scenario', rChange: 'Change', rCarrier: 'Carrier', rSys: 'Measure',
    rEffect: 'Annual energy effect', rIdx: 'Index', rTotal: 'Total',
    rEnergyIdx: 'Energy, index', rEmisIdx: 'Emissions, index', rPbRow: 'Cost, payback', rComfortRow: 'Summer comfort, % compliant',
    rGasRow: 'Natural gas, heating', rElecRow: 'Electricity', rNone: 'No retrofit applied.',
    rCapex: 'Initial investment', rCostBase: 'Annual energy cost, existing', rCostScen: 'Annual energy cost, scenario',
    rSave: 'Annual savings', rPbTime: 'Payback period', rCo2Year: 'Annual CO₂ reduction', rNet: 'Net gain over 25 years',
    rGasNote: 'In the existing building 85% of the energy is heating gas. A heat pump moves this load to electricity.',
    rNotes: (pg, pe) => `<b>Assumptions.</b> Energy prices come from real school bills: natural gas ${pg} TL/kWh, electricity ${pe} TL/kWh, taxes included. No price escalation or discounting. Summer comfort is measured only in May, June and September, because schools are closed from 15 June to 1 September.<br><b>These values are estimates.</b> Archetype results come from a surrogate model derived from real simulations; the building is not simulated individually.`,
    cBase: 'Existing', cScen: 'Scenario', cReduces: 'reduces', cIncreases: 'increases', cBaseLine: 'vertical line: existing building',
    cToday: 'today', cY25: 'year 25', cBreak: (y) => `break-even in year ${y}`,
  },
};

// statik metinlerin İngilizcesi (Türkçesi HTML'de)
const EN = {
  brandSub: 'School energy retrofit', pageTitle: 'Build a scenario and analyse it',
  step1: 'Define the building', step2: 'Apply a retrofit', step3: 'Report', schoolModel: '3D school model',
  h1: 'Start by describing your school',
  lead: 'Fill in what you know about the building. SolarPES matches it to one of its building archetypes and updates the model as you go. Then you test retrofit measures on that archetype.',
  s1: 'Building', s2: 'Envelope', s3: 'Systems and use', s4: 'Spaces and schedule', s5: 'Energy bills', optional: 'optional',
  s4hint: 'Filling this in noticeably improves the estimate. The school office has all of it.',
  s5hint: 'The most valuable input: the model is calibrated to your real consumption instead of guessing.',
  fSchool: 'School type', fFloors: 'Storeys', fPlan: 'Plan shape', fEra: 'Construction period', fOrient: 'Long facades face',
  fWall: 'Wall material', fGlaz: 'Glazing', fWwr: 'Window area', fRoofT: 'Roof', fInsWall: 'Wall insulation', fInsRoof: 'Roof insulation',
  fInsGround: 'Ground insulation', fHeat: 'Heating', fCool: 'Cooling', fUsage: 'Schedule', fStudents: 'Students',
  fRooms: 'Classrooms', fRoomsHint: 'Internal gains and ventilation are derived from this.', fArea: 'Total floor area', fHgt: 'Floor height',
  fRoofA: 'Roof area available for panels', fSpaces: 'Special spaces', fSpacesHint: 'A dormitory keeps the building in use around the clock, which changes the result most.',
  fHours: 'Hours in use per day', fSummer: 'Use during summer break', fGasBill: 'Natural gas per year', fElecBill: 'Electricity per year',
  fLight: 'Lighting', fBoiler: 'Boiler age',
  oIlk: 'Primary school', oOrta: 'Middle school', oLise: 'High school', oPre80: 'Before 1980', o8000: '1980–2000', oPost00: 'After 2000',
  oNS: 'North and south', oEW: 'East and west', oHollow: 'Hollow brick', oSolid: 'Solid brick', oAac: 'Aerated concrete', oRc: 'Reinforced concrete',
  oGas: 'Gas boiler', oCoal: 'Coal boiler', oElec: 'Electric', oHp: 'Heat pump', oNone: 'None', oSplit: 'Split AC', oVrf: 'VRF',
  gSingle: 'Single', gDouble: 'Double', gTriple: 'Triple', wLow: 'Small', wMid: 'Medium', wHigh: 'Large', rFlat: 'Flat', rPitch: 'Pitched',
  pFlat: 'Bar (I)', pL: 'L shape', pU: 'U shape', uFull: 'Full day', uDouble: 'Two shifts',
  spGym: 'Sports hall', spKitchen: 'Canteen with kitchen', spLab: 'Laboratory', spDorm: 'Dormitory', spHall: 'Auditorium',
  h8: '8 hours', h10: '10 hours', h12: '12 or more', sNone: 'Closed', sSome: 'Partly', sFull: 'Open',
  lFl: 'Fluorescent', lLed: 'LED', lMix: 'Mixed', bOld: '15+ years', bMid: '5–15 years', bNew: '0–5 years',
  tog: 'yes', togNo: 'no', exNone: 'e.g. 5,100', exGas: 'e.g. 42,000', exElec: 'e.g. 96,000', calc: 'calculated',
  setArch: 'Set the archetype', previewNote: 'Drag to turn the model',
  measures: 'Retrofit measures', measuresHint: 'Click to add, or drag onto the model.',
  climate: 'Climate', today: 'Today', y2050: '2050', tier: 'Envelope level',
  ekbTitle: 'Energy class', ekbNote: 'Scale of the energy performance certificate (EKB). Existing building is marked on the left, your scenario on the right.',
  carriers: 'Where the energy comes from', contrib: 'What each measure adds', ctaNote: 'Values are estimates derived from real simulations; the archetype is not simulated individually.',
  analyze: 'Create the report', rot: 'Rotate automatically', home: 'Reset view', theme: 'Switch theme',
};

let lang = 'tr';
try { lang = localStorage.getItem('sp2-lang') || 'tr'; } catch { /* yok */ }
const subs = [];

export const getLang = () => lang;
export function t(k, ...a) {
  const v = k.split('.').reduce((o, p) => o?.[p], D[lang]) ?? k.split('.').reduce((o, p) => o?.[p], D.tr);
  return typeof v === 'function' ? v(...a) : v;
}
export function onLang(cb) { subs.push(cb); }
export function setLang(l) {
  lang = l;
  try { localStorage.setItem('sp2-lang', l); } catch { /* yok */ }
  applyStatic();
  subs.forEach((cb) => cb(l));
}
export function applyStatic() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.dataset.tr ??= el.innerHTML;
    el.innerHTML = lang === 'en' ? EN[el.dataset.i18n] ?? el.dataset.tr : el.dataset.tr;
  }
  for (const [attr, key] of [['placeholder', 'i18nPh'], ['title', 'i18nTitle'], ['aria-label', 'i18nAria']]) {
    for (const el of document.querySelectorAll(`[data-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}]`)) {
      const store = 'tr' + key;
      el.dataset[store] ??= el.getAttribute(attr) ?? '';
      el.setAttribute(attr, lang === 'en' ? EN[el.dataset[key]] ?? el.dataset[store] : el.dataset[store]);
    }
  }
  document.title = lang === 'en' ? 'Build a scenario – SolarPES' : 'Senaryo kur ve analiz et – SolarPES';
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
}
