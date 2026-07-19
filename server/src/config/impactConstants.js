// Rough, editable estimation constants used to turn raw donation quantities
// (recorded in mixed units - Plate, Box, Kg, etc.) into approximate
// kilogram-equivalents for "food saved" / "meals served" / CO2 metrics.
// These are not measured values - they're reasonable defaults commonly used
// by food-rescue platforms and should be tuned by an admin over time.
const UNIT_TO_KG = {
    Kg: 1,
    Liter: 1,
    Plate: 0.5,
    Piece: 0.2,
    Package: 1,
    Box: 2,
    Tray: 3,
};

// Average kilograms of food per "meal" - used to turn a kg total into an
// approximate meal count.
const KG_PER_MEAL = 0.5;

// Estimated kilograms of CO2-equivalent emissions avoided per kilogram of
// food diverted from landfill (methane avoidance), a commonly cited
// food-waste rough estimate.
const CO2_KG_PER_FOOD_KG = 2.5;

const quantityToKg = (quantity, unit) => {
    return quantity * (UNIT_TO_KG[unit] ?? 1);
};

module.exports = {
    UNIT_TO_KG,
    KG_PER_MEAL,
    CO2_KG_PER_FOOD_KG,
    quantityToKg,
};
