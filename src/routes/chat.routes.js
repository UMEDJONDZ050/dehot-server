const router = require('express').Router();
const { getChats, getMessages, sendMessage, startChat, getAdminChatInfo } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getChats);
router.post('/', startChat);
router.get('/admin', getAdminChatInfo); // Must be before /:id routes
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

module.exports = router;
