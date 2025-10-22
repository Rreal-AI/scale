/**
 * Weight conversion utilities between grams (database) and ounces (frontend)
 * Database stores weights in grams, frontend displays in ounces for US market
 */

// Conversion constants
const GRAMS_PER_OUNCE = 28.3495;

/**
 * Convert grams to ounces for frontend display
 */
export function gramsToOunces(grams: number): number {
  return Math.round((grams / GRAMS_PER_OUNCE) * 100) / 100; // Round to 2 decimals
}

/**
 * Convert ounces to grams for database storage
 */
export function ouncesToGrams(ounces: number): number {
  return Math.round(ounces * GRAMS_PER_OUNCE);
}

/**
 * Format weight for display (always in ounces)
 */
export function formatWeight(weightInGrams: number): string {
  const ounces = gramsToOunces(weightInGrams);
  if (ounces >= 16) {
    const pounds = Math.floor(ounces / 16);
    const remainingOz = ounces % 16;
    if (remainingOz === 0) {
      return `${pounds} lb`;
    }
    return `${pounds} lb ${remainingOz} oz`;
  }
  return `${ounces} oz`;
}

/**
 * Format weight for input/display in ounces only
 */
export function formatWeightInOunces(weightInGrams: number): number {
  return gramsToOunces(weightInGrams);
}

/**
 * Convert order data from grams (DB) to ounces (frontend)
 */
export function convertOrderWeightsToOunces<T extends {
  expected_weight?: number;
  actual_weight?: number;
  delta_weight?: number;
}>(order: T): T & {
  expected_weight_oz?: number;
  actual_weight_oz?: number;
  delta_weight_oz?: number;
} {
  return {
    ...order,
    expected_weight_oz: order.expected_weight ? gramsToOunces(order.expected_weight) : undefined,
    actual_weight_oz: order.actual_weight ? gramsToOunces(order.actual_weight) : undefined,
    delta_weight_oz: order.delta_weight ? gramsToOunces(order.delta_weight) : undefined,
  };
}