const productModel = require('../models/productModel');

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const products = await productModel.getAllProducts();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // Kategoriye göre ürünleri getir
        const products = await productModel.getProductsByCategory(categoryId);
        
        if (products.length === 0) {
            return res.status(404).json({ 
                message: 'Bu kategoride ürün bulunamadı' 
            });
        }
        
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get products by tag
exports.getProductsByTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        
        // Etikete göre ürünleri getir
        const products = await productModel.getProductsByTag(tagId);
        
        if (products.length === 0) {
            return res.status(404).json({ 
                message: 'Bu etikete sahip ürün bulunamadı' 
            });
        }
        
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        const product = await productModel.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create product
exports.createProduct = async (req, res) => {
    try {
        const result = await productModel.createProduct(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const result = await productModel.updateProduct(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const result = await productModel.deleteProduct(req.params.id);
        res.status(200).json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};