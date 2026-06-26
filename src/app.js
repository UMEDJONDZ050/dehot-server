const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initFCM } = require('./lib/fcm');
initFCM();

const { startAiScanner } = require('./lib/aiScanner');
startAiScanner();

const prisma = require('./config/database');

const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const favoriteRoutes = require('./routes/favorite.routes');
const chatRoutes     = require('./routes/chat.routes');
const uploadRoutes   = require('./routes/upload.routes');
const adminRoutes    = require('./routes/admin.routes');
const bannerRoutes    = require('./routes/banner.routes');
const complaintRoutes = require('./routes/complaint.routes');
const taxiRoutes      = require('./routes/taxi.routes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/panel', express.static(path.join(__dirname, '../admin')));

app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/favorites',  favoriteRoutes);
app.use('/api/chats',      chatRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/banners',    bannerRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/taxi',       taxiRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Schema changes must complete before accepting traffic
(async () => {
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "taxi_listings" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`); } catch (_) {}
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'BUYER'`); } catch (_) {}
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();

module.exports = app;
