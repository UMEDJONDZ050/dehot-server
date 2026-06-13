require('dotenv').config();
const { checkProductIsAgricultural } = require('./src/lib/ai');

async function test() {
  const tests = [
    { title: 'себ', cat: 'Мева', desc: 'тоза' },
    { title: 'Картошкаи тоза', cat: 'Сабзавот', desc: '' },
    { title: '505050', cat: 'Дигар', desc: '' },
    { title: 'gjbv', cat: 'Сабзавот', desc: '' },
    { title: 'сарпасткуни', cat: 'Дигар', desc: 'металлӣ' },
    { title: 'гӯшти гов', cat: 'Гӯшт', desc: 'тоза' },
  ];
  for (const t of tests) {
    const r = await checkProductIsAgricultural(t.title, t.cat, t.desc, null);
    const flag = (!r.agricultural || r.suspicious) ? '⚠️ FLAGGED' : '✅ OK';
    console.log(`${flag} "${t.title}" → ${r.reason}`);
  }
}
test().catch(console.error);
