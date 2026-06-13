require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function main() {
  // Categories
  const cats = [
    { name: 'Сабзавот',       icon: '🥕', color: '#FF8C00', sortOrder: 1 },
    { name: 'Мева',           icon: '🍎', color: '#E53935', sortOrder: 2 },
    { name: 'Тухми ва Ниҳол', icon: '🌱', color: '#43A047', sortOrder: 3 },
    { name: 'Гӯшт',           icon: '🥩', color: '#8D3B2B', sortOrder: 4 },
    { name: 'Лабниёт',        icon: '🥛', color: '#90CAF9', sortOrder: 5 },
    { name: 'Донагӣ',         icon: '🌾', color: '#F9A825', sortOrder: 6 },
    { name: 'Чорво',          icon: '🐄', color: '#6D4C41', sortOrder: 7 },
    { name: 'Асал',           icon: '🍯', color: '#FFB300', sortOrder: 8 },
    { name: 'Дигар',          icon: '📦', color: '#78909C', sortOrder: 9 },
  ];

  const { data: categories, error: catErr } = await supabase
    .from('categories').upsert(cats, { onConflict: 'name' }).select();
  if (catErr) { console.error('Categories error:', catErr.message); return; }
  console.log('✓ Categories:', categories.length);

  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

  // Demo seller
  const hashed = await bcrypt.hash('demo1234', 12);
  const { data: seller, error: sellerErr } = await supabase.from('users')
    .upsert({ phone: '+992900000001', name: 'Алӣ Ҳасанов', password: hashed, role: 'SELLER', city: 'Хуҷанд', region: 'Суғд' }, { onConflict: 'phone' })
    .select('id').single();
  if (sellerErr) { console.error('Seller error:', sellerErr.message); return; }
  console.log('✓ Seller:', seller.id);

  // Demo products
  const products = [
    { title: 'Картошкаи тоза', description: 'Картошкаи дехот, бе кимиё, аз боғи худамон', categoryId: catMap['Сабзавот'], basePrice: 3.5, unit: 'кг', availableQty: 2000, isOrganic: true, isFresh: true, location: 'Хуҷанд', region: 'Суғд', sellerId: seller.id, status: 'ACTIVE' },
    { title: 'Асали кӯҳӣ', description: 'Асали табиӣ аз кӯҳҳои Помир, бе иловаҳо', categoryId: catMap['Асал'], basePrice: 85, unit: 'кг', availableQty: 150, isOrganic: true, isFresh: true, location: 'Хоруғ', region: 'ВМКБ', sellerId: seller.id, status: 'ACTIVE' },
    { title: 'Гандуми маҳаллӣ', description: 'Гандуми соф, хушксолидашуда, барои орд', categoryId: catMap['Донагӣ'], basePrice: 4.2, unit: 'кг', availableQty: 5000, isOrganic: false, isFresh: true, location: 'Бохтар (Қурғон-Теппа)', region: 'Хатлон', sellerId: seller.id, status: 'ACTIVE' },
    { title: 'Гӯшти гӯсфанд', description: 'Гӯшти тоза, забҳи имрӯза, бе яхдон', categoryId: catMap['Гӯшт'], basePrice: 65, unit: 'кг', availableQty: 80, isOrganic: true, isFresh: true, location: 'Душанбе', region: 'Душанбе', sellerId: seller.id, status: 'ACTIVE' },
    { title: 'Шири гов', description: 'Шири тоза, субҳгоҳӣ, аз говҳои солим', categoryId: catMap['Лабниёт'], basePrice: 8, unit: 'литр', availableQty: 200, isOrganic: true, isFresh: true, location: 'Ҳисор', region: 'РРП', sellerId: seller.id, status: 'ACTIVE' },
  ];

  for (const p of products) {
    const { data: prod, error: prodErr } = await supabase.from('products').insert(p).select('id').single();
    if (prodErr) { console.error('Product error:', prodErr.message); continue; }
    console.log('✓ Product:', p.title);
  }

  console.log('\n✅ Seed completed!');
}

main().catch(console.error);
