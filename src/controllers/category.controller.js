const prisma = require('../config/database');

const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
};

module.exports = { getCategories };
