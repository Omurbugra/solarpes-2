# site-2 (Senaryo kur ve analiz et) arketip yapı kiti.
# Bina, kat x cephe modüllerinden kurulur; modüller burada Rhino'da modellenir, sayfa onları plan tipine
# (I / L / U), kat sayısına, pencere oranına ve yönelime göre dizer. Çatılar ve PV yerleşimleri her plan
# için ayrıca modellenir (eğimli çatı = kanat katılarının boolean birleşimi).
#
# Katmanlar: ARCH::<modül>::<grup>::<malzeme>; modüller y=-220 (cephe kiti) ve y=-320 (çatılar) hattında.
# Yerel çerçeve: x cephe boyunca, -y dışarı (cephe yüzü y=0), z yukarı. Çatı modülleri bina planı
# koordinatında (x doğu, y kuzey, ön cephe y=0), z=0 saçak hattı / çatı döşemesi üstü.
#
# Kullanım (Rhino MCP): doc=__rhino_doc__; exec(kit_lib.py); exec(bu dosya); build_kit(); export_kit()
import os
import json
import math
import collections

BAY = 3.5            # cephe aksı
FH = 3.4             # kat yüksekliği (ana modelle aynı)
WT = 0.30            # duvar kalınlığı (görünen kısmı)
BAND = 0.32          # kat bandı yüksekliği
SKIN = 0.12          # mantolama kalınlığı
WWR = {'az': (1.3, 1.5, 1.0), 'orta': (1.8, 1.8, 0.9), 'cok': (2.6, 2.0, 0.8)}   # (genişlik, yükseklik, denizlik)
FOOT = {
    'I': [(0, 0), (56, 0), (56, 14), (0, 14)],
    'L': [(0, 0), (42, 0), (42, 14), (14, 14), (14, 49), (0, 49)],
    'U': [(0, 0), (49, 0), (49, 42), (35, 42), (35, 14), (14, 14), (14, 42), (0, 42)],
}
# eğimli çatı kanatları: (x0, y0, x1, y1, mahya ekseni, başta kırma, sonda kırma)
WINGS = {
    'I': [(0, 0, 56, 14, 'x', True, True)],
    'L': [(0, 0, 42, 14, 'x', True, True), (0, 7, 14, 49, 'y', False, True)],
    'U': [(0, 0, 49, 14, 'x', True, True), (0, 7, 14, 42, 'y', False, True), (35, 7, 49, 42, 'y', False, True)],
}
STAIR = {'I': (3, 5, 7.5, 10), 'L': (3, 39, 7.5, 44), 'U': (3, 31, 7.5, 36)}       # düz çatı merdiven evi
SLOPE = 0.42         # ~23°
OVH = 0.6            # saçak taşması
FASCIA = 0.2
ENT_BAYS = 2

MATS.update({  # kit_lib.MATS
    'A_Render': ('#ebe3d2', 1, 0, .95, 0),
    'A_RenderNew': ('#f3eee3', 1, 0, .9, 0),
    'A_Band': ('#d6c6a5', 1, 0, .9, 0),
    'A_BandNew': ('#c9b48c', 1, 0, .85, 0),
    'A_Pilaster': ('#e0d6c2', 1, 0, .95, 0),
    'A_Plinth': ('#8e8b83', 1, 0, .95, 0),
    'A_Sill': ('#c8c2b5', 1, 0, .8, 0),
    'A_SillNew': ('#b8bec3', 1, .5, .4, 0),
    'A_FrameOld': ('#7a6c5c', 1, .2, .6, 0),
    'A_GlassOld': ('#39464e', 1, .1, .15, 0),
    'A_Shade': ('#d9dcd7', 1, .3, .45, 0),        # açık alüminyum gölgelik
    'A_Screen': ('#c9c6bd', 1, .1, .7, 0),
    'A_XPS': ('#86b8d6', 1, 0, .7, 0),
    'A_Coping': ('#b9b5ac', 1, .2, .6, 0),
    'A_Membrane': ('#77786f', 1, 0, .95, 0),
    'A_InsRoof': ('#dcae4c', 1, 0, .9, 0),
    'A_Tile': ('#c26a4a', 1, 0, .85, 0),
    'A_Soffit': ('#e9e2d4', 1, 0, .95, 0),
    'A_Fascia': ('#f0ebe0', 1, 0, .8, 0),
    'A_Chimney': ('#b9a68c', 1, 0, .95, 0),
    'A_Door': ('#3f4b53', 1, .3, .5, 0),
    'A_Canopy': ('#dcd8cf', 1, 0, .8, 0),
    'A_Column': ('#cfc9be', 1, 0, .8, 0),
    'A_Step': ('#b4afa5', 1, 0, .95, 0),
    'A_Sign': ('#16526b', 1, .1, .5, 0),
    'A_Metal': ('#e3e4e0', 1, .15, .45, 0),
    'A_Dark': ('#2d3237', 1, .2, .6, 0),
    'A_Guard': ('#596168', 1, .5, .45, 0),
    'A_Pipe': ('#22262a', 1, 0, .85, 0),
    'A_Concrete': ('#bdb9b0', 1, 0, .95, 0),
    'A_PVFrame': ('#aab2b9', 1, .7, .35, 0),
    'A_PVCell': ('#1c2b52', 1, .3, .25, 0),
    'A_Trunk': ('#76583f', 1, 0, .95, 0),
    'A_Leaf': ('#6f9650', 1, 0, .9, 0),
    'A_Leaf2': ('#8eab5d', 1, 0, .9, 0),
})

