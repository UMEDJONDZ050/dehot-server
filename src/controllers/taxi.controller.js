const prisma = require('../config/database');

const driverSelect = {
  id: true, name: true, phone: true, avatar: true,
  driverFromCity: true, driverToCity: true,
};

// GET /api/taxi — рӯйхати такси фаол (танҳо мӯҳлаташ нагузаштааст)
const getListings = async (req, res, next) => {
  try {
    const now = new Date();
    const listings = await prisma.taxiListing.findMany({
      where: { isActive: true, expiresAt: { gt: now } },
      include: { driver: { select: driverSelect } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: listings });
  } catch (e) { next(e); }
};

// POST /api/taxi/activate — ронанда фаол мешавад
const activate = async (req, res, next) => {
  try {
    const { fromCity, toCity, seats } = req.body;
    if (!fromCity || !toCity || !seats) {
      return res.status(400).json({ success: false, message: 'fromCity, toCity, seats лозиманд' });
    }
    if (seats < 1 || seats > 8) {
      return res.status(400).json({ success: false, message: 'Ҷойҳо 1–8 бошанд' });
    }
    // Агар пеш listing вуҷуд дошта бошад — навсозӣ, вагарна эҷод
    const existing = await prisma.taxiListing.findFirst({
      where: { driverId: req.user.id },
    });
    let listing;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 соат
    if (existing) {
      listing = await prisma.taxiListing.update({
        where: { id: existing.id },
        data: { fromCity, toCity, seats: Number(seats), isActive: true, expiresAt, updatedAt: new Date() },
        include: { driver: { select: driverSelect } },
      });
    } else {
      listing = await prisma.taxiListing.create({
        data: { driverId: req.user.id, fromCity, toCity, seats: Number(seats), isActive: true, expiresAt },
        include: { driver: { select: driverSelect } },
      });
    }
    res.json({ success: true, data: listing });
  } catch (e) { next(e); }
};

// POST /api/taxi/deactivate — ронанда ғайрифаъол мешавад
const deactivate = async (req, res, next) => {
  try {
    await prisma.taxiListing.updateMany({
      where: { driverId: req.user.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
};

// GET /api/taxi/me — вазъияти ронандаи ҷорӣ
const getMyStatus = async (req, res, next) => {
  try {
    const listing = await prisma.taxiListing.findFirst({
      where: { driverId: req.user.id },
      include: { driver: { select: driverSelect } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: listing });
  } catch (e) { next(e); }
};

module.exports = { getListings, activate, deactivate, getMyStatus };
