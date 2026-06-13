const router = require('express').Router();
const {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct, getMyProducts,
  getFeed, trackClick, getStats, getRelated,
} = require('../controllers/product.controller');
const { protect, optionalProtect } = require('../middleware/auth');

router.get('/feed',  getFeed);
router.get('/stats', getStats);
router.get('/:id/related', getRelated);                        // must be before /:id
router.get('/my',   protect, getMyProducts);
router.get('/',     getProducts);
router.get('/:id',  optionalProtect, getProduct);    // optional auth for view tracking
router.post('/',    protect, createProduct);
router.put('/:id',  protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.post('/:id/click', trackClick); // public, fire-and-forget

module.exports = router;
