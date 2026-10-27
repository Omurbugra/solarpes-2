# SolarPES · Senaryo kur ve analiz et

Okulun özelliklerini girip bina arketipini belirleyen, renovasyon önlemlerini (yalıtım, pencere, güneş kırıcı,
ısı pompası, güneş paneli) 3B model üzerinde deneyip enerji, emisyon, geri ödeme ve yaz konforu etkisini
gösteren sayfa. Türkçe / İngilizce.

Canlı: https://omurbugra.github.io/solarpes-2/ · Ana 3B okul modeli: https://omurbugra.github.io/solarpes/

## Yapı

- `index.html`, `css/`, `js/` — sayfa (three.js, derleme adımı yok)
  - `js/scene.js` binayı yapı kitinden kurar, `js/model.js` arketip ve senaryo hesabı, `js/i18n.js` metinler
- `assets/kit.glb`, `assets/kit.json` — Rhino'da modellenen yapı kiti (cephe modülleri, çatılar, PV yerleşimleri)
- `rhino/` — kiti kuran ve dışa aktaran Rhino 8 betikleri (`build_kit()`, `export_kit()`, `rebuild([...])`)

## Yerelde çalıştırma

```bash
py -m http.server 5174
```

Ardından `http://localhost:5174` adresini açın.
