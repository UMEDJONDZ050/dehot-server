const prisma = require('../config/database');
const jwt    = require('jsonwebtoken');
const { sendPush } = require('../lib/fcm');

const adminLogin = async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ success: false, message: 'Рамзи нодуруст' });
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
};

const getStats = async (req, res) => {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const oneDayAgo   = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalUsers, totalProducts, totalChats, newUsersToday, activeMessages] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.chat.count(),
    prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.message.findMany({ where: { createdAt: { gte: thirtyMinAgo } }, select: { senderId: true }, distinct: ['senderId'] }),
  ]);
  res.json({ success: true, data: { totalUsers, totalProducts, totalMessages: totalChats, newUsersToday, onlineUsers: activeMessages.length } });
};

const getUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const skip  = (Number(page) - 1) * Number(limit);
  const where = {};
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }];
  if (role === 'SELLER') where.role = { in: ['SELLER', 'BOTH'] };
  if (role === 'BUYER')  where.role = { in: ['BUYER',  'BOTH'] };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, select: { id: true, name: true, phone: true, city: true, role: true, driverFromCity: true, driverToCity: true, isVerified: true, isActive: true, createdAt: true, _count: { select: { products: true } } } }),
    prisma.user.count({ where }),
  ]);
  res.json({ success: true, data: users, meta: { total, page: Number(page), limit: Number(limit) } });
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role, city, fromCity, toCity } = req.body;
    if (!['BUYER', 'SELLER', 'BOTH', 'DRIVER'].includes(role)) return res.status(400).json({ success: false, message: 'Рол нодуруст аст' });
    if (role === 'DRIVER' && (!fromCity || !toCity)) return res.status(400).json({ success: false, message: 'Барои ронанда fromCity ва toCity лозиманд' });
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, phone: true, role: true, fcmToken: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Ёфт нашуд' });
    const updateData = { role, ...(city ? { city } : {}) };
    if (role === 'DRIVER') { updateData.driverFromCity = fromCity; updateData.driverToCity = toCity; }
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: updateData, select: { id: true, name: true, phone: true, role: true, city: true, driverFromCity: true, driverToCity: true } });
    // Огоҳии корбар
    const { ensureAdminUser } = require('./chat.controller');
    const admin = await ensureAdminUser();
    let msgText;
    if (role === 'DRIVER') {
      msgText = `🚕 Табрик! Шумо ронандаи DEHOT шудед!\n\nМасири шумо: ${fromCity} ↔ ${toCity}\n\nДар барнома тугмаи «+»-ро зер кунед ва вазъияти худро фаъол кунед то мусофирон шуморо бибинанд.`;
    } else {
      const isSeller = role === 'SELLER' || role === 'BOTH';
      const wasSeller = user.role === 'SELLER' || user.role === 'BOTH';
      if (isSeller === wasSeller && user.role !== 'DRIVER') { return res.json({ success: true, data: updated }); }
      msgText = isSeller
        ? `🎉 Табрик! Шумо дар барномаи DEHOT фурушанда шудед!\n\nАкнун шумо метавонед молу маҳсулоти худро ба фурӯш гузоред.\n\n⚠️ Диққат: Шумо танҳо молу маҳсулоти кишоварзӣ метавонед элон гузоред.\n\nБарои илова кардани элон тугмаи «+» дар поёни барномаро истифода баред. Барори кор!`
        : `Шумо дар барномаи DEHOT ҳоло харидор ҳастед.`;
    }
    let chat = await prisma.chat.findFirst({ where: { buyerId: user.id, sellerId: admin.id } });
    if (!chat) chat = await prisma.chat.create({ data: { buyerId: user.id, sellerId: admin.id } });
    await prisma.$transaction([
      prisma.message.create({ data: { chatId: chat.id, senderId: admin.id, text: msgText } }),
      prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }),
    ]);
    if (user.fcmToken) {
      const pushTitle = role === 'DRIVER' ? '🚕 Шумо ронанда шудед!' : (role === 'SELLER' || role === 'BOTH') ? '🎉 Шумо фурушанда шудед!' : 'Нақши шумо тағйир ёфт';
      await sendPush([user.fcmToken], pushTitle, msgText.split('\n')[0]);
    }
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.chat.deleteMany({ where: { OR: [{ buyerId: id }, { sellerId: id }] } });
    await prisma.product.deleteMany({ where: { sellerId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const toggleUserActive = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ success: false, message: 'Ёфт нашуд' });
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive }, select: { id: true, isActive: true } });
  res.json({ success: true, data: updated });
};

