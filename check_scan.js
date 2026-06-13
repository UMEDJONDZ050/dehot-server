require('dotenv').config();
const prisma = require('./src/config/database');
async function main() {
  const [unscanned, scanned, aiComplaints, products] = await Promise.all([
    prisma.product.count({ where: { status: 'ACTIVE', aiScanned: false } }),
    prisma.product.count({ where: { status: 'ACTIVE', aiScanned: true } }),
    prisma.complaint.count({ where: { source: 'ai' } }),
    prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { title: true, aiScanned: true }, take: 5 }),
  ]);
  console.log('Unscanned:', unscanned);
  console.log('Scanned:', scanned);
  console.log('AI complaints:', aiComplaints);
  console.log('Sample products:', products);
}
main().catch(console.error).finally(() => prisma.$disconnect());
