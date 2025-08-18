require('dotenv').config();
const mongoose = require('mongoose');

async function testDB() {
    try {
        console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Mevcut' : 'Yok');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        
        console.log('✅ MongoDB bağlantısı başarılı');
        
        const Product = require('./models/productModel');
        const productCount = await Product.countDocuments();
        console.log('📊 Toplam ürün sayısı:', productCount);
        
        mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Database hatası:', {
            message: error.message,
            code: error.code
        });
    }
}

testDB();