_ORG = {}
_CUR = ['']
_REBUILD = [False]
_ROW = {'kit': [0.0], 'roof': [0.0]}


def _clear():
    ids = [o.Id for o in doc.Objects if doc.Layers[o.Attributes.LayerIndex].FullPath.startswith('ARCH')]
    for i in ids:
        doc.Objects.Delete(i, True)
    _ORG.clear()
    _ROW['kit'][0] = 0.0
    _ROW['roof'][0] = 0.0


def kbegin(key, row='kit', width=12.0):
    if key in _ORG and _REBUILD[0]:               # rebuild(): mevcut orijini koru
        _CUR[0] = key
        return
    x = _ROW[row][0]
    _ROW[row][0] += width
    _ORG[key] = RG.Point3d(x, -220.0 if row == 'kit' else -320.0, 0)
    _CUR[0] = key


def kadd(geo, grp, mat, xf=None):
    if geo is None:
        return
    g = geo.Duplicate()
    if xf is not None:
        g.Transform(xf)
    g.Transform(RG.Transform.Translation(RG.Vector3d(_ORG[_CUR[0]])))
    a = DO.ObjectAttributes()
    a.LayerIndex = layer('ARCH::%s::%s::%s' % (_CUR[0], grp, mat))
    a.MaterialSource = DO.ObjectMaterialSource.MaterialFromObject
    a.MaterialIndex = mat_index(mat)
    doc.Objects.Add(g, a)


def B(grp, mat, x0, y0, z0, x1, y1, z1, xf=None):
    if abs(x1 - x0) < 1e-4 or abs(y1 - y0) < 1e-4 or abs(z1 - z0) < 1e-4:
        return
    kadd(box(x0, y0, z0, x1, y1, z1), grp, mat, xf)


# ---------------------------------------------------------------- cephe modülleri
def _wall_with_hole(grp, mat, y0, y1, zlo, zhi, x0, x1, wz0, wz1, ext=0.0):
    """[0,BAY] x [zlo,zhi] duvar şeridi, (x0..x1, wz0..wz1) boşluklu. ext: iki uçtan taşma."""
    B(grp, mat, -ext, y0, zlo, BAY + ext, y1, wz0)
    B(grp, mat, -ext, y0, wz1, BAY + ext, y1, zhi)
    B(grp, mat, -ext, y0, wz0, x0, y1, wz1)
    B(grp, mat, x1, y0, wz0, BAY + ext, y1, wz1)


def _window(x0, x1, z0, z1, yf=0.14):
    """Pencere: kasa, kayıt, orta dikme, cam. Malzemeleri sayfa 'pencere' sistemine göre değiştirir."""
    f = 0.07
    w = x1 - x0
    h = z1 - z0
    FR, GL = 'A_FrameOld', 'A_GlassOld'
    B('win', FR, x0, yf, z0, x1, yf + f, z0 + f)
    B('win', FR, x0, yf, z1 - f, x1, yf + f, z1)
    B('win', FR, x0, yf, z0 + f, x0 + f, yf + f, z1 - f)
    B('win', FR, x1 - f, yf, z0 + f, x1, yf + f, z1 - f)
    if w > 1.5:
        xm = (x0 + x1) / 2
        B('win', FR, xm - 0.04, yf, z0 + f, xm + 0.04, yf + f, z1 - f)
    if h >= 1.8:
        zt = z1 - 0.55
        B('win', FR, x0 + f, yf, zt - 0.035, x1 - f, yf + f, zt + 0.035)
    B('win', GL, x0 + f, yf + 0.03, z0 + f, x1 - f, yf + 0.04, z1 - f)


def _shading(x0, x1, z0, z1, y=0.0):
    """Güney: yatay panjurlu saçak (shadeH). Doğu/batı: düşey kanatlar (shadeV)."""
    zc = z1 + 0.16
    d = 0.75
    for xs in (x0 - 0.18, x1 + 0.14):
        B('shadeH', 'A_Shade', xs, y - d, zc - 0.05, xs + 0.04, y - 0.02, zc + 0.12)
    B('shadeH', 'A_Shade', x0 - 0.18, y - d, zc - 0.05, x1 + 0.18, y - d + 0.05, zc + 0.12)
    B('shadeH', 'A_Shade', x0 - 0.18, y - 0.08, zc + 0.04, x1 + 0.18, y - 0.02, zc + 0.12)
    n = 6
    for i in range(n):
        yy = y - 0.12 - i * (d - 0.17) / (n - 1)
        B('shadeH', 'A_Shade', x0 - 0.14, yy - 0.075, zc, x1 + 0.14, yy, zc + 0.022)
    for xs in (x0 - 0.2, x1 + 0.15):
        B('shadeV', 'A_Shade', xs, y - 0.6, z0 - 0.12, xs + 0.05, y - 0.02, z1 + 0.2)
        B('shadeV', 'A_Shade', xs - 0.03, y - 0.62, z1 + 0.05, xs + 0.08, y - 0.02, z1 + 0.2)


