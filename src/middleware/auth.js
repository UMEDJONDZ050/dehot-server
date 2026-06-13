const jwt   = require('jsonwebtoken');
const prisma = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Иҷозат нест' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Корбар ёфт нашуд' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token нодуруст' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, phone: true, name: true, role: true, isActive: true },
      });
      if (user && user.isActive) req.user = user;
    }
  } catch { /* ignore */ }
  next();
};

module.exports = { protect: auth, optionalProtect: optionalAuth };
