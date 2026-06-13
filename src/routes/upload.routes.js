const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const { uploadToR2 } = require('../config/r2');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

router.post('/', protect, upload.array('images', 8), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Файлҳо нестанд' });
    }
    const urls = await Promise.all(
      req.files.map(f => uploadToR2(f.buffer, f.originalname, 'products', f.mimetype))
    );
    res.json({ success: true, urls });
  } catch (err) { next(err); }
});

module.exports = router;
