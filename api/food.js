// GET /api/food?id=<food_id>
// Proxies FatSecret food.get.v4 and returns full serving + macro data.
const { fatsecret, normalizeServing, applyCors } = require('./_fatsecret');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = (req.query.id || '').toString().trim();
  if (!id) return res.status(400).json({ error: 'Missing food id' });

  try {
    const data = await fatsecret('food.get.v4', { food_id: id });
    const f = data?.food;
    if (!f) return res.status(404).json({ error: 'Food not found' });

    let servings = f?.servings?.serving || [];
    if (!Array.isArray(servings)) servings = [servings];

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      id: f.food_id,
      name: f.food_name,
      brand: f.brand_name || null,
      type: f.food_type || null,
      servings: servings.map(normalizeServing),
    });
  } catch (e) {
    return res.status(502).json({ error: 'Food lookup failed', detail: String(e.message || e) });
  }
};
