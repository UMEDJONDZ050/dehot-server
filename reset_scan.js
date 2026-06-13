require('dotenv').config();
const prisma = require('./src/config/database');
prisma.product.updateMany({ where: { status: 'ACTIVE' }, data: { aiScanned: false } })
  .then(r => { console.log('Reset:', r.count, 'products'); })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
