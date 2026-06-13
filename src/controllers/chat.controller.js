const prisma = require('../config/database');

const ADMIN_PHONE = '+992000000000';
const ADMIN_NAME  = 'Администратор';

async function ensureAdminUser() {
  let admin = await prisma.user.findUnique({ where: { phone: ADMIN_PHONE } });
  if (!admin) {
    const bcrypt = require('bcryptjs');
    const pw = await bcrypt.hash('dehot_bot_2024!', 12);
    admin = await prisma.user.create({ data: { phone: ADMIN_PHONE, name: ADMIN_NAME, password: pw, role: 'BOTH' } });
  }
  return admin;
}

// GET /api/chats/admin
const getAdminChatInfo = async (req, res, next) => {
  try {
    const admin = await ensureAdminUser();
    const chat = await prisma.chat.findFirst({
      where: { buyerId: req.user.id, sellerId: admin.id, productId: null },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true, createdAt: true, senderId: true, isRead: true } },
      },
    });
    res.json({
      success: true,
      data: {
        adminId: admin.id, adminName: admin.name,
        chatId: chat?.id ?? null,
        lastMessage: chat?.messages[0] ?? null,
        lastMessageAt: chat?.updatedAt ?? null,
        unread: chat?.messages[0] && !chat.messages[0].isRead && chat.messages[0].senderId !== req.user.id ? 1 : 0,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/chats
const getChats = async (req, res, next) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { OR: [{ buyerId: req.user.id }, { sellerId: req.user.id }], messages: { some: {} } },
      include: {
        buyer:   { select: { id: true, name: true, avatar: true, phone: true } },
        seller:  { select: { id: true, name: true, avatar: true, phone: true } },
        product: { select: { id: true, title: true, images: { where: { isMain: true }, select: { url: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true, createdAt: true, senderId: true, isRead: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const seen = new Set();
    const unique = chats.filter(c => {
      const key = `${c.buyerId}-${c.sellerId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ success: true, data: unique });
  } catch (err) { next(err); }
};

// GET /api/chats/:id/messages
const getMessages = async (req, res, next) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.id } });
    if (!chat) return res.status(404).json({ success: false, message: 'Чат ёфт нашуд' });
    if (chat.buyerId !== req.user.id && chat.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Иҷозат нест' });
    }
    const messages = await prisma.message.findMany({
      where: { chatId: req.params.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    await prisma.message.updateMany({
      where: { chatId: req.params.id, senderId: { not: req.user.id }, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
};

// POST /api/chats/:id/messages
const sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Паём холӣ аст' });
    const chat = await prisma.chat.findUnique({ where: { id: req.params.id } });
    if (!chat) return res.status(404).json({ success: false, message: 'Чат ёфт нашуд' });
    if (chat.buyerId !== req.user.id && chat.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Иҷозат нест' });
    }
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { chatId: req.params.id, senderId: req.user.id, text: text.trim() },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.chat.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } }),
    ]);
    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
};

// POST /api/chats
const startChat = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    if (sellerId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Бо худ чат кушода намешавад' });
    }
    let chat = await prisma.chat.findFirst({
      where: { buyerId: req.user.id, sellerId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!chat) chat = await prisma.chat.create({ data: { buyerId: req.user.id, sellerId } });
    res.json({ success: true, data: chat });
  } catch (err) { next(err); }
};

module.exports = { getChats, getMessages, sendMessage, startChat, getAdminChatInfo, ADMIN_PHONE, ensureAdminUser };
