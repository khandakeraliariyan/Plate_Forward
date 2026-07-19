// Rough, editable shelf-life estimates (in hours) per food category, counted
// from the moment a donation is posted. Used by the heuristic food-quality
// service (Module 16) to estimate freshness/risk from metadata only - there
// is no image analysis, so these are reasonable defaults an admin should
// tune over time, not measured values.
const SHELF_LIFE_HOURS = {
    "Cooked Meal": 6,
    Bakery: 48,
    Vegetables: 72,
    Fruits: 72,
    Dairy: 48,
    Beverages: 168,
    Snacks: 336,
    Frozen: 720,
    Other: 24,
};

const getShelfLifeHours = (foodType) => SHELF_LIFE_HOURS[foodType] ?? SHELF_LIFE_HOURS.Other;

module.exports = { SHELF_LIFE_HOURS, getShelfLifeHours };
