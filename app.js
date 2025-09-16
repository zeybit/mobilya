const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// Routes
const categoryRoutes = require('./routes/categoryRoutes');
const tagRoutes = require('./routes/tagRoutes');
const productRoutes = require('./routes/productRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

// Environment variables
dotenv.config();

const app = express();

// CORS ayarları
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Frontend URL'leri
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Bir hata oluştu',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});