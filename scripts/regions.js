/**
 * 地域プリセット（外接矩形）。
 * 緯度経度はおおよその目安。実運用では各区の実際の境界に合わせて微調整してよい。
 * step を小さくすれば取りこぼしが減る（その分コスト増）。
 */

// さいたま市 10区
export const SAITAMA_WARDS = {
  nishi: { label: '西区', south: 35.91, north: 35.97, west: 139.55, east: 139.61 },
  kita: { label: '北区', south: 35.92, north: 35.97, west: 139.59, east: 139.64 },
  omiya: { label: '大宮区', south: 35.89, north: 35.94, west: 139.61, east: 139.65 },
  minuma: { label: '見沼区', south: 35.91, north: 35.98, west: 139.63, east: 139.70 },
  chuo: { label: '中央区', south: 35.86, north: 35.90, west: 139.61, east: 139.65 },
  sakura: { label: '桜区', south: 35.83, north: 35.88, west: 139.57, east: 139.63 },
  urawa: { label: '浦和区', south: 35.84, north: 35.89, west: 139.63, east: 139.67 },
  minami: { label: '南区', south: 35.82, north: 35.86, west: 139.62, east: 139.67 },
  midori: { label: '緑区', south: 35.82, north: 35.90, west: 139.66, east: 139.72 },
  iwatsuki: { label: '岩槻区', south: 35.91, north: 36.00, west: 139.67, east: 139.75 }
};

// さいたま市全域（既定）
export const SAITAMA_CITY = {
  label: 'さいたま市全域',
  south: 35.82,
  west: 139.55,
  north: 35.99,
  east: 139.73
};

export const REGION_PRESETS = {
  saitama: SAITAMA_CITY,
  ...SAITAMA_WARDS
};

export function resolveRegion(key) {
  return REGION_PRESETS[key] || null;
}

export function listRegions() {
  return Object.entries(REGION_PRESETS).map(([key, r]) => ({ key, label: r.label }));
}
