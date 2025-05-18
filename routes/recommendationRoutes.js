const express = require('express');
const router = express.Router();
const { getProductRecommendations } = require('../controllers/recommendationController');

router.get('/', getProductRecommendations);

module.exports = router; 