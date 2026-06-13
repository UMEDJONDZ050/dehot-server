const prisma = require('../config/database');

const productSelect = {
  id: true, title: true, description: true,
  basePrice: true, unit: true, availableQty: true,
  isOrganic: true, isFresh: true, isVip: true,
  location: true, district: true, region: true,
  status: true, viewCount: true, clickCount: true, createdAt: true,
  category: { select: { id: true, name: true, icon: true, color: true } },
  seller: { select: { id: true, name: true, phone: true, city: true, avatar: true, isVerified: true } },
  images: { select: { id: true, url: true, isMain: true }, orderBy: { sortOrder: 'asc' } },
  wholesaleTiers: { select: { id: true, minQty: true, maxQty: true, price: true }, orderBy: { minQty: 'asc' } },
};

const getFavorites = async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: { product: { select: productSelect } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: favorites.map(f => f.product) });
  } catch (err) { next(err); }
};

const addFavorite = async (req, res, next) => {
  try {
    await prisma.favorite.create({ data: { userId: req.user.id, productId: req.params.productId } });
    res.status(201).json({ success: true, message: 'Илова шуд' });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Аллакай дар дӯстдоштаҳо аст' });
    next(err);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    await prisma.favorite.delete({ where: { userId_productId: { userId: req.user.id, productId: req.params.productId } } });
    res.json({ success: true, message: 'Хориҷ шуд' });
  } catch (err) { next(err); }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
