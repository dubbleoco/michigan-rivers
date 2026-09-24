export interface River {
  id: string;
  name: string;
  state: string;
  location: string;
  siteId: string;
  idealMin: number;       // ideal CFS low
  idealMax: number;       // ideal CFS high
  idealGaugeFtMin: number; // ideal gauge height low (ft)
  idealGaugeFtMax: number; // ideal gauge height high (ft)
  species: string[];      // target species
  coords: [number, number]; // [lat, lon]
  mouthCoords?: [number, number];
  description?: string;
}

export const RIVERS: River[] = [
  // ── West Michigan ────────────────────────────────────────────────
  {
    id: "muskegon",
    name: "Muskegon River",
    state: "MI",
    location: "Newaygo, MI",
    siteId: "04121970",  // MUSKEGON RIVER NEAR CROTON, MI
    idealMin: 600,
    idealMax: 2500,
    idealGaugeFtMin: 2.5,
    idealGaugeFtMax: 6.5,
    species: ["chinook", "coho", "steelhead", "pink"],
    coords: [43.55, -85.62],
    description: "Premier Michigan salmon and steelhead river below Croton Dam",
  },
  {
    id: "rogue",
    name: "Rogue River",
    state: "MI",
    location: "Rockford, MI",
    siteId: "04118500",  // ROGUE RIVER NEAR ROCKFORD, MI
    idealMin: 80,
    idealMax: 500,
    idealGaugeFtMin: 1.0,
    idealGaugeFtMax: 4.0,
    species: ["steelhead", "salmon"],
    coords: [43.12, -85.56],
    description: "Urban steelhead river, Muskegon tributary through Rockford",
  },
  {
    id: "whiterivier",
    name: "White River",
    state: "MI",
    location: "Whitehall, MI",
    siteId: "04122200",  // WHITE RIVER NEAR WHITEHALL, MI
    idealMin: 100,
    idealMax: 600,
    idealGaugeFtMin: 1.5,
    idealGaugeFtMax: 4.5,
    species: ["chinook", "coho", "steelhead"],
    coords: [43.65, -86.09],
    description: "Productive west Michigan salmon and steelhead stream",
  },
  {
    id: "pere-marquette",
    name: "Pere Marquette River",
    state: "MI",
    location: "Scottville, MI",
    siteId: "04122500",  // PERE MARQUETTE RIVER AT SCOTTVILLE, MI
    idealMin: 150,
    idealMax: 700,
    idealGaugeFtMin: 1.5,
    idealGaugeFtMax: 4.5,
    species: ["chinook", "coho", "steelhead", "brown trout"],
    coords: [43.96, -86.28],
    description: "Michigan's most famous steelhead and salmon river",
  },
  {
    id: "little-manistee",
    name: "Little Manistee River",
    state: "MI",
    location: "Freesoil, MI",
    siteId: "04126195",  // L MANISTEE R AT NINE MILE BRIDGE NR FREESOIL, MI
    idealMin: 60,
    idealMax: 350,
    idealGaugeFtMin: 1.0,
    idealGaugeFtMax: 3.5,
    species: ["chinook", "coho", "steelhead"],
    coords: [44.07, -86.02],
    description: "Wild fish factory, major state steelhead egg-take site",
  },
  {
    id: "manistee",
    name: "Manistee River",
    state: "MI",
    location: "Wellston, MI",
    siteId: "04125550",  // MANISTEE RIVER NEAR WELLSTON, MI
    idealMin: 400,
    idealMax: 2000,
    idealGaugeFtMin: 2.0,
    idealGaugeFtMax: 6.0,
    species: ["chinook", "coho", "steelhead"],
    coords: [44.27, -85.98],
    description: "Major northern Michigan river with strong salmon and steelhead runs",
  },
  {
    id: "platte",
    name: "Platte River",
    state: "MI",
    location: "Honor, MI",
    siteId: "04126740",  // PLATTE RIVER AT HONOR, MI
    idealMin: 60,
    idealMax: 300,
    idealGaugeFtMin: 0.8,
    idealGaugeFtMax: 2.8,
    species: ["chinook", "coho", "pink", "steelhead"],
    coords: [44.66, -86.02],
    description: "Iconic salmon river, legendary fall dipping season",
  },
  {
    id: "boardman",
    name: "Boardman River",
    state: "MI",
    location: "Traverse City, MI",
    siteId: "04126970",  // BOARDMAN R ABOVE BROWN BRIDGE ROAD NR MAYFIELD, MI
    idealMin: 80,
    idealMax: 450,
    idealGaugeFtMin: 1.0,
    idealGaugeFtMax: 4.0,
    species: ["chinook", "coho", "steelhead", "brown trout"],
    coords: [44.68, -85.53],
    description: "Restored river through Traverse City, improving salmon runs after dam removal",
  },
  {
    id: "jordan",
    name: "Jordan River",
    state: "MI",
    location: "East Jordan, MI",
    siteId: "04127800",  // JORDAN RIVER NEAR EAST JORDAN, MI
    idealMin: 80,
    idealMax: 400,
    idealGaugeFtMin: 1.0,
    idealGaugeFtMax: 3.5,
    species: ["steelhead", "coho"],
    coords: [45.16, -85.12],
    description: "Michigan's first wild and scenic river, excellent steelhead",
  },
];

export const RIVER_BY_SITE_ID: Record<string, River> = Object.fromEntries(
  RIVERS.map((r) => [r.siteId, r])
);
