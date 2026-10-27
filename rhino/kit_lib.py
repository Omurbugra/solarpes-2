# site-2 Rhino yardımcıları: katman, malzeme, geometri ve glTF yazımı. Ana sitenin betiklerinden bağımsızdır.
# Rhino MCP üzerinden exec ile yüklenir; `doc` global olarak verilmelidir.
import os
import math
import shutil
import Rhino
import System

RG = Rhino.Geometry
DO = Rhino.DocObjects

OUT = r"C:\Users\Synho\Documents\Solarpes\site-2\assets"

# ad: (sRGB hex, opaklık, metalik, pürüzlülük, emisyon) — build_archetypes.py doldurur
MATS = {}


def _col(h):
    h = h.lstrip('#')
    return System.Drawing.Color.FromArgb(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mat_index(name):
    for m in doc.Materials:
        if not m.IsDeleted and m.Name == name:
            return m.Index
    hexc, op, met, rough, em = MATS[name]
    m = DO.Material()
    m.Name = name
    m.DiffuseColor = _col(hexc)
    m.Transparency = 1 - op
    m.Shine = (1 - rough) * DO.Material.MaxShine
    if em:
        m.EmissionColor = _col(hexc)
    return doc.Materials.Add(m)


def layer(path):
    parent = System.Guid.Empty
    idx = -1
    acc = []
    for part in path.split('::'):
        acc.append(part)
        idx = doc.Layers.FindByFullPath('::'.join(acc), -1)
        if idx < 0:
            L = DO.Layer()
            L.Name = part
            L.ParentLayerId = parent
            idx = doc.Layers.Add(L)
        parent = doc.Layers[idx].Id
    return idx


def box(x0, y0, z0, x1, y1, z1):
    return RG.Box(RG.BoundingBox(RG.Point3d(min(x0, x1), min(y0, y1), min(z0, z1)),
                                 RG.Point3d(max(x0, x1), max(y0, y1), max(z0, z1)))).ToBrep()


def cyl(p0, p1, r):
    a = RG.Point3d(*p0)
    v = RG.Point3d(*p1) - a
    return RG.Cylinder(RG.Circle(RG.Plane(a, v), r), v.Length).ToBrep(True, True)


def torus(center, normal, R, r):
    return RG.Torus(RG.Plane(RG.Point3d(*center), RG.Vector3d(*normal)), R, r).ToRevSurface().ToBrep()


# ---------------------------------------------------------------- export
def _objmat(o):
    a = o.Attributes
    src = a.MaterialSource
    idx = a.MaterialIndex if src == DO.ObjectMaterialSource.MaterialFromObject else doc.Layers[a.LayerIndex].RenderMaterialIndex
    if idx >= 0:
        return doc.Materials[idx]
    col = a.ObjectColor if a.ColorSource == DO.ObjectColorSource.ColorFromObject else doc.Layers[a.LayerIndex].Color
    return ("col_%02x%02x%02x" % (col.R, col.G, col.B), col)


def _mname(m):
    return m[0] if isinstance(m, tuple) else (m.Name or ("m%d" % m.Index))


def mesh_of(o, mp):
    g = o.Geometry
    if isinstance(g, RG.Extrusion):
        g = g.ToBrep()
    if isinstance(g, RG.Brep):
        rm = list(RG.Mesh.CreateFromBrep(g, mp) or [])
    elif isinstance(g, RG.Mesh):
        rm = [g]
    else:
        return None
    if not rm:
        return None
    m = RG.Mesh()
    for x in rm:
        m.Append(x)
    if m.TextureCoordinates.Count != m.Vertices.Count:
        m.TextureCoordinates.Clear()
        for _ in range(m.Vertices.Count):
            m.TextureCoordinates.Add(0.0, 0.0)
    return m


def write_glb(acc, path):
    """acc: {(düğüm adı, malzeme): [Mesh]} -> Draco sıkıştırmalı GLB; düğüm adı '<ad>__<malzeme>'."""
    hd = Rhino.RhinoDoc.CreateHeadless(None)
    hd.ModelUnitSystem = Rhino.UnitSystem.Meters
    tris = 0
    for (g, n), lst in acc.items():
        m = RG.Mesh()
        for x in lst:
            m.Append(x)
        if m.Normals.Count != m.Vertices.Count:
            m.Normals.ComputeNormals()
        m.Compact()
        a = DO.ObjectAttributes()
        a.Name = g + "__" + n
        hd.Objects.AddMesh(m, a)
        tris += m.Faces.Count
    opt = Rhino.FileIO.FileGltfWriteOptions()
    opt.UseDracoCompression = True
    opt.DracoCompressionLevel = 10
    opt.DracoQuantizationBitsPosition = 20
    opt.DracoQuantizationBitsNormal = 10
    opt.DracoQuantizationBitsTextureCoordinate = 14
    opt.MapZToY = True
    opt.ExportMaterials = False
    opt.ExportLayers = False
    opt.ExportTextureCoordinates = True
    opt.ExportVertexNormals = True
    opt.CullBackfaces = False
    ok = Rhino.FileIO.FileGltf.Write(path, hd, opt)
    hd.Dispose()
    return ok, tris


def mat_entry(m):
    if isinstance(m, tuple):
        c = m[1]
        return {"c": [round(c.R / 255., 4), round(c.G / 255., 4), round(c.B / 255., 4)], "m": 0, "r": 1, "o": 1}
    if m.Name in MATS:
        h, op, met, rough, em = MATS[m.Name]
        h = h.lstrip('#')
        return {"c": [round(int(h[i:i + 2], 16) / 255., 4) for i in (0, 2, 4)], "m": met, "r": rough, "o": op}
    if m.IsPhysicallyBased:
        pb = m.PhysicallyBased
        c = pb.BaseColor
        e = {"c": [c.R, c.G, c.B], "m": pb.Metallic, "r": pb.Roughness, "o": pb.Opacity}
    else:
        c = m.DiffuseColor
        e = {"c": [c.R / 255., c.G / 255., c.B / 255.], "m": 0, "r": 1 - min(1, m.Shine / 255.), "o": 1 - m.Transparency}
    return {k: ([round(x, 4) for x in v] if isinstance(v, list) else round(v, 4)) for k, v in e.items()}
