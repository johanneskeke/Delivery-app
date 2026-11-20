/**
 * Data format v1 written by probelauf/export_app.py (docs/01 "Build plan" P3, docs/06 section 4a).
 * The app only reads these results; it does not calculate.
 */

export type LatLon = [number, number];
export type LatLng = { lat: number; lng: number };

export type PlanMode = 'before' | 'only_necessary' | 'replan_full';
export type ProposedMode = Exclude<PlanMode, 'before'>;

export type Meta = {
  schema_version: number;
  generated_at: string;
  engine: string;
  tour_date: string;
  departure: string;
  start_mode: ProposedMode;
  synthetic: boolean;
  synthetic_label: string;
  data_as_of: Record<string, string>;
  attributions: string[];
  assumptions: string[];
  weather: {
    source: string;
    fetched: string;
    summary: string;
    surcharge: string;
    note: string | null;
    hours: { hour: string; condition: string; precip_mm: number; precip_prob: number; temp_c: number; gust_kmh: number }[];
  };
  not_yet_included: string[];
  files: string[];
};

export type TourHeader = {
  tour_id: string;
  date: string;
  district: string;
  depot: string;
  vehicle: string;
  shift_start: string;
  planned_departure: string;
  origin: string;
  carrier: string;
};

/** Field values stay German, as on the tour list (e.g. product "Paket", service "Wunschnachbar"). */
export type Shipment = {
  id: string;
  stop_no: number;
  recipient: string;
  street: string;
  house_no: string;
  address_extra: string;
  postcode: string;
  city: string;
  product: string;
  service: string;
  window_from: string | null;
  window_to: string | null;
  weight_kg: number;
  note: string;
};

export type StopFlags = {
  bulky: boolean;
  pickup: boolean;
  id_check: boolean;
  age_check: boolean;
  priority: string | null;
  preferred_neighbour: boolean;
  preferred_dropoff: boolean;
};

export type Window = { from: string | null; until: string | null } | null;

export type TourStop = {
  no: number;
  address: string;
  door: LatLon;
  recipient: string;
  shipment_ids: string[];
  window: Window;
  flags: StopFlags;
  geocoding: string;
};

export type Tour = { schema_version: number; header: TourHeader; shipments: Shipment[]; stops: TourStop[] };

export type ImportNote = {
  kind: 'street_fixed' | 'postcode_missing' | 'postcode_wrong' | 'house_no_cleaned' | 'house_no_not_found' | 'other';
  shipment_id: string | null;
  stop_no: number;
  original: string;
  used: string | null;
  text: string;
  source: string;
  deliberate_test_error: boolean;
};

export type ImportData = { schema_version: number; notes: ImportNote[]; missing: string[] };

export type Closure = {
  id: string;
  kind: 'full' | 'one_direction' | 'note';
  street: string;
  section: string;
  text: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source: string;
  lines: LatLon[][];
};

export type MapData = {
  schema_version: number;
  depot: { name: string; address: string };
  start_point: { name: string; latlon: LatLon; note: string };
  closures: Closure[];
};

export type Source = { name: string; ref: string };

export type PlanStop = {
  no: number;
  address: string;
  door: LatLon;
  eta: string;
  walk_m: number;
  window: Window;
  shipment_ids: string[];
  flags: StopFlags;
  notes: { text: string; source: string }[];
};

export type Halt = {
  id: string;
  seq: number;
  arrival: string;
  leave: string;
  parking: { kind: 'loading_zone' | 'kerbside'; street: string; latlon: LatLon; valid: string | null; search_min: number };
  stops: PlanStop[];
  warnings: { kind: string; text: string; source: string }[];
  conflicts: { kind: string; text: string; source: string }[];
  drive_path: LatLon[];
  drive_min: number;
};

export type Change = {
  id: string;
  kind: string;
  halt_id: string | null;
  stop_nos: number[];
  title: string;
  detail: string;
  source: Source;
  rejectable: boolean;
  not_rejectable_reason: string | null;
  /** Not yet computed in v1 (build step Mon 2026-11-23). */
  if_rejected: unknown | null;
};

export type SlotInfo = { slot: string; halt_id: string; reason: string; pickup?: boolean };

export type Kpis = {
  halts: number;
  drive_min: number;
  walk_min: number;
  wait_min: number;
  late_min: number;
  late_stops: number;
  early_stops: number;
  back_at_depot: string;
  conflicts: number;
};

export type Plan = {
  schema_version: number;
  mode: PlanMode;
  kpis: Kpis;
  halts: Halt[];
  return_path: LatLon[];
  changes: Change[];
  slots: Record<string, SlotInfo>;
};