const getProducts = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip  = (Number(page) - 1) * Number(limit);
  const where = search ? { title: { contains: search, mode: 'insensitive' } } : {};
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, select: { id: true, title: true, basePrice: true, unit: true, status: true, viewCount: true, createdAt: true, seller: { select: { name: true, phone: true } }, category: { select: { name: true } }, images: { select: { url: true }, where: { isMain: true }, take: 1 }, _count: { select: { favorites: true } } } }),
    prisma.product.count({ where }),
  ]);
  res.json({ success: true, data: products, meta: { total, page: Number(page), limit: Number(limit) } });
};

const deleteProduct = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const updateProductStatus = async (req, res) => {
  const { status } = req.body;
  const updated = await prisma.product.update({ where: { id: req.params.id }, data: { status }, select: { id: true, status: true } });
  res.json({ success: true, data: updated });
};

// POST /api/admin/broadcast
const broadcastMessage = async (req, res, next) => {
  try {
    const { text, target = 'all', withPush = true } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Паём холӣ аст' });
    const { ensureAdminUser, ADMIN_PHONE } = require('./chat.controller');
    const admin = await ensureAdminUser();
    const roleFilter = target === 'buyers' ? { role: { in: ['BUYER', 'BOTH'] } } : target === 'sellers' ? { role: { in: ['SELLER', 'BOTH'] } } : {};
    const users = await prisma.user.findMany({ where: { phone: { not: ADMIN_PHONE }, isActive: true, ...roleFilter }, select: { id: true, fcmToken: true } });
    let sentCount = 0;
    for (const user of users) {
      let chat = await prisma.chat.findFirst({ where: { buyerId: user.id, sellerId: admin.id, productId: null } });
      if (!chat) chat = await prisma.chat.create({ data: { buyerId: user.id, sellerId: admin.id } });
      await prisma.$transaction([
        prisma.message.create({ data: { chatId: chat.id, senderId: admin.id, text: text.trim() } }),
        prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }),
      ]);
      sentCount++;
    }
    if (withPush !== false) {
      const tokens = users.map(u => u.fcmToken).filter(Boolean);
      await sendPush(tokens, 'DEHOT', text.trim());
    }
    res.json({ success: true, message: `${sentCount} нафар паём гирифт`, count: sentCount });
  } catch (err) { next(err); }
};

// POST /api/admin/ai-moderation
const aiModeration = async (req, res, next) => {
  try {
    const { checkProductIsAgricultural } = require('../lib/ai');
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE', aiScanned: false },
      select: { id: true, title: true, description: true, category: { select: { name: true } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const flagged = [];
    for (const p of products) {
      const check = await checkProductIsAgricultural(p.title, p.category?.name || '', p.description);
      if (!check.agricultural) {
        flagged.push({ id: p.id, title: p.title, category: p.category?.name, reason: check.reason });
      }
      await new Promise(r => setTimeout(r, 300));
    }

    res.json({ success: true, data: flagged, checked: products.length });
  } catch (err) { next(err); }
};

// POST /api/admin/ai-chat
const aiChat = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false });

    const { chatWithAI } = require('../lib/ai');

    const [users, products, chats, complaints] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.chat.count(),
      prisma.complaint.count(),
    ]);

    const context = `Текущая статистика: ${users} пользователей, ${products} активных объявлений, ${chats} чатов, ${complaints} жалоб.`;
    const reply = await chatWithAI(message, context);
    res.json({ success: true, reply });
  } catch (err) { next(err); }
};

module.exports = { adminLogin, getStats, getUsers, deleteUser, toggleUserActive, updateUserRole, getProducts, deleteProduct, updateProductStatus, broadcastMessage, aiModeration, aiChat };
