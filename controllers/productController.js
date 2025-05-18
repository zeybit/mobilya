const Product = require('../models/productModel');
const mongoose = require('mongoose');

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category')
            .populate('tags');
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        
        // Önce tüm ürünleri al ve populate et
        const products = await Product.find()
            .populate('category')
            .populate('tags');
            
        // Kategori ID'sine göre filtreleme
        const filteredProducts = products.filter(product => 
            product.category._id.toString() === categoryId
        );
        
        if (filteredProducts.length === 0) {
            return res.status(404).json({ 
                message: 'Bu kategoride ürün bulunamadı' 
            });
        }
        
        res.status(200).json(filteredProducts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get products by tag
exports.getProductsByTag = async (req, res) => {
    try {
        const tagId = req.params.tagId;
        
        // ObjectId'ye çevirme
        const objectId = new mongoose.Types.ObjectId(tagId);
        
        // Önce tüm ürünleri al ve populate et
        const products = await Product.find()
            .populate('category')
            .populate('tags');
            
        // Tag ID'sine göre filtreleme
        const filteredProducts = products.filter(product => 
            product.tags.some(tag => tag._id.toString() === tagId)
        );
        
        if (filteredProducts.length === 0) {
            return res.status(404).json({ 
                message: 'Bu etikete sahip ürün bulunamadı' 
            });
        }
        
        res.status(200).json(filteredProducts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category')
            .populate('tags');
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
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        res.status(200).json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 