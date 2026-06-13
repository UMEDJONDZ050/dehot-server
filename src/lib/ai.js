const Groq = require('groq-sdk');

let _client = null;
function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}


const SYSTEM_PROMPT = `You are a strict AI moderator for DEHOT — a Tajikistan agricultural marketplace.
Your job: check if a product listing belongs to agriculture.

ALLOWED: vegetables, fruits, meat, dairy, eggs, grain, honey, seeds, livestock, poultry, fish, hay, fertilizer, farming tools.
Tajik agricultural words (DO NOT flag): себ=apple, нок=pear, олу=plum, анор=pomegranate, зардолу=apricot, шафтолу=peach, бодиринг=cucumber, помидор=tomato, картошка=potato, пиёз=onion, зардак=carrot, каду=pumpkin, гӯшт=meat, шир=milk, тухм=egg, асал=honey, ғалла=grain, гов=cow, гӯсфанд=sheep, мурғ=chicken, моҳӣ=fish, алаф=hay, сабзавот=vegetables, мева=fruit.

NOT ALLOWED: electronics, phones, clothing, furniture, cars, cosmetics, construction materials, spare parts, random numbers/letters.

FLAG as suspicious if:
1. Title is random letters/numbers (505050, gjbv, abc123, вап)
2. Title/image shows something clearly non-agricultural (phone, car, face, clothes, electronics)
3. Image shows a human face or unrelated object

DO NOT flag if title is a real Tajik/Russian agricultural word.

Examples:
- "себ" (apple) + vegetable image → NOT suspicious
- "Картошкаи тоза" + potato image → NOT suspicious
- "505050" + any image → SUSPICIOUS (meaningless title)
- "iPhone 15" + phone image → SUSPICIOUS
- "gjbv" + random → SUSPICIOUS (meaningless)
- any listing + human face photo → SUSPICIOUS

Reply ONLY with valid JSON (no markdown, no explanation outside JSON):
{"suspicious": true/false, "reason": "one sentence in Tajik"}`;

// Text + category check ONLY (no image — YOLO handles images)
async function checkProductIsAgricultural(title, category, description) {
  try {
    const userText = `Product listing:
Title: ${title}
Category: ${category || 'Unknown'}
Description: ${description || 'none'}
Is this suspicious?`;

    const response = await getClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userText },
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const text  = response.choices[0]?.message?.content?.trim() || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { suspicious: false, reason: '' };

    const result = JSON.parse(match[0]);
    return {
      suspicious: result.suspicious ?? false,
      reason:     result.reason     || '',
    };
  } catch (err) {
    console.error('[Groq] check error:', err.message?.slice(0, 80));
    return { suspicious: false, reason: '' };
  }
}

async function chatWithAI(message, context) {
  try {
    const resp = await getClient().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `Ты AI-помощник администратора маркетплейса DEHOT (Таджикистан).\n${context}\nОтвечай кратко на русском или таджикском.` },
        { role: 'user', content: message },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });
    return resp.choices[0]?.message?.content?.trim() || 'Хато рӯй дод';
  } catch (err) {
    return 'Хато: ' + err.message;
  }
}

module.exports = { checkProductIsAgricultural, chatWithAI };
