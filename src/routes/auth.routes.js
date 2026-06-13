const router = require('express').Router();
const { register, login, getMe, phoneAuth, updateMe, saveFcmToken } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/phone', phoneAuth);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.patch('/fcm-token', protect, saveFcmToken);

module.exports = router;
