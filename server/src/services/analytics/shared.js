const clamp01 = (value) => Math.min(1, Math.max(0, value));

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const monthsAgo = (n) => {
    const date = new Date();

    date.setMonth(date.getMonth() - n);

    return date;
};

// Turns a { _id: "<status>", count } aggregation result into a plain map,
// so callers can do `counts.completed || 0` instead of re-scanning arrays.
const countsByKey = (rows) => {
    const map = {};

    for (const row of rows) {
        map[row._id] = row.count;
    }

    return map;
};

// Fills in zero-count months so a 12-point trend line never has gaps for
// months with no activity.
const fillMonthlyTrend = (rows, monthsBack) => {
    const byKey = new Map(
        rows.map((row) => [`${row._id.year}-${row._id.month}`, row.count])
    );

    const trend = [];

    const cursor = new Date();
    cursor.setDate(1);

    for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date(cursor);
        date.setMonth(date.getMonth() - i);

        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

        trend.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            count: byKey.get(key) || 0,
        });
    }

    return trend;
};

// Same idea for the last N days of daily counts.
const fillDailyTrend = (rows, daysBack) => {
    const byKey = new Map(rows.map((row) => [row._id, row.count]));

    const trend = [];

    for (let i = daysBack - 1; i >= 0; i--) {
        const date = daysAgo(i);
        const key = date.toISOString().slice(0, 10);

        trend.push({
            date: key,
            count: byKey.get(key) || 0,
        });
    }

    return trend;
};

module.exports = {
    clamp01,
    daysAgo,
    monthsAgo,
    countsByKey,
    fillMonthlyTrend,
    fillDailyTrend,
};