def build_bay(wwr, kind):
    """kind 'g' zemin kat (andezit süpürgelik), 'u' üst kat."""
    w, h, sill = WWR[wwr]
    x0 = (BAY - w) / 2
    x1 = x0 + w
    z0, z1 = sill, sill + h
    zlo = 0.0
    if kind == 'g':
        B('base', 'A_Plinth', 0, -0.04, 0, BAY, WT, 0.62)
        zlo = 0.62
    _wall_with_hole('base', 'A_Render', 0, WT, zlo, FH - BAND, x0, x1, z0, z1)
    B('base', 'A_Band', 0, -0.05, FH - BAND, BAY, WT, FH)
    B('base', 'A_Band', x0 - 0.1, -0.03, z1, x1 + 0.1, 0.0, z1 + 0.12)          # lento
    B('base', 'A_Sill', x0 - 0.08, -0.08, z0 - 0.06, x1 + 0.08, 0.14, z0)
    _window(x0, x1, z0, z1)
    _shading(x0, x1, z0, z1, y=-SKIN)
    # mantolama: eski yüzün 12 cm önünde yeni sıva; bant ve denizlik yenilenir
    t = -SKIN
    zs = 0.32 if kind == 'g' else 0.0
    _wall_with_hole('wall', 'A_RenderNew', t, 0, zs, FH - BAND, x0, x1, z0, z1)
    B('wall', 'A_RenderNew', 0, t, z1, BAY, 0, FH - BAND)
    B('wall', 'A_BandNew', 0, t - 0.04, FH - BAND, BAY, 0, FH)
    B('wall', 'A_SillNew', x0 - 0.06, t - 0.08, z0 - 0.04, x1 + 0.06, 0.14, z0)
    # reveal (söve dönüşü): pencere boşluğunda kasaya kadar
    B('wall', 'A_RenderNew', x0 - 0.0, t, z0, x0 + 0.03, 0.14, z1)
    B('wall', 'A_RenderNew', x1 - 0.03, t, z0, x1, 0.14, z1)
    B('wall', 'A_RenderNew', x0, t, z1 - 0.03, x1, 0.14, z1)
    if kind == 'g':
        # zemin yalıtımı: temel önünde XPS, toprak üstünde 50 cm görünür
        B('ground', 'A_XPS', 0, -0.17, -0.02, BAY, -0.0, 0.5)
        B('ground', 'A_SillNew', 0, -0.19, 0.5, BAY, -0.0, 0.53)


def build_pilaster(kind):
    zb = 0.0
    if kind == 'g':
        B('base', 'A_Plinth', -0.29, -0.16, 0, 0.29, 0.1, 0.62)
        zb = 0.62
    B('base', 'A_Pilaster', -0.25, -0.12, zb, 0.25, 0.1, FH)
    B('wall', 'A_RenderNew', -0.33, -0.12 - SKIN, 0.32 if kind == 'g' else 0, 0.33, 0, FH)
    if kind == 'g':
        B('ground', 'A_XPS', -0.33, -0.12 - SKIN - 0.05, -0.02, 0.33, 0, 0.5)


def build_corner(kind):
    """Dış köşe: gelen kenar yüzü x=0 (dışarı -x), giden kenar yüzü y=0 (dışarı -y)."""
    zb = 0.0
    if kind == 'g':
        B('base', 'A_Plinth', -0.22, -0.22, 0, 0.55, 0.55, 0.62)
        zb = 0.62
    B('base', 'A_Pilaster', -0.18, -0.18, zb, 0.5, 0.5, FH)
    o = 0.18 + SKIN
    B('wall', 'A_RenderNew', -o, -o, 0.32 if kind == 'g' else 0, 0.58, 0.58, FH)
    if kind == 'g':
        B('ground', 'A_XPS', -o - 0.05, -o - 0.05, -0.02, 0.6, 0.6, 0.5)
        B('ground', 'A_SillNew', -o - 0.07, -o - 0.07, 0.5, 0.6, 0.6, 0.53)


def build_tops():
    kbegin('par')                       # düz çatı parapeti (bina üst kotundan başlar)
    B('base', 'A_Render', 0, 0, 0, BAY, WT, 0.95)
    B('base', 'A_Coping', 0, -0.06, 0.95, BAY, WT + 0.04, 1.02)
    B('wall', 'A_RenderNew', 0, -SKIN, 0, BAY, 0, 0.95)
    B('wall', 'A_Coping', 0, -SKIN - 0.05, 0.95, BAY, WT + 0.04, 1.05)
    kbegin('parc')
    B('base', 'A_Render', -0.18, -0.18, 0, 0.5, 0.5, 0.95)
    B('base', 'A_Coping', -0.22, -0.22, 0.95, 0.5, 0.5, 1.02)
    o = 0.18 + SKIN
    B('wall', 'A_RenderNew', -o, -o, 0, 0.5, 0.5, 0.95)
    B('wall', 'A_Coping', -o - 0.05, -o - 0.05, 0.95, 0.5, 0.5, 1.05)
    kbegin('cnc')                       # eğimli çatı saçak kornişi
    B('base', 'A_Band', 0, -0.16, 0, BAY, WT, 0.28)
    B('wall', 'A_BandNew', 0, -SKIN - 0.08, 0, BAY, 0, 0.28)
    kbegin('cncc')
    B('base', 'A_Band', -0.26, -0.26, 0, 0.5, 0.5, 0.28)
    o = 0.18 + SKIN + 0.08
    B('wall', 'A_BandNew', -o, -o, 0, 0.5, 0.5, 0.28)


