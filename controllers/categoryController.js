const categoryModel = require('../models/categoryModel');

// Get all categories
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await categoryModel.getAllCategories();
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

// Get single category
exports.getCategory = async (req, res, next) => {
    try {
        const category = await categoryModel.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Kategori bulunamadı' });
        }
        res.json(category);
    } catch (err) {
        next(err);
    }
};

// Create category
exports.createCategory = async (req, res, next) => {
    try {
        const result = await categoryModel.createCategory(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// Update category
exports.updateCategory = async (req, res, next) => {
    try {
        const result = await categoryModel.updateCategory(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Delete category
exports.deleteCategory = async (req, res, next) => {
    try {
        const result = await categoryModel.deleteCategory(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};