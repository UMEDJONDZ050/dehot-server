const prisma = require('../config/database');
const { checkProductIsAgricultural } = require('./ai');

let _active = false;

// Category mismatch detection
const CATEGORY_KEYWORDS = {
  'Сабзавот': ['картошка','помидор','бодиринг','пиёз','zardak','кабудӣ','каду','карам','ловия','нахӯд','сабзи','шалғам','лаблабу'],
  'Мева':     ['себ','нок','олу','анор','зардолу','шафтолу','узум','лиму','банан','тарбуз','харбуза','гелос'],
  'Гӯшт':     ['гӯшт','гушт','мурғ','мург','гов','гӯсфанд','гусфанд','балиқ','моҳӣ','жигар'],
  'Лабниёт':  ['шир','равған','панир','қаймоқ','мосто','қурут'],
  'Донагӣ':   ['гандум','ҷав','биринҷ','арзан','нахӯд','ловия','мош'],
  'Асал':     ['асал'],
  'Чорво':    ['гов','гӯсфанд','буз','асп','мурғ','қоракул'],
};

function checkCategoryMismatch(title, category) {
  const t = title.toLowerCase();
  if (!category || !CATEGORY_KEYWORDS[category]) return null;
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === category) continue;
    for (const kw of kws) {
      if (t.includes(kw)) {
        return `"${title}" маҳсулоти "${cat}" аст, на "${category}"`;
      }
    }
  }
  return null;
}

async function scanProductNow(productId) {
  try {
    const p = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true, title: true, description: true,
        category: { select: { name: true } },
      },
    });
    if (!p) return;

    const catName = p.category?.name || '';

    // Category mismatch (instant, no API)
    const mismatch = checkCategoryMismatch(p.title, catName);

    // Groq text check
    const textCheck = await checkProductIsAgricultural(p.title, catName, p.description);

    await prisma.product.update({ where: { id: productId }, data: { aiScanned: true } });

    const reasons = [];
    if (mismatch)            reasons.push(mismatch);
    if (textCheck.suspicious) reasons.push(textCheck.reason);

    if (reasons.length > 0) {
      const exists = await prisma.complaint.findFirst({ where: { productId, source: 'ai' } });
      if (!exists) {
        await prisma.complaint.create({
          data: { productId, text: `🤖 ${reasons.join(' | ')}`, source: 'ai' },
        });
        console.log(`[AI] ⚠️ "${p.title}" — ${reasons[0]}`);
      }
    } else {
      console.log(`[AI] ✅ "${p.title}"`);
    }
  } catch (err) {
    console.error('[AI] error:', err.message);
  }
}

async function scanNext() {
  if (_active) return;
  _active = true;
  try {
    const p = await prisma.product.findFirst({
      where: { status: 'ACTIVE', aiScanned: false },
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!p) { _active = false; return; }
    await scanProductNow(p.id);
    await new Promise(r => setTimeout(r, 1000));
  } catch (err) {
    if (err.message?.includes('429') || err.message?.includes('rate')) {
      _active = false;
      setTimeout(scanNext, 60000);
      return;
    }
  }
  _active = false;
  setTimeout(scanNext, 1000);
}

function startAiScanner() {
  console.log('[AI] Scanner started (text only)');
  setTimeout(scanNext, 10000);
  setInterval(() => { if (!_active) scanNext(); }, 10 * 60 * 1000);
}

module.exports = { startAiScanner, scanProductNow };
