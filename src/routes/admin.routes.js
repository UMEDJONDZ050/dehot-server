const router = require('express').Router();
const path   = require('path');
const multer = require('multer');
const adminAuth = require('../middleware/adminAuth');
const { uploadToR2 } = require('../config/r2');
const {
  adminLogin, getStats,
  getUsers, deleteUser, toggleUserActive, updateUserRole,
  getProducts, deleteProduct, updateProductStatus,
  broadcastMessage, aiModeration, aiChat,
} = require('../controllers/admin.controller');
const { getComplaints, deleteComplaint } = require('../controllers/complaint.controller');
const {
  getAllBanners, createBanner, updateBanner, deleteBanner,
} = require('../controllers/banner.controller');

// ─── Banner image upload (multer → Cloudflare R2) ─────────────────────────────
const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// ─── Public login ─────────────────────────────────────────────────────────────
router.post('/login', adminLogin);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(adminAuth);

// Stats
router.get('/stats', getStats);

// Broadcast
router.post('/broadcast', broadcastMessage);

// AI Moderation
router.post('/ai-moderation', aiModeration);
router.post('/ai-chat', aiChat);

// Complaints
router.get('/complaints', getComplaints);
router.delete('/complaints/:id', deleteComplaint);

// Users
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/active', toggleUserActive);
router.patch('/users/:id/role', updateUserRole);

// Products
router.get('/products', getProducts);
router.delete('/products/:id', deleteProduct);
router.patch('/products/:id/status', updateProductStatus);

// Banners
router.get('/banners', getAllBanners);
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Banner image upload → returns { success, url }
router.post('/banners/upload', bannerUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Файл нест' });
    }
    const url = await uploadToR2(req.file.buffer, req.file.originalname, 'banners', req.file.mimetype);
    res.json({ success: true, url });
  } catch (err) { next(err); }
});

module.exports = router;
