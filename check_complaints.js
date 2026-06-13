require('dotenv').config();
const prisma = require('./src/config/database');
async function main() {
  const complaints = await prisma.complaint.findMany({
    where: { source: 'ai' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { product: { select: { title: true } } },
  });
  complaints.forEach(c => console.log(`• "${c.product?.title}" → ${c.text}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