def build_entrance():
    """İki akslık zemin kat giriş modülü: kapı, saçak, kolonlar, basamak, tabela."""
    kbegin('ent', width=16)
    W = BAY * ENT_BAYS
    dx0, dx1, dz = 1.85, W - 1.85, 2.75
    B('base', 'A_Plinth', 0, -0.04, 0, dx0, WT, 0.62)
    B('base', 'A_Plinth', dx1, -0.04, 0, W, WT, 0.62)
    B('base', 'A_Render', 0, 0, 0.62, dx0, WT, dz)
    B('base', 'A_Render', dx1, 0, 0.62, W, WT, dz)
    B('base', 'A_Render', 0, 0, dz, W, WT, FH - BAND)
    B('base', 'A_Band', 0, -0.05, FH - BAND, W, WT, FH)
    # kapı ve yan camlar
    f = 0.08
    B('base', 'A_Door', dx0, 0.1, 0, dx1, 0.18, f)
    B('base', 'A_Door', dx0, 0.1, dz - f, dx1, 0.18, dz)
    for x in (dx0, dx0 + 0.75, (dx0 + dx1) / 2 - 0.04, dx1 - 0.75 - f, dx1 - f):
        B('base', 'A_Door', x, 0.1, 0, x + f, 0.18, dz)
    B('base', 'A_Door', dx0, 0.1, 2.1, dx1, 0.18, 2.18)
    B('win', 'A_GlassOld', dx0 + f, 0.13, f, dx1 - f, 0.15, dz - f)
    # saçak ve kolonlar
    B('base', 'A_Canopy', 0.5, -2.7, 3.0, W - 0.5, 0, 3.24)
    B('base', 'A_Sign', 1.6, -2.74, 3.02, W - 1.6, -2.7, 3.22)
    for x in (0.95, W - 0.95):
        kadd(cyl((x, -2.3, 0.15), (x, -2.3, 3.0), 0.14), 'base', 'A_Column')
    B('base', 'A_Step', 0.3, -2.9, 0, W - 0.3, 0, 0.15)
    B('base', 'A_Step', 0.6, -3.3, 0, W - 0.6, -2.9, 0.075)
    # mantolama
    t = -SKIN
    B('wall', 'A_RenderNew', 0, t, 0.32, dx0, 0, dz)
    B('wall', 'A_RenderNew', dx1, t, 0.32, W, 0, dz)
    B('wall', 'A_RenderNew', 0, t, dz, W, 0, FH - BAND)
    B('wall', 'A_BandNew', 0, t - 0.04, FH - BAND, W, 0, FH)
    B('ground', 'A_XPS', 0, -0.17, -0.02, dx0 - 0.0, 0, 0.5)
    B('ground', 'A_XPS', dx1, -0.17, -0.02, W, 0, 0.5)


def build_heatpump():
    """VRF servis avlusu: cepheden 60 cm açıkta beton kaide, sırt sırta duvara bakan iki ünite, alçak
    panjurlu çit; borular duvar dibinde kapaklı bir kanalla binaya girer (cephede yukarı boru yok)."""
    kbegin('hp', width=14)
    B('hp', 'A_Concrete', 0, -3.4, 0, 5.2, -0.6, 0.15)
    for i in range(2):
        x = 0.4 + i * 2.4
        y0, y1 = -1.95, -1.15                       # ön (fanlar) / arka yüz
        B('hp', 'A_Dark', x + 0.05, y0 + 0.05, 0.15, x + 0.15, y1 - 0.05, 0.27)
        B('hp', 'A_Dark', x + 1.85, y0 + 0.05, 0.15, x + 1.95, y1 - 0.05, 0.27)
        B('hp', 'A_Metal', x, y0, 0.27, x + 2.0, y1, 1.95)
        B('hp', 'A_Metal', x - 0.02, y0 - 0.02, 1.93, x + 2.02, y1 + 0.02, 1.98)
        for fx in (x + 0.52, x + 1.48):
            kadd(cyl((fx, y0 + 0.03, 1.2), (fx, y0 - 0.01, 1.2), 0.41), 'hp', 'A_Dark')
            kadd(torus((fx, y0 - 0.015, 1.2), (0, 1, 0), 0.41, 0.025), 'hp', 'A_Guard')
            for a in range(4):
                ang = a * math.pi / 4
                c, s = math.cos(ang) * 0.4, math.sin(ang) * 0.4
                kadd(cyl((fx - c, y0 - 0.02, 1.2 - s), (fx + c, y0 - 0.02, 1.2 + s), 0.008), 'hp', 'A_Guard')
            kadd(cyl((fx, y0 - 0.0, 1.2), (fx, y0 - 0.04, 1.2), 0.07), 'hp', 'A_Guard')
        B('hp', 'A_Guard', x + 0.1, y0 - 0.01, 0.4, x + 1.9, y0, 0.62)
        # arka yüzden kanala inen borular
        for k, r in ((0, 0.045), (1, 0.035)):
            px = x + 1.0 + k * 0.14
            kadd(cyl((px, y1, 0.9), (px, y1 + 0.12, 0.9), r), 'hp', 'A_Pipe')
            kadd(cyl((px, y1 + 0.12, 0.9), (px, y1 + 0.12, 0.5), r), 'hp', 'A_Pipe')
        B('hp', 'A_Shade', x + 0.85, y1 + 0.02, 0.3, x + 1.3, -0.14, 0.55)   # kapaklı boru kanalı, duvara girer
    # alçak panjurlu çit: ön ve iki yan; ön ortada bakım kapısı boşluğu
    H = 1.4
    for (ax, ay, bx, by) in ((0.05, -0.75, 0.05, -3.3), (5.15, -0.75, 5.15, -3.3), (0.05, -3.3, 2.0, -3.3), (3.2, -3.3, 5.15, -3.3)):
        for (px, py) in ((ax, ay), (bx, by)):
            B('hp', 'A_Guard', px - 0.04, py - 0.04, 0.15, px + 0.04, py + 0.04, H + 0.15)
        for k in range(7):
            z = 0.3 + k * 0.18
            if ax == bx:
                B('hp', 'A_Screen', ax - 0.02, min(ay, by), z, ax + 0.02, max(ay, by), z + 0.1)
            else:
                B('hp', 'A_Screen', min(ax, bx), ay - 0.02, z, max(ax, bx), ay + 0.02, z + 0.1)


