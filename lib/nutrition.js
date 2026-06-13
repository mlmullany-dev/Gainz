// ───────────────────────────────────────────────────────────────
// Nutrition calculator — pure, dependency-free, runs anywhere.
// Given a food's per-serving macros and a quantity (number of servings),
// returns the scaled totals. Calories are rounded to whole numbers;
// macros to 0.1 g.
//
// The identical function is mirrored in index.html (scaleNutrition) for
// the browser, since the app has no build step / module loader.
// Tests: `node lib/nutrition.test.js`
// ───────────────────────────────────────────────────────────────

function scaleNutrition(perServing, quantity) {
  const q = Number(quantity);
  if (!isFinite(q) || q < 0) {
    throw new RangeError('quantity must be a non-negative number');
  }
  const g = (v) => Math.round((Number(v) || 0) * q * 10) / 10; // 0.1 g precision
  return {
    calories: Math.round((Number(perServing.calories) || 0) * q),
    protein: g(perServing.protein),
    carbs: g(perServing.carbs),
    fat: g(perServing.fat),
  };
}

module.exports = { scaleNutrition };
