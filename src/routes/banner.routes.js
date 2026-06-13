const router = require('express').Router();
const { getBanners } = require('../controllers/banner.controller');

// Public: only active banners, sorted by order
router.get('/', getBanners);

module.exports = router;
