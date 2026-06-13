const router = require('express').Router();
const { createComplaint } = require('../controllers/complaint.controller');
const { protect } = require('../middleware/auth');

router.post('/', protect, createComplaint);

module.exports = router;
