const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Ürün adı zorunludur'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Ürün açıklaması zorunludur']
    },
    price: {
        type: Number,
        required: [true, 'Ürün fiyatı zorunludur']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Kategori seçimi zorunludur']
    },
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
    }],
    images: [{
        type: String
    }],
    stock: {
        type: Number,
        required: [true, 'Stok miktarı zorunludur'],
        default: 0
    },
    width: {
        type: Number,
        required: false // Opsiyonel, bazı ürünlerde olmayabilir
    },
    depth: {
        type: Number,
        required: false
    },
    height: {
        type: Number,
        required: false
    },
    capacity: {
        type: Number,
        required: false
    },
    doorCount: {
        type: Number,
        required: false
    },
    materialType: {
        type: String,
        required: false
    },
    extraAttributes: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    color: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: 'Product'
});

module.exports = mongoose.model('Product', productSchema); 