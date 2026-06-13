const prisma = require('../config/database');

// POST /api/complaints
const createComplaint = async (req, res, next) => {
  try {
    const { productId, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Матни шикоят лозим аст' });
    if (!productId)    return res.status(400).json({ success: false, message: 'Маҳсулот нишон дода нашуд' });

    const complaint = await prisma.complaint.create({
      data: { userId: req.user.id, productId, text: text.trim() },
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) { next(err); }
};

// GET /api/admin/complaints?source=user|ai
const getComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, source } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const where = source ? { source } : {};
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user:    { select: { id: true, name: true, phone: true } },
          product: {
            select: {
              id: true, title: true,
              seller: { select: { name: true, phone: true } },
              images: { where: { isMain: true }, select: { url: true }, take: 1 },
            },
          },
        },
      }),
      prisma.complaint.count({ where }),
    ]);
    res.json({ success: true, data: complaints, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
};

// DELETE /api/admin/complaints/:id
const deleteComplaint = async (req, res, next) => {
  try {
    await prisma.complaint.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { createComplaint, getComplaints, deleteComplaint };
