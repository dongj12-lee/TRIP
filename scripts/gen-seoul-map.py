# Regenerates data/seoulDistricts.ts from the official Seoul district GeoJSON.
# Source: southkorea/seoul-maps (KOSTAT 2013), saved as seoul-districts-geo.json.
#   python3 scripts/gen-seoul-map.py
import json, math, os

HERE = os.path.dirname(__file__)
d = json.load(open(os.path.join(HERE, 'seoul-districts-geo.json')))
feats = d['features']

all_lng, all_lat = [], []
for f in feats:
    g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'Polygon' else [r for poly in g['coordinates'] for r in poly]
    for ring in polys:
        for lng, lat in ring:
            all_lng.append(lng); all_lat.append(lat)

minLng, maxLng = min(all_lng), max(all_lng)
minLat, maxLat = min(all_lat), max(all_lat)
kx = math.cos(math.radians((minLat + maxLat) / 2))
W = 100.0
projW = (maxLng - minLng) * kx
H = W * (maxLat - minLat) / projW

def px(lng): return (lng - minLng) * kx / projW * W
def py(lat): return (maxLat - lat) / (maxLat - minLat) * H

def ring_path(ring):
    pts = [f"{px(a):.2f},{py(b):.2f}" for a, b in ring]
    out = [pts[0]]
    for p in pts[1:]:
        if p != out[-1]: out.append(p)
    return "M" + "L".join(out) + "Z"

def centroid(ring):
    xs = [px(a) for a, b in ring]; ys = [py(b) for a, b in ring]; n = len(ring)
    A = cx = cy = 0
    for i in range(n - 1):
        cr = xs[i]*ys[i+1] - xs[i+1]*ys[i]
        A += cr; cx += (xs[i]+xs[i+1])*cr; cy += (ys[i]+ys[i+1])*cr
    if abs(A) < 1e-9: return sum(xs)/n, sum(ys)/n
    A *= 0.5; return cx/(6*A), cy/(6*A)

districts = []
for f in feats:
    p = f['properties']; g = f['geometry']
    if g['type'] == 'Polygon':
        rings = g['coordinates']; outer = max(rings, key=len)
        path = "".join(ring_path(r) for r in rings)
    else:
        biggest = max(g['coordinates'], key=lambda poly: len(poly[0])); outer = biggest[0]
        path = "".join(ring_path(r) for poly in g['coordinates'] for r in poly)
    cx, cy = centroid(outer)
    districts.append({'name': p['name_eng'], 'nameKo': p['name'], 'path': path, 'cx': round(cx, 1), 'cy': round(cy, 1)})

districts.sort(key=lambda x: (x['cy'], x['cx']))
L = ['// AUTO-GENERATED from the official Seoul 25-district (자치구) boundary GeoJSON',
     '// (southkorea/seoul-maps, KOSTAT 2013). Equirectangular projection scaled',
     '// by cos(lat) so the real Seoul silhouette is undistorted. Do not hand-edit;',
     '// regenerate via scripts/gen-seoul-map.py if the source changes.', '',
     'export type SeoulDistrict = { name: string; nameKo: string; path: string; cx: number; cy: number };', '',
     f'export const SEOUL_MAP_W = {round(W,1)};', f'export const SEOUL_MAP_H = {round(H,1)};', '',
     'export const SEOUL_DISTRICTS: SeoulDistrict[] = [']
for x in districts:
    L.append("  { name: %s, nameKo: %s, cx: %s, cy: %s, path: %s }," % (
        json.dumps(x['name']), json.dumps(x['nameKo'], ensure_ascii=False), x['cx'], x['cy'], json.dumps(x['path'])))
L.append('];'); L.append('')
open(os.path.join(HERE, '..', 'data', 'seoulDistricts.ts'), 'w').write("\n".join(L))
print("wrote data/seoulDistricts.ts —", len(districts), "districts, viewBox 100 x", round(H,1))
