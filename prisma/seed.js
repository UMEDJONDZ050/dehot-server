const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Сабзавот' },       update: { sortOrder: 1 }, create: { name: 'Сабзавот',       icon: '🥕', color: '#FF8C00', sortOrder: 1 } }),
    prisma.category.upsert({ where: { name: 'Мева' },           update: { sortOrder: 2 }, create: { name: 'Мева',           icon: '🍎', color: '#E53935', sortOrder: 2 } }),
    prisma.category.upsert({ where: { name: 'Тухми ва Ниҳол' }, update: { sortOrder: 3 }, create: { name: 'Тухми ва Ниҳол', icon: '🌱', color: '#43A047', sortOrder: 3 } }),
    prisma.category.upsert({ where: { name: 'Гӯшт' },           update: { sortOrder: 4 }, create: { name: 'Гӯшт',           icon: '🥩', color: '#8D3B2B', sortOrder: 4 } }),
    prisma.category.upsert({ where: { name: 'Лабниёт' },        update: { sortOrder: 5 }, create: { name: 'Лабниёт',        icon: '🥛', color: '#90CAF9', sortOrder: 5 } }),
    prisma.category.upsert({ where: { name: 'Донагӣ' },         update: { sortOrder: 6 }, create: { name: 'Донагӣ',         icon: '🌾', color: '#F9A825', sortOrder: 6 } }),
    prisma.category.upsert({ where: { name: 'Чорво' },          update: { sortOrder: 7 }, create: { name: 'Чорво',          icon: '🐄', color: '#6D4C41', sortOrder: 7 } }),
    prisma.category.upsert({ where: { name: 'Асал' },           update: { sortOrder: 8 }, create: { name: 'Асал',           icon: '🍯', color: '#FFB300', sortOrder: 8 } }),
    prisma.category.upsert({ where: { name: 'Дигар' },          update: { sortOrder: 9 }, create: { name: 'Дигар',          icon: '📦', color: '#78909C', sortOrder: 9 } }),
  ]);

  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

  // Demo seller
  const hashed = await bcrypt.hash('demo1234', 12);
  const seller = await prisma.user.upsert({
    where: { phone: '+992900000001' },
    update: {},
    create: {
      phone: '+992900000001',
      name: 'Алӣ Ҳасанов',
      password: hashed,
      role: 'SELLER',
      city: 'Хуҷанд',
      region: 'Суғд',
    },
  });

  // Demo products
  const products = [
    {
      title: 'Картошкаи тоза',
      description: 'Картошкаи дехот, бе кимиё, аз боғи худамон',
      categoryId: catMap['Сабзавот'],
      basePrice: 3.5,
      unit: 'кг',
      availableQty: 2000,
      isOrganic: true,
      isFresh: true,
      location: 'Деҳаи Навобод',
      district: 'Ҷ. Расулов',
      region: 'Суғд',
      tiers: [
        { minQty: 100, maxQty: 499,  price: 2.5 },
        { minQty: 500, maxQty: null, price: 2.0 },
      ],
    },
    {
      title: 'Асали кӯҳӣ',
      description: 'Асали табиӣ аз кӯҳҳои Помир, бе иловаҳо',
      categoryId: catMap['Асал'],
      basePrice: 85,
      unit: 'кг',
      availableQty: 150,
      isOrganic: true,
      isFresh: true,
      location: 'Деҳаи Сипанҷ',
      district: 'Ишкошим',
      region: 'ВМКБ',
      tiers: [
        { minQty: 10, maxQty: null, price: 75 },
      ],
    },
    {
      title: 'Гандуми маҳаллӣ',
      description: 'Гандуми соф, хушксолидашуда, барои орд',
      categoryId: catMap['Донагӣ'],
      basePrice: 4.2,
      unit: 'кг',
      availableQty: 5000,
      isOrganic: false,
      isFresh: true,
      location: 'Деҳаи Мехнатобод',
      district: 'Кумсангир',
      region: 'Хатлон',
      tiers: [
        { minQty: 500,  maxQty: 1999, price: 3.8 },
        { minQty: 2000, maxQty: null, price: 3.5 },
      ],
    },
    {
      title: 'Гӯшти гӯсфанд',
      description: 'Гӯшти тоза, забҳи имрӯза, бе яхдон',
      categoryId: catMap['Гӯшт'],
      basePrice: 65,
      unit: 'кг',
      availableQty: 80,
      isOrganic: true,
      isFresh: true,
      location: 'Деҳаи Шаҳринав',
      district: 'Шаҳринав',
      region: 'Ноҳияҳои тобеи марказ',
      tiers: [
        { minQty: 20, maxQty: null, price: 58 },
      ],
    },
    {
      title: 'Шири гов',
      description: 'Шири тоза, субҳгоҳӣ, аз говхои солим',
      categoryId: catMap['Лабниёт'],
      basePrice: 8,
      unit: 'литр',
      availableQty: 200,
      isOrganic: true,
      isFresh: true,
      location: 'Деҳаи Қаратоғ',
      district: 'Ҳисор',
      region: 'Ноҳияҳои тобеи марказ',
      tiers: [],
    },
  ];

  for (const p of products) {
    const { tiers, ...data } = p;
    await prisma.product.create({
      data: {
        ...data,
        sellerId: seller.id,
        status: 'ACTIVE',
        wholesaleTiers: tiers.length ? { create: tiers } : undefined,
      },
    });
  }

  console.log('Seed completed');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
