// Textile order costing. Every price comes from the user's own price table
// (nothing is assumed); the calculator only multiplies it with what the
// order really uses: roll metres from the nesting, garment count, colours.

export interface PriceTable {
  currency: string;
  /** Fabric price per square metre, by fabric. */
  fabrics: { name: string; perM2: number }[];
  /** Printing price per square metre printed (paper + ink + press), by method. */
  methods: { name: string; perM2: number; setup: number }[];
  /** Per-garment costs: cutting, sewing, labels, packing… */
  perGarment: { name: string; amount: number }[];
  /** Extra cost per spot / logo colour per garment (screen print, vinyl); 0 for sublimation. */
  perColour: number;
  /** Margin on cost (%), tax (%). */
  margin: number;
  tax: number;
  /** Production speed: metres printed per hour, minutes of sewing per garment, workers. */
  metresPerHour: number;
  minutesPerGarment: number;
  workers: number;
}

export const EMPTY_PRICES: PriceTable = {
  currency: 'AED',
  fabrics: [{ name: 'Polyester interlock', perM2: 0 }],
  methods: [{ name: 'Sublimation', perM2: 0, setup: 0 }],
  perGarment: [{ name: 'Cutting & sewing', amount: 0 }],
  perColour: 0, margin: 0, tax: 0, metresPerHour: 0, minutesPerGarment: 0, workers: 1,
};

export interface CostInput { garments: number; rollW: number; rollMm: number; fabric: number; method: number; colours?: number }
export interface CostResult {
  m2: number; fabric: number; print: number; setup: number; garmentCosts: number; colourCosts: number;
  cost: number; price: number; tax: number; total: number; perGarment: number; hours: number | null; missing: string[];
}

export function costOrder(t: PriceTable, i: CostInput): CostResult {
  const m2 = (i.rollW / 1000) * (i.rollMm / 1000);
  const fab = t.fabrics[i.fabric] || t.fabrics[0], met = t.methods[i.method] || t.methods[0];
  const missing: string[] = [];
  if (!fab || !(fab.perM2 > 0)) missing.push('fabric price per m²');
  if (!met || !(met.perM2 > 0)) missing.push('printing price per m²');
  const fabric = m2 * (fab?.perM2 || 0);
  const print = m2 * (met?.perM2 || 0);
  const setup = met?.setup || 0;
  const garmentCosts = i.garments * t.perGarment.reduce((s, x) => s + (x.amount || 0), 0);
  const colourCosts = i.garments * (i.colours || 0) * (t.perColour || 0);
  const cost = fabric + print + setup + garmentCosts + colourCosts;
  const price = cost * (1 + (t.margin || 0) / 100);
  const tax = price * ((t.tax || 0) / 100);
  const total = price + tax;
  const hours = t.metresPerHour > 0 || t.minutesPerGarment > 0
    ? (t.metresPerHour > 0 ? i.rollMm / 1000 / t.metresPerHour : 0) + (i.garments * (t.minutesPerGarment || 0)) / 60 / Math.max(1, t.workers || 1)
    : null;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { m2: r2(m2), fabric: r2(fabric), print: r2(print), setup: r2(setup), garmentCosts: r2(garmentCosts), colourCosts: r2(colourCosts), cost: r2(cost), price: r2(price), tax: r2(tax), total: r2(total), perGarment: i.garments ? r2(total / i.garments) : 0, hours: hours == null ? null : Math.round(hours * 10) / 10, missing };
}

const KEY = 'mt-textile-prices';
export function loadPrices(): PriceTable {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && Array.isArray(v.fabrics)) return { ...EMPTY_PRICES, ...v }; } catch { /* ignore */ }
  return EMPTY_PRICES;
}
export function savePrices(t: PriceTable) { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* ignore */ } }
