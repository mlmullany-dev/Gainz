// GET /api/foods-search?q=<term>&page=<n>
// Proxies FatSecret foods.search and returns a clean list of foods.
const { fatsecret, parseDescription, applyCors } = require('./_fatsecret');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const q = (req.query.q || '').toString().trim();
  const page = parseInt(req.query.page, 10) || 0;
  if (!q) return res.status(400).json({ error: 'Missing search term (q)' });

  try {
    const data = await fatsecret('foods.search', {
      search_expression: q,
      max_results: 12,
      page_number: page,
    });

    let list = data?.foods?.food || [];
    if (!Array.isArray(list)) list = [list]; // single result → object

    const foods = list.map((f) => {
      const m = parseDescription(f.food_description);
      return {
        id: f.food_id,
        name: f.food_name,
        brand: f.brand_name || null,
        type: f.food_type || null,
        // Macros parsed from the search summary (per its stated serving).
        // Use /api/food?id= for full structured serving data.
        servingSummary: m ? m.serving : null,
        calories: m ? m.calories : null,
        protein: m ? m.protein : null,
        carbs: m ? m.carbs : null,
        fat: m ? m.fat : null,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ query: q, page, foods });
  } catch (e) {
    return res.status(502).json({ error: 'Food search failed', detail: String(e.message || e) });
  }
};
