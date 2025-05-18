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
    }
}, {
    timestamps: true,
    collection: 'Product'
});

module.exports = mongoose.model('Product', productSchema); 