const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

const WELCOME_TEXT =
`🌾 Хуш омадед ба DEHOT!

Хушҳолем, ки барномаи Деҳотро интихоб кардед. Дар кору тиҷорататон муваффақият хоҳонем!

━━━━━━━━━━━━━━━━━━
⚠️ Огоҳӣ аз фиребгарон
━━━━━━━━━━━━━━━━━━
DEHOT платформаи элондиҳӣ аст — пардохти онлайн дар барнома вуҷуд надорад.

🚫 Пулро пешакӣ ба касе наандозед!
🚫 Ба рақамҳои нашинос пул нафиристед!
✅ Молро дида ва санҷида, сипас пул диҳед.
✅ Мустақиман бо фурушанда вохӯред.

Агар касе пули пешакӣ талаб кунад — ин фиребгар аст. Фавран ба мо хабар диҳед!`;

async function sendWelcomeMessage(userId) {
  try {
    const { ensureAdminUser } = require('./chat.controller');
    const admin = await ensureAdminUser();
    let chat = await prisma.chat.findFirst({ where: { buyerId: userId, sellerId: admin.id } });
    if (!chat) chat = await prisma.chat.create({ data: { buyerId: userId, sellerId: admin.id } });
    await prisma.$transaction([
      prisma.message.create({ data: { chatId: chat.id, senderId: admin.id, text: WELCOME_TEXT } }),
      prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }),
    ]);
  } catch (_) {}
}

const register = async (req, res, next) => {
  try {
    const { phone, name, password, role } = req.body;
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) return res.status(409).json({ success: false, message: 'Рақам аллакай бақайд аст' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { phone, name, password: hashed, role: role || 'BOTH' },
      select: { id: true, phone: true, name: true, role: true, createdAt: true },
    });
    const token = signToken(user.id);
    sendWelcomeMessage(user.id);
    res.status(201).json({ success: true, token, user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Рақам ё рамз нодуруст' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Ҳисоб блок шудааст' });
    const token = signToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, phone: true, name: true, avatar: true, bio: true, city: true, region: true, role: true, driverFromCity: true, driverToCity: true, isVerified: true, createdAt: true, _count: { select: { products: true, favorites: true } } },
    });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

const phoneAuth = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Рақами телефон лозим аст' });
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNew = false;
    if (!user) {
      const placeholder = await bcrypt.hash(crypto.randomUUID(), 4);
      user = await prisma.user.create({ data: { phone, name: 'Корбар', password: placeholder, role: 'BUYER' } });
      isNew = true;
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Ҳисоб блок шудааст' });
    if (isNew) sendWelcomeMessage(user.id);
    const token = signToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) { next(err); }
};

const updateMe = async (req, res, next) => {
  try {
    const { name, city, region, bio, latitude, longitude } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name      !== undefined && { name }),
        ...(city      !== undefined && { city }),
        ...(region    !== undefined && { region }),
        ...(bio       !== undefined && { bio }),
        ...(latitude  !== undefined && latitude  !== null && { latitude:  Number(latitude) }),
        ...(longitude !== undefined && longitude !== null && { longitude: Number(longitude) }),
      },
      select: { id: true, phone: true, name: true, avatar: true, bio: true, city: true, region: true, role: true, driverFromCity: true, driverToCity: true, isVerified: true, createdAt: true, _count: { select: { products: true } } },
    });
    res.json({ success: true, user: updated });
  } catch (err) { next(err); }
};

const saveFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: 'Token нест' });
    await prisma.user.update({ where: { id: req.user.id }, data: { fcmToken } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, phoneAuth, updateMe, saveFcmToken };
