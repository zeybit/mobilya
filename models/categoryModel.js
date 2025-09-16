const pool = require('../utils/db');

// Get all categories
async function getAllCategories() {
    const [rows] = await pool.query('SELECT * FROM oc_category');
    return rows;
}

// Get category by ID
async function getCategoryById(id) {
    const [rows] = await pool.query('SELECT * FROM oc_category WHERE category_id = ?', [id]);
    return rows[0];
}

// Create a new category
async function createCategory(data) {
    const { parent_id = 0, top = 1, column = 1, sort_order = 0, status = 1 } = data;
    const [result] = await pool.query(
        'INSERT INTO oc_category (parent_id, top, `column`, sort_order, status, date_added, date_modified) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [parent_id, top, column, sort_order, status]
    );
    return { id: result.insertId };
}

// Update a category
async function updateCategory(id, data) {
    const { parent_id, top, column, sort_order, status } = data;
    await pool.query(
        'UPDATE oc_category SET parent_id=?, top=?, `column`=?, sort_order=?, status=?, date_modified=NOW() WHERE category_id=?',
        [parent_id, top, column, sort_order, status, id]
    );
    return { id };
}

// Delete a category
async function deleteCategory(id) {
    await pool.query('DELETE FROM oc_category WHERE category_id = ?', [id]);
    return { id };
}

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};