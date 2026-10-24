import { geoBounds, geoDistance } from "d3-geo";
import { describe, expect, it } from "vitest";
import { DISTRICT_NEIGHBORS } from "./nyc";
import { NYC_DISTRICTS, districtAt, nycHome } from "./nyc-geo";

describe("districtAt", () => {
  it("finds the district a point sits in", () => {
    expect(districtAt(40.7484, -73.9857)).toBe(2); // Empire State Building
    expect(districtAt(40.8296, -73.9262)).toBe(9); // Yankee Stadium
    expect(districtAt(40.6602, -73.969)).toBe(17); // Prospect Park, east side
    expect(districtAt(40.7769, -73.874)).toBe(30); // LaGuardia
    expect(districtAt(40.5795, -74.1502)).toBe(31); // Staten Island
  });

  it("is null outside the five boroughs", () => {
    expect(districtAt(40.7357, -74.1724)).toBeNull(); // Newark
    expect(districtAt(34.05, -118.24)).toBeNull(); // Los Angeles
  });
});

describe("nycHome", () => {
  it("places city residents in their district and borough", () => {
    expect(nycHome({ lat: 40.8296, lng: -73.9262 }, "Bronx", "NY")).toEqual({ district: 9, borough: "Bronx" });
  });

  it("counts nearby commuters without a district", () => {
    expect(nycHome({ lat: 40.7357, lng: -74.1724 }, "Newark", "NJ")).toEqual({ district: null, borough: null });
  });

  it("leaves out people who live farther away", () => {
    expect(nycHome({ lat: 42.6526, lng: -73.7562 }, "Albany", "NY")).toBeNull();
    expect(nycHome(null, "Austin", "TX")).toBeNull();
  });

  it("falls back to the city name when there are no coordinates", () => {
    expect(nycHome(null, "Brooklyn", "NY")).toEqual({ district: null, borough: "Brooklyn" });
    expect(nycHome(null, "Brooklyn", "MI")).toBeNull();
  });
});

describe("DISTRICT_NEIGHBORS", () => {
  it("lists the districts whose boundary comes within 1 km", () => {
    const shapes = NYC_DISTRICTS.features.map((f) => ({
      district: f.properties.district,
      points: (f.geometry.type === "Polygon" ? f.geometry.coordinates.flat() : f.geometry.coordinates.flat(2)) as [
        number,
        number,
      ][],
      bounds: geoBounds(f),
    }));
    // A 0.02° margin (over 1 km at this latitude) skips pairs that can't be close
    const near = (a: (typeof shapes)[number], b: (typeof shapes)[number]) => {
      const [[aw, as], [ae, an]] = a.bounds;
      const [[bw, bs], [be, bn]] = b.bounds;
      if (aw > be + 0.02 || bw > ae + 0.02 || as > bn + 0.02 || bs > an + 0.02) return false;
      return a.points.some((p) => b.points.some((q) => geoDistance(p, q) * 6371 <= 1));
    };
    const measured = Object.fromEntries(
      shapes
        .sort((a, b) => a.district - b.district)
        .map((a) => [a.district, shapes.filter((b) => b !== a && near(a, b)).map((b) => b.district)])
    );
    expect(measured).toEqual(DISTRICT_NEIGHBORS);
  });
});
