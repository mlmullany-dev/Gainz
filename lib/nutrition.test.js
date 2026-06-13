// Run: node lib/nutrition.test.js
const assert = require('assert');
const { scaleNutrition } = require('./nutrition');

let passed = 0;
function check(name, actual, expected) {
  assert.deepStrictEqual(actual, expected, `${name}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
  console.log(`  ✓ ${name}`);
  passed++;
}

// Chicken breast, per 100 g serving (FatSecret values)
const chicken = { calories: 165, protein: 31, carbs: 0, fat: 3.6 };

console.log('scaleNutrition');

// 1) quantity of 1 returns the serving unchanged
check('1.0× serving is unchanged',
  scaleNutrition(chicken, 1),
  { calories: 165, protein: 31, carbs: 0, fat: 3.6 });

// 2) 2.5 servings scales linearly (165×2.5=412.5→413, 31×2.5=77.5, 3.6×2.5=9)
check('2.5× serving scales up',
  scaleNutrition(chicken, 2.5),
  { calories: 413, protein: 77.5, carbs: 0, fat: 9 });

// 3) half a serving (165×0.5=82.5→83, 31×0.5=15.5, 3.6×0.5=1.8)
check('0.5× serving scales down',
  scaleNutrition(chicken, 0.5),
  { calories: 83, protein: 15.5, carbs: 0, fat: 1.8 });

// 4) guard: negative quantity throws
assert.throws(() => scaleNutrition(chicken, -1), RangeError);
console.log('  ✓ negative quantity throws RangeError');
passed++;

console.log(`\n${passed} checks passed.`);
