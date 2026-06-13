// Якдафъаина: файлҳои локалии папкаи uploads/ -ро ба Cloudflare R2 мебарорад
// ва URL-ҳои дар базаи додаҳо (ProductImage, Banner) -ро нав мекунад.
//
// Истифода: node scripts/migrate_uploads_to_r2.js
// Пеш аз иҷро кардан R2_* env-ҳоро дар .env пур кунед.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');
const { uploadToR2 } = require('../src/config/r2');

async function migrateFolder(folderName, table) {
  const dir = path.join(__dirname, '../uploads', folderName);
  if (!fs.existsSync(dir)) {
    console.log(`[skip] ${dir} мавчуд нест`);
    return;
  }
  const files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
  console.log(`[${folderName}] ${files.length} файл ёфт шуд`);

  for (const filename of files) {
    const filePath = path.join(dir, filename);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimetype = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'application/octet-stream';

    const newUrl = await uploadToR2(buffer, filename, folderName, mimetype);

    if (table === 'productImage') {
      const { count } = await prisma.productImage.updateMany({
        where: { url: { contains: `/uploads/products/${filename}` } },
        data: { url: newUrl },
      });
      console.log(`  ${filename} -> ${newUrl} (${count} сатр нав шуд)`);
    } else if (table === 'banner') {
      const { count } = await prisma.banner.updateMany({
        where: { imageUrl: { contains: `/uploads/banners/${filename}` } },
        data: { imageUrl: newUrl },
      });
      console.log(`  ${filename} -> ${newUrl} (${count} сатр нав шуд)`);
    }
  }
}

(async () => {
  await migrateFolder('products', 'productImage');
  await migrateFolder('banners', 'banner');
  console.log('Тамом!');
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
