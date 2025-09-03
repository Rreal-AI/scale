/**
 * Weight Analysis Utilities for Order Quality Control
 * Analyzes actual vs expected weight and provides actionable feedback
 */

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
}

interface WeightAnalysisResult {
  status: 'perfect' | 'underweight' | 'overweight';
  message: string;
  delta: number; // actual - expected
  action: 'ready' | 're-weigh' | 'review';
  suggestedItem?: string;
  confidence?: number; // 0-100 confidence in suggestion
}

/**
 * Estimates weight for common food items (in ounces)
 */
const ITEM_WEIGHT_ESTIMATES: Record<string, number> = {
  // Tacos
  'taco': 6,
  'taco al pastor': 6,
  'taco de asada': 6,
  'taco de carnitas': 6,
  'taco de pollo': 5.5,
  'taco de pescado': 5,
  'taco veggie': 4.5,
  
  // Mains
  'burrito': 14,
  'quesadilla': 12,
  'quesabirria': 15,
  'nachos': 16,
  'torta': 18,
  'empanada': 6,
  
  // Sides
  'elote': 8,
  'esquite': 6,
  'chips': 2,
  'guacamole': 4,
  'queso dip': 6,
  'rice': 4,
  'beans': 4,
  
  // Drinks (minimal weight)
  'agua fresca': 1,
  'soda': 1,
  'beer': 1,
  'margarita': 2,
};

/**
 * Estimates weight of an item based on its name
 */
function estimateItemWeight(itemName: string): number {
  const normalizedName = itemName.toLowerCase();
  
  // Direct match
  if (ITEM_WEIGHT_ESTIMATES[normalizedName]) {
    return ITEM_WEIGHT_ESTIMATES[normalizedName];
  }
  
  // Partial matches
  for (const [key, weight] of Object.entries(ITEM_WEIGHT_ESTIMATES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return weight;
    }
  }
  
  // Default weight for unknown items
  return 8;
}

/**
 * Finds the most likely missing item based on weight difference
 */
function findMostLikelyMissingItem(
  missingWeight: number, 
  orderItems: OrderItem[]
): { item: string; confidence: number } {
  const candidates: Array<{ item: string; weight: number; confidence: number }> = [];
  
  // Check each item in the order to see if one unit matches the missing weight
  for (const item of orderItems) {
    const estimatedUnitWeight = estimateItemWeight(item.name);
    const weightDiff = Math.abs(missingWeight - estimatedUnitWeight);
    const confidence = Math.max(0, 100 - (weightDiff / estimatedUnitWeight) * 100);
    
    if (confidence > 30) { // Only consider reasonable matches
      candidates.push({
        item: `1x ${item.name}`,
        weight: estimatedUnitWeight,
        confidence
      });
    }
  }
  
  // Sort by confidence and return best match
  candidates.sort((a, b) => b.confidence - a.confidence);
  
  if (candidates.length > 0) {
    return {
      item: candidates[0].item,
      confidence: candidates[0].confidence
    };
  }
  
  // Fallback: suggest generic item based on weight range
  if (missingWeight < 4) {
    return { item: "Small side item", confidence: 50 };
  } else if (missingWeight < 8) {
    return { item: "Taco or side", confidence: 60 };
  } else if (missingWeight < 16) {
    return { item: "Main item (burrito/quesadilla)", confidence: 70 };
  } else {
    return { item: "Large item or multiple items", confidence: 40 };
  }
}

/**
 * Analyzes weight difference and provides actionable feedback
 */
export function analyzeOrderWeight(
  actualWeight: number,
  expectedWeight: number,
  orderItems: OrderItem[],
  tolerance: number = 4 // Default 4 oz tolerance
): WeightAnalysisResult {
  const delta = actualWeight - expectedWeight;
  const absDelta = Math.abs(delta);
  
  // Perfect weight (within tolerance)
  if (absDelta <= tolerance) {
    return {
      status: 'perfect',
      message: 'Weight verified - Ready for delivery',
      delta,
      action: 'ready'
    };
  }
  
  // Underweight
  if (delta < 0) {
    const missingWeight = absDelta;
    const { item: suggestedItem, confidence } = findMostLikelyMissingItem(missingWeight, orderItems);
    
    return {
      status: 'underweight',
      message: `${missingWeight.toFixed(1)} oz under - Possibly missing: ${suggestedItem}`,
      delta,
      action: 're-weigh',
      suggestedItem,
      confidence
    };
  }
  
  // Overweight
  return {
    status: 'overweight',
    message: `${absDelta.toFixed(1)} oz over - Check for extra items`,
    delta,
    action: 'review'
  };
}

/**
 * Gets visual configuration for weight analysis status
 */
export function getWeightStatusConfig(status: WeightAnalysisResult['status']) {
  switch (status) {
    case 'perfect':
      return {
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: '✅',
        priority: 'low'
      };
    case 'underweight':
      return {
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: '⚠️',
        priority: 'high'
      };
    case 'overweight':
      return {
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: '🔍',
        priority: 'medium'
      };
  }
}