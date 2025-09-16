const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const openCartKeywordManager = require('../utils/openkeyword'); // dosya yolunuza göre

// Mevcut recommendation endpoint'i
router.get('/', recommendationController.getProductRecommendations);

// Yeni debug endpoint'leri
router.get('/debug/opencart-filters', recommendationController.debugOpenCartFilters);
router.post('/refresh/filter-cache', recommendationController.refreshFilterCache);

// Test için ürün filter bilgilerini göster
router.get('/debug/product-filters/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const productFilters = await openCartKeywordManager.getProductFilters(productId);
        res.json({
            success: true,
            productId: productId,
            filters: productFilters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Filter istatistiklerini göster
router.get('/debug/filter-statistics', async (req, res) => {
    try {
        const statistics = await openCartKeywordManager.getFilterStatistics();
        res.json({
            success: true,
            statistics: statistics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;