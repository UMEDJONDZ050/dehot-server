const prisma = require('../config/database');
const { computeScore, buildFeed } = require('../lib/scoring');

const productSelect = {
  id: true, title: true, description: true,
  basePrice: true, unit: true, availableQty: true,
  isOrganic: true, isFresh: true,
  location: true, district: true, region: true,
  status: true, viewCount: true, clickCount: true,
  isVip: true, vipUntil: true, createdAt: true,
  category: { select: { id: true, name: true, icon: true, color: true } },
  seller: { select: { id: true, name: true, phone: true, city: true, avatar: true, isVerified: true } },
  images: { select: { id: true, url: true, isMain: true }, orderBy: { sortOrder: 'asc' } },
  wholesaleTiers: { select: { id: true, minQty: true, maxQty: true, price: true }, orderBy: { minQty: 'asc' } },
  _count: { select: { favorites: true, chats: true } },
};

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, categoryId, region, minPrice, maxPrice, isOrganic, isFresh, sortBy = 'createdAt', order = 'desc', sellerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { status: 'ACTIVE' };
    if (sellerId)   where.sellerId   = sellerId;
    if (categoryId) where.categoryId = categoryId;
    if (minPrice || maxPrice) where.basePrice = { ...(minPrice && { gte: Number(minPrice) }), ...(maxPrice && { lte: Number(maxPrice) }) };
    if (isOrganic === 'true') where.isOrganic = true;
    if (isFresh   === 'true') where.isFresh   = true;
    const andConditions = [];
    if (search) andConditions.push({ OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] });
    if (region) andConditions.push({ OR: [{ region: { equals: region, mode: 'insensitive' } }, { district: { equals: region, mode: 'insensitive' } }, { location: { equals: region, mode: 'insensitive' } }] });
    if (andConditions.length) where.AND = andConditions;
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, select: productSelect, skip, take: Number(limit), orderBy: { [sortBy]: order } }),
      prisma.product.count({ where }),
    ]);
    res.json({ success: true, data: products, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { next(err); }
};

// GET /api/products/:id
const getProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: productSelect });
    if (!product) return res.status(404).json({ success: false, message: 'Маҳсулот ёфт нашуд' });
    const viewerKey = req.user?.id ?? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'anon');
    let viewCount = product.viewCount;
    const alreadyViewed = await prisma.productView.findUnique({ where: { productId_viewerKey: { productId: req.params.id, viewerKey } } });
    if (!alreadyViewed) {
      await prisma.productView.create({ data: { productId: req.params.id, viewerKey } });
      await prisma.product.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } });
      viewCount++;
    }
    res.json({ success: true, data: { ...product, viewCount } });
  } catch (err) { next(err); }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { title, description, categoryId, basePrice, unit, availableQty, isOrganic, isFresh, location, district, region, wholesaleTiers, images } = req.body;
    const product = await prisma.product.create({
      data: {
        title, description, categoryId, basePrice: Number(basePrice), unit, availableQty: Number(availableQty),
        isOrganic: Boolean(isOrganic), isFresh: Boolean(isFresh), location, district, region, sellerId: req.user.id,
        wholesaleTiers: wholesaleTiers?.length ? { create: wholesaleTiers.map(t => ({ minQty: t.minQty, maxQty: t.maxQty, price: t.price })) } : undefined,
        images: images?.length ? { create: images.map((url, i) => ({ url, isMain: i === 0, sortOrder: i })) } : undefined,
      },
      select: productSelect,
    });
    res.status(201).json({ success: true, data: product });
    // Дарав AI скан барои элони нав
    const productId = product.id;
    setImmediate(async () => {
      try {
        console.log(`[AI] New product → scanning: "${product.title}"`);
        const { scanProductNow } = require('../lib/aiScanner');
        await scanProductNow(productId);
      } catch (err) {
        console.error('[AI] scanProductNow error:', err.message);
      }
    });
  } catch (err) { next(err); }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Маҳсулот ёфт нашуд' });
    if (product.sellerId !== req.user.id) return res.status(403).json({ success: false, message: 'Иҷозат нест' });

    const { title, description, categoryId, basePrice, unit, availableQty, isOrganic, isFresh, location, district, region, wholesaleTiers } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (basePrice !== undefined) data.basePrice = Number(basePrice);
    if (unit !== undefined) data.unit = unit;
    if (availableQty !== undefined) data.availableQty = Number(availableQty);
    if (isOrganic !== undefined) data.isOrganic = Boolean(isOrganic);
    if (isFresh !== undefined) data.isFresh = Boolean(isFresh);
    if (location !== undefined) data.location = location;
    if (district !== undefined) data.district = district;
    if (region !== undefined) data.region = region;
    if (wholesaleTiers !== undefined) {
      data.wholesaleTiers = {
        deleteMany: {},
        create: wholesaleTiers.map(t => ({ minQty: Number(t.minQty), maxQty: t.maxQty != null ? Number(t.maxQty) : null, price: Number(t.price) })),
      };
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      select: productSelect,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Ёфт нашуд' });
    if (product.sellerId !== req.user.id) return res.status(403).json({ success: false, message: 'Иҷозат нест' });
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Ҳазф шуд' });
  } catch (err) { next(err); }
};

// GET /api/products/my
const getMyProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { sellerId: req.user.id }, select: productSelect, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

// GET /api/products/feed
const getFeed = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, region, hasWholesale } = req.query;
    const pageNum = Number(page), limitNum = Number(limit);
    const where = { status: 'ACTIVE' };
    if (hasWholesale === 'true') where.wholesaleTiers = { some: {} };
    if (region) where.OR = [{ region: { equals: region, mode: 'insensitive' } }, { district: { equals: region, mode: 'insensitive' } }, { location: { equals: region, mode: 'insensitive' } }];
    const pool = await prisma.product.findMany({ where, select: productSelect, take: 500, orderBy: { createdAt: 'desc' } });
    const total = await prisma.product.count({ where });
    if (pool.length === 0) return res.json({ success: true, data: [], meta: { total: 0, page: pageNum, limit: limitNum, pages: 0 } });
    const scored = pool.map(p => ({ ...p, _score: computeScore(p, region) }));
    let items;
    if (pageNum === 1) {
      items = buildFeed(scored, limitNum, region);
    } else {
      const sorted = [...scored].sort((a, b) => b._score - a._score);
      items = sorted.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    }
    const data = items.map(({ _score, vipUntil, clickCount: _c, ...p }) => p);
    res.json({ success: true, data, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
};

// GET /api/products/:id/related
const getRelated = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { categoryId: true, sellerId: true },
    });
    if (!product) return res.json({ success: true, data: [] });

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId: product.categoryId,
        id: { not: req.params.id },
      },
      select: productSelect,
      take: 20,
      orderBy: [{ isVip: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
};

// GET /api/products/stats
const getStats = async (req, res, next) => {
  try {
    const [totalProducts, locations] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.findMany({
        where: { status: 'ACTIVE', location: { not: null } },
        select: { location: true },
        distinct: ['location'],
      }),
    ]);
    res.json({ success: true, data: { totalProducts, totalRegions: locations.length } });
  } catch (err) { next(err); }
};

// POST /api/products/:id/click
const trackClick = async (req, res, next) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { clickCount: { increment: 1 } } });
    res.json({ success: true });
  } catch (_) { res.json({ success: true }); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getMyProducts, getFeed, trackClick, getStats, getRelated };