def build_trees():
    for key, crowns, h in (('tree1', [(0, 0, 4.4, 2.4), (0.8, 0.5, 5.6, 1.7), (-0.7, -0.3, 5.2, 1.6)], 3.0),
                           ('tree2', [(0, 0, 3.6, 1.8), (0.4, -0.4, 4.6, 1.3)], 2.3),
                           ('tree3', [(0, 0, 5.2, 1.3), (0, 0, 6.6, 1.0), (0, 0, 7.7, 0.65)], 4.2)):
        kbegin(key, width=10)
        kadd(cyl((0, 0, 0), (0, 0, h), 0.14), 'ctx', 'A_Trunk')
        for i, (x, y, z, r) in enumerate(crowns):
            m = RG.Mesh.CreateIcoSphere(RG.Sphere(RG.Point3d(x, y, z), r), 1)
            m.Scale(1.0)
            if key == 'tree3':
                m.Transform(RG.Transform.Scale(RG.Plane(RG.Point3d(x, y, z), RG.Vector3d.ZAxis), 1, 1, 1.25))
            kadd(m, 'ctx', 'A_Leaf' if i % 2 == 0 else 'A_Leaf2')


def build_flag():
    """Ana modeldeki gönder ve bayrak, direk tabanı orijine taşınarak kopyalanır."""
    kbegin('flag', width=8)
    names = ('Flag_', 'Flagpole_10m_')
    base = RG.Point3d(-10.0, -34.85, 0.0)
    for o in list(doc.Objects):
        if not (o.Name or '').startswith(names):
            continue
        if doc.Layers[o.Attributes.LayerIndex].FullPath != 'SCHOOL_YARD::Flag_Ataturk':
            continue
        g = o.Geometry.Duplicate()
        g.Transform(RG.Transform.Translation(-base.X, -base.Y, 0))
        g.Transform(RG.Transform.Translation(RG.Vector3d(_ORG['flag'])))
        a = o.Attributes.Duplicate()
        mat = _objmat(o)
        a.LayerIndex = layer('ARCH::flag::ctx::%s' % _mname(mat))
        doc.Objects.Add(g, a)


# ---------------------------------------------------------------- çatılar
def _wing_solid(x0, y0, x1, y1, axis, hs, he, zb, ze, slope):
    """Kırma/beşik kanat katısı: taban zb, saçak ze, mahya ze + w/2*eğim."""
    if axis == 'y':        # x<->y çevir, sonra geri döndür
        pts = _wing_pts(y0, x0, y1, x1, hs, he, zb, ze, slope)
        pts = [(p[1], p[0], p[2]) for p in pts]
        flip = True
    else:
        pts = _wing_pts(x0, y0, x1, y1, hs, he, zb, ze, slope)
        flip = False
    m = RG.Mesh()
    for p in pts:
        m.Vertices.Add(*p)
    # 0-3 taban, 4-7 saçak (x0y0, x1y0, x1y1, x0y1), 8 mahya başı, 9 mahya sonu
    F = [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
         (4, 5, 9, 8), (6, 7, 8, 9), (7, 4, 8), (5, 6, 9)]
    for f in F:
        if flip:
            f = tuple(reversed(f))
        if len(f) == 4:
            m.Faces.AddFace(*f)
        else:
            m.Faces.AddFace(*f)
    m.Normals.ComputeNormals()
    m.Compact()
    b = RG.Brep.CreateFromMesh(m, True)
    b.MergeCoplanarFaces(doc.ModelAbsoluteTolerance)
    if b.SolidOrientation == RG.BrepSolidOrientation.Inward:
        b.Flip()
    return b


def _wing_pts(x0, y0, x1, y1, hs, he, zb, ze, slope):
    w = y1 - y0
    zr = ze + w / 2 * slope
    ym = (y0 + y1) / 2
    rs = x0 + (w / 2 if hs else 0)
    re = x1 - (w / 2 if he else 0)
    return [(x0, y0, zb), (x1, y0, zb), (x1, y1, zb), (x0, y1, zb),
            (x0, y0, ze), (x1, y0, ze), (x1, y1, ze), (x0, y1, ze),
            (rs, ym, zr), (re, ym, zr)]


