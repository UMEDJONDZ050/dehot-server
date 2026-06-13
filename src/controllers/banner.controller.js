const prisma = require('../config/database');

const getBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: banners });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const getAllBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: banners });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const createBanner = async (req, res) => {
  try {
    const { title, subtitle, imageUrl, linkType = 'none', linkValue, isActive = true, sortOrder = 0 } = req.body;
    const banner = await prisma.banner.create({
      data: { title: title || null, subtitle: subtitle || null, imageUrl: imageUrl || null, linkType, linkValue: linkValue || null, isActive: Boolean(isActive), sortOrder: Number(sortOrder) },
    });
    res.json({ success: true, data: banner });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const updateBanner = async (req, res) => {
  try {
    const allowed = ['title', 'subtitle', 'imageUrl', 'linkType', 'linkValue', 'isActive', 'sortOrder'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'sortOrder') data[key] = Number(req.body[key]);
        else if (key === 'isActive') data[key] = Boolean(req.body[key]);
        else data[key] = req.body[key] === '' ? null : req.body[key];
      }
    }
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: banner });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const deleteBanner = async (req, res) => {
  try {
    await prisma.banner.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getBanners, getAllBanners, createBanner, updateBanner, deleteBanner };
