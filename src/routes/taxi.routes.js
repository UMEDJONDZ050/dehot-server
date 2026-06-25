const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getListings, activate, deactivate, getMyStatus } = require('../controllers/taxi.controller');

router.get('/', getListings);
router.get('/me', protect, getMyStatus);
router.post('/activate', protect, activate);
router.post('/deactivate', protect, deactivate);

module.exports = router;
