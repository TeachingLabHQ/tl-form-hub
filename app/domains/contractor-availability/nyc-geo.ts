// NYC community school district boundaries (DCP "School Districts", NYC Open
// Data 8ugf-3d8u, simplified to 4% with mapshaper), and the point lookups the
// roster uses to place contractors without sending their address anywhere.
import { geoContains, geoDistance } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryObject, Topology } from "topojson-specification";
import type { Borough, NycHome } from "./model";
import { BOROUGHS, boroughOf } from "./nyc";
import topology from "./nyc-districts.topo.json";

export type DistrictFeature = Feature<Polygon | MultiPolygon, { district: number }>;

const topo = topology as unknown as Topology;
export const NYC_DISTRICTS = feature(topo, topo.objects.districts!) as unknown as FeatureCollection<
  Polygon | MultiPolygon,
  { district: number }
>;

const districtOf = (g: GeometryObject) => (g.properties as { district: number }).district;

// Shared edges between districts in different boroughs, for the map to draw heavier
export const BOROUGH_LINES = mesh(
  topo,
  topo.objects.districts as GeometryObject,
  (a, b) => a !== b && boroughOf(districtOf(a)) !== boroughOf(districtOf(b))
);

/** The community school district containing the point, or null outside the five boroughs. */
export function districtAt(lat: number, lng: number): number | null {
  const hit = NYC_DISTRICTS.features.find((f) => geoContains(f, [lng, lat]));
  return hit?.properties.district ?? null;
}

// Contractors living within this distance of Midtown (Newark, Jersey City,
// Yonkers, Mt Vernon...) commute in, so they count as NYC contractors too
export const NEARBY_KM = 30;
const MIDTOWN: [number, number] = [-73.9855, 40.758];
const EARTH_KM = 6371;

const BOROUGH_BY_CITY: Record<string, Borough> = {
  manhattan: "Manhattan",
  "new york": "Manhattan",
  "new york city": "Manhattan",
  nyc: "Manhattan",
  bronx: "Bronx",
  "the bronx": "Bronx",
  brooklyn: "Brooklyn",
  queens: "Queens",
  "staten island": "Staten Island",
};

/**
 * Where an NYC-area contractor lives, from their home coordinates; falls back
 * to the city name when the address has none. null when they aren't nearby.
 */
export function nycHome(home: { lat: number; lng: number } | null, city: string, state: string): NycHome | null {
  if (home) {
    const district = districtAt(home.lat, home.lng);
    if (district) return { district, borough: boroughOf(district) };
    const km = geoDistance([home.lng, home.lat], MIDTOWN) * EARTH_KM;
    return km <= NEARBY_KM ? { district: null, borough: null } : null;
  }
  if (state !== "NY") return null;
  const name = city.trim().toLowerCase();
  const borough = BOROUGH_BY_CITY[name] ?? BOROUGHS.find((b) => b.toLowerCase() === name) ?? null;
  return borough ? { district: null, borough } : null;
}
