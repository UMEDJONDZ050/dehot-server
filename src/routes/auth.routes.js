const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const { register, login, getMe, phoneAuth, updateMe, saveFcmToken, updateAvatar } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const okMime = /^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype);
    const okExt  = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(null, okMime || okExt);
  },
});

router.post('/register', register);
router.post('/login', login);
router.post('/phone', phoneAuth);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.patch('/fcm-token', protect, saveFcmToken);
router.post('/avatar', protect, avatarUpload.single('avatar'), updateAvatar);

module.exports = router;