def _union(solids):
    tol = doc.ModelAbsoluteTolerance
    if len(solids) == 1:
        return solids[0]
    r = RG.Brep.CreateBooleanUnion(solids, tol)
    b = r[0]
    b.MergeCoplanarFaces(tol)
    return b


def _hip_roof(plan, o, zb, ze):
    sol = []
    for (x0, y0, x1, y1, ax, hs, he) in WINGS[plan]:
        if ax == 'x':
            sol.append(_wing_solid(x0 - o, y0 - o, x1 + o, y1 + o, ax, hs, he, zb, ze, SLOPE))
        else:
            sol.append(_wing_solid(x0 - o, y0, x1 + o, y1 + o, ax, hs, he, zb, ze, SLOPE))
    return _union(sol)


def _poly_brep(pts, z0, z1):
    pl = RG.Polyline([RG.Point3d(x, y, z0) for x, y in pts] + [RG.Point3d(pts[0][0], pts[0][1], z0)])
    crv = pl.ToNurbsCurve()
    return RG.Extrusion.Create(crv, z1 - z0, True).ToBrep() if z1 > z0 else None


def _inset(pts, d):
    """Dik açılı CCW çokgeni içe kaydırır."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        a = (p1[0] - p0[0], p1[1] - p0[1])
        b = (p2[0] - p1[0], p2[1] - p1[1])
        la, lb = math.hypot(*a), math.hypot(*b)
        na = (-a[1] / la, a[0] / la)      # CCW için iç normal
        nb = (-b[1] / lb, b[0] / lb)
        # iki kaydırılmış doğrunun kesişimi
        P = (p1[0] + na[0] * d, p1[1] + na[1] * d)
        Q = (p1[0] + nb[0] * d, p1[1] + nb[1] * d)
        da, db = (a[0] / la, a[1] / la), (b[0] / lb, b[1] / lb)
        den = da[0] * db[1] - da[1] * db[0]
        if abs(den) < 1e-9:
            out.append(P)
            continue
        t = ((Q[0] - P[0]) * db[1] - (Q[1] - P[1]) * db[0]) / den
        out.append((P[0] + da[0] * t, P[1] + da[1] * t))
    return out


def _pip(x, y, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            c = not c
        j = i
    return c


def _seg_dist(px, py, poly):
    best = 1e9
    for i in range(len(poly)):
        ax, ay = poly[i]
        bx, by = poly[(i + 1) % len(poly)]
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy
        t = 0 if L2 == 0 else max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / L2))
        best = min(best, math.hypot(px - ax - vx * t, py - ay - vy * t))
    return best


def _pv_panel(grp, plane, w, h):
    """Düzlem orijini panel sol-alt köşesi; x genişlik, y yükseklik, z panel normali."""
    T = RG.Transform.PlaneToPlane(RG.Plane.WorldXY, plane)
    kadd(box(0, 0, 0, w, h, 0.04), grp, 'A_PVFrame', T)
    kadd(box(0.025, 0.025, 0.04, w - 0.025, h - 0.025, 0.046), grp, 'A_PVCell', T)


SOUTH = {'ns': (0.0, 1.0), 'ew': (1.0, 0.0)}        # bina yerel ekseninde dünya güneyi (ns: 180°, ew: -90° döndürülür)


def _pv_flat(plan, orient, zbase):
    grp = 'pvFlat_' + orient
    poly = FOOT[plan]
    sx, sy = SOUTH[orient]
    ux, uy = -sy, sx                          # sıra doğrultusu
    tilt = math.radians(15)
    pw, ph = 1.72, 1.13
    depth = ph * math.cos(tilt)
    pitch = 2.25
    st = STAIR[plan]
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    # (u, s) ızgarası; s = kuzeye doğru (-güney)
    def to_xy(u, s):
        return (u * ux - s * sx, u * uy - s * sy)
    corners = [(x * ux + y * uy, -(x * sx + y * sy)) for x in (min(xs), max(xs)) for y in (min(ys), max(ys))]
    u0, u1 = min(c[0] for c in corners), max(c[0] for c in corners)
    s0, s1 = min(c[1] for c in corners), max(c[1] for c in corners)
    n = 0
    s = s0 + 1.3
    while s + depth < s1 - 1.0:
        u = u0 + 1.3
        while u + pw < u1 - 1.0:
            ok = True
            for (a, b) in ((u, s), (u + pw, s), (u, s + depth), (u + pw, s + depth)):
                x, y = to_xy(a, b)
                if not _pip(x, y, poly) or _seg_dist(x, y, poly) < 1.1:
                    ok = False
                    break
                if st[0] - 0.9 < x < st[2] + 0.9 and st[1] - 0.9 < y < st[3] + 0.9:
                    ok = False
                    break
            if ok:
                ox, oy = to_xy(u, s)
                xa = RG.Vector3d(ux, uy, 0)
                ya = RG.Vector3d(-sx * math.cos(tilt), -sy * math.cos(tilt), math.sin(tilt))
                pl = RG.Plane(RG.Point3d(ox, oy, zbase + 0.38), xa, ya)
                _pv_panel(grp, pl, pw, ph)
                for fu in (0.18, pw - 0.22):
                    fx, fy = to_xy(u + fu, s + 0.05)
                    B(grp, 'A_PVFrame', fx, fy, zbase + 0.16, fx + 0.04 * ux + 0.04 * (-sx) + 0.0001,
                      fy + 0.04 * uy + 0.04 * (-sy) + 0.0001, zbase + 0.4)
                    bx, by = to_xy(u + fu, s + depth - 0.08)
                    B(grp, 'A_PVFrame', bx, by, zbase + 0.16, bx + 0.04 * ux + 0.04 * (-sx) + 0.0001,
                      by + 0.04 * uy + 0.04 * (-sy) + 0.0001, zbase + 0.38 + ph * math.sin(tilt))
                n += 1
            u += pw + 0.03
        s += pitch
    return n


def _pv_pitched(plan, orient, roof, chim):
    grp = 'pvPitch_' + orient
    S = RG.Vector3d(SOUTH[orient][0], SOUTH[orient][1], 0)
    faces = []
    for f in roof.Faces:
        ok, pl = f.TryGetPlane(0.01)
        if not ok:
            continue
        nrm = pl.Normal
        if f.OrientationIsReversed:
            nrm = -nrm
        if nrm.Z < 0.3 or nrm.Z > 0.99:
            continue
        nh = RG.Vector3d(nrm.X, nrm.Y, 0)
        nh.Unitize()
        dot = nh * S
        amp = RG.AreaMassProperties.Compute(f.DuplicateFace(False))
        faces.append((dot, amp.Area if amp else 0, f, nrm))
    use = [x for x in faces if x[0] > -0.5]          # güney, doğu ve batı yüzleri; kuzey boş kalır
    pw, ph = 1.13, 1.72
    n = 0
    for dot, area, f, nrm in use:
        u = RG.Vector3d.CrossProduct(RG.Vector3d.ZAxis, nrm)
        u.Unitize()
        v = RG.Vector3d.CrossProduct(nrm, u)
        v.Unitize()
        # birleşik (L biçimli) yüzlerin sınırı çok parçalı eğri olur; köşe noktalarını kenar parçalarından al
        segs = f.OuterLoop.To3dCurve().DuplicateSegments() or []
        pline = [sg.PointAtStart for sg in segs]
        if len(pline) < 3:
            continue
        p0 = pline[0]
        poly2 = [((p - p0) * u, (p - p0) * v) for p in pline]
        us = [p[0] for p in poly2]
        vs = [p[1] for p in poly2]
        vv = min(vs) + 0.55
        while vv + ph < max(vs) - 0.45:
            uu = min(us) + 0.5
            while uu + pw < max(us) - 0.5:
                good = True
                for (a, b) in ((uu, vv), (uu + pw, vv), (uu, vv + ph), (uu + pw, vv + ph)):
                    if not _pip(a, b, poly2) or _seg_dist(a, b, poly2) < 0.45:
                        good = False
                        break
                    P = p0 + u * a + v * b
                    for (cx0, cy0, cx1, cy1) in chim:
                        if cx0 - 0.5 < P.X < cx1 + 0.5 and cy0 - 0.5 < P.Y < cy1 + 0.5:
                            good = False
                    if not good:
                        break
                if good:
                    org = p0 + u * uu + v * vv + nrm * 0.1
                    _pv_panel(grp, RG.Plane(org, u, v), pw, ph)
                    n += 1
                uu += pw + 0.025
            vv += ph + 0.04
    return n


def build_roof(plan):
    key = 'roof_' + plan
    kbegin(key, row='roof', width=80)
    poly = FOOT[plan]
    res = {}
    # --- düz çatı (z=0 = bina üst kotu = döşeme üstü)
    kadd(_poly_brep(poly, -0.3, 0.0), 'rfFlat', 'A_Membrane')
    st = STAIR[plan]
    B('rfFlat', 'A_Render', st[0], st[1], 0, st[2], st[3], 2.7)
    B('rfFlat', 'A_Coping', st[0] - 0.1, st[1] - 0.1, 2.7, st[2] + 0.1, st[3] + 0.1, 2.85)
    B('rfFlat', 'A_Door', st[2] - 0.0, st[1] + 1.6, 0.05, st[2] + 0.04, st[1] + 2.6, 2.15)
    kadd(_poly_brep(_inset(poly, WT), 0.0, 0.16), 'insFlat', 'A_InsRoof')
    res['pvFlat_ns'] = _pv_flat(plan, 'ns', 0.0)
    res['pvFlat_ew'] = _pv_flat(plan, 'ew', 0.0)
    # --- kırma çatı (z=0 saçak hattı, z=-FASCIA alın altı)
    roof = _hip_roof(plan, OVH, -FASCIA, 0.0)
    for f in roof.Faces:
        ok, pl = f.TryGetPlane(0.01)
        nrm = pl.Normal if ok else RG.Vector3d.ZAxis
        if f.OrientationIsReversed:
            nrm = -nrm
        mat = 'A_Soffit' if nrm.Z < -0.9 else ('A_Fascia' if abs(nrm.Z) < 0.1 else 'A_Tile')
        kadd(f.DuplicateFace(False), 'rfPitch', mat)
    # baca: ana kanat mahyasının biraz gerisinde
    x0, y0, x1, y1 = WINGS[plan][0][:4]
    zr = (y1 - y0 + 2 * OVH) / 2 * SLOPE
    chim = []
    for fx in (0.3, 0.72):
        cx = x0 + (x1 - x0) * fx
        c = (cx - 0.35, y0 + 8.4, cx + 0.35, y0 + 9.3)
        chim.append(c)
        B('rfPitch', 'A_Chimney', c[0], c[1], 0, c[2], c[3], zr + 0.9)
        B('rfPitch', 'A_Coping', c[0] - 0.06, c[1] - 0.06, zr + 0.9, c[2] + 0.06, c[3] + 0.06, zr + 1.0)
    # çatı yalıtımı: kiremidin 15 cm altında, duvar hattında biten kabuk
    e = OVH * SLOPE - 0.15
    sol = []
    for (a0, b0, a1, b1, ax, hs, he) in WINGS[plan]:
        sol.append(_wing_solid(a0, b0, a1, b1, ax, hs, he, -FASCIA + 0.01, e, SLOPE))
    ins = _union(sol)
    for f in ins.Faces:
        kadd(f.DuplicateFace(False), 'insPitch', 'A_InsRoof')
    res['pvPitch_ns'] = _pv_pitched(plan, 'ns', roof, chim)
    res['pvPitch_ew'] = _pv_pitched(plan, 'ew', roof, chim)
    return res


def build_kit():
    _clear()
    for wwr in WWR:
        for kind in 'gu':
            kbegin('bay_%s_%s' % (wwr, kind))
            build_bay(wwr, kind)
    for kind in 'gu':
        kbegin('pil_' + kind, width=4)
        build_pilaster(kind)
        kbegin('cor_' + kind, width=4)
        build_corner(kind)
    build_tops()
    build_entrance()
    build_heatpump()
    build_trees()
    build_flag()
    info = {}
    for plan in FOOT:
        info[plan] = build_roof(plan)
    doc.Views.Redraw()
    return info


def rebuild(keys):
    """Yalnızca verilen modülleri yeniden kurar (ör. ['hp', 'roof_I']); diğerlerine dokunmaz."""
    _layout()
    for k in keys:
        root = 'ARCH::' + k + '::'
        ids = [o.Id for o in doc.Objects if doc.Layers[o.Attributes.LayerIndex].FullPath.startswith(root)]
        for i in ids:
            doc.Objects.Delete(i, True)
    _REBUILD[0] = True
    out = {}
    try:
        for k in keys:
            if k == 'hp':
                build_heatpump()
            elif k.startswith('roof_'):
                out[k] = build_roof(k[5:])
            elif k in ('par', 'parc', 'cnc', 'cncc'):
                build_tops()
            elif k.startswith('bay_'):
                _, w, kind = k.split('_')
                kbegin(k)
                build_bay(w, kind)
    finally:
        _REBUILD[0] = False
    doc.Views.Redraw()
    return out


# ---------------------------------------------------------------- export
def _layout():
    """build_kit() ile aynı sırada modül orijinlerini yeniden kurar (yalnızca export için)."""
    _ORG.clear()
    _ROW['kit'][0] = 0.0
    _ROW['roof'][0] = 0.0
    keys = [('bay_%s_%s' % (w, k), 'kit', 12.0) for w in WWR for k in 'gu']
    for k in 'gu':
        keys += [('pil_' + k, 'kit', 4), ('cor_' + k, 'kit', 4)]
    keys += [(k, 'kit', 12.0) for k in ('par', 'parc', 'cnc', 'cncc')]
    keys += [('ent', 'kit', 16), ('hp', 'kit', 14), ('tree1', 'kit', 10), ('tree2', 'kit', 10),
             ('tree3', 'kit', 10), ('flag', 'kit', 8)]
    keys += [('roof_' + p, 'roof', 80) for p in FOOT]
    for k, r, w in keys:
        kbegin(k, r, w)


def export_kit():
    if not _ORG:
        _layout()
    out_dir = OUT
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)
    mp = RG.MeshingParameters.QualityRenderMesh
    acc = collections.defaultdict(list)
    mats = {}
    cache = {}
    for o in doc.Objects:
        path = doc.Layers[o.Attributes.LayerIndex].FullPath
        parts = path.split('::')
        if parts[0] != 'ARCH' or len(parts) < 4:
            continue
        key, grp = parts[1], parts[2]
        org = _ORG.get(key)
        if org is None:
            continue
        mat = _objmat(o)
        name = _mname(mat)
        mats.setdefault(name, mat)
        m = mesh_of(o, mp)
        if m is None:
            continue
        d = m.DuplicateMesh()
        d.Transform(RG.Transform.Translation(-org.X, -org.Y, -org.Z))
        acc[('%s__%s' % (key, grp), name)].append(d)
    ok, tris = write_glb(acc, os.path.join(out_dir, "kit.glb"))
    meta = {
        'bay': BAY, 'fh': FH, 'band': BAND, 'wt': WT, 'fascia': FASCIA, 'entBays': ENT_BAYS,
        'foot': FOOT, 'wwr': WWR,
        'materials': {n: mat_entry(m) for n, m in mats.items()},
    }
    json.dump(meta, open(os.path.join(out_dir, 'kit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    return ok, tris, len(acc)
