/**
 * Filter Helper - Utilities for building SQL filter queries
 */

/**
 * Add activity filters to WHERE clause and params array
 */
function addActivityFilters(baseWhere, baseParams, filters) {
    let whereClause = baseWhere;
    const params = [...baseParams];
    const addAnd = (condition) => baseWhere ? ' AND ' + condition : ' ' + condition;

    if (filters.activity_type && filters.activity_type !== 'all') {
        whereClause += addAnd('activity_type = ?');
        params.push(filters.activity_type);
    }

    if (filters.date_from) {
        whereClause += addAnd('activity_time >= ?');
        params.push(filters.date_from);
    }

    if (filters.date_to) {
        whereClause += addAnd('activity_time <= ?');
        params.push(filters.date_to);
    }

    if (filters.duration_min) {
        whereClause += addAnd('duration_minutes >= ?');
        params.push(parseInt(filters.duration_min, 10));
    }

    if (filters.duration_max) {
        whereClause += addAnd('duration_minutes <= ?');
        params.push(parseInt(filters.duration_max, 10));
    }

    if (filters.calories_min) {
        whereClause += addAnd('calories_burned >= ?');
        params.push(parseInt(filters.calories_min, 10));
    }

    if (filters.calories_max) {
        whereClause += addAnd('calories_burned <= ?');
        params.push(parseInt(filters.calories_max, 10));
    }

    return { whereClause, params };
}

module.exports = {
    addActivityFilters
};
