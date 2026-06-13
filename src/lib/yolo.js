const Groq = require('groq-sdk');
const fs   = require('fs');
const path = require('path');

let _client = null;
function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

function readImageBase64(imageUrl) {
  try {
    if (!imageUrl) return null;
    const fname = path.basename(new URL(imageUrl).pathname);
    const fpath = path.join(__dirname, '../../uploads', fname);
    if (!fs.existsSync(fpath)) return null;
    const data = fs.readFileSync(fpath);
    const ext  = path.extname(fname).slice(1).toLowerCase();
    const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch (_) { return null; }
}

// Check image using Groq vision model
async function checkImageWithYolo(imageUrl) {
  try {
    const imgBase64 = readImageBase64(imageUrl);
    if (!imgBase64) return { suspicious: false, reason: '' };

    const resp = await getClient().chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are checking an image for a Tajikistan agricultural marketplace.
Look at this image carefully.

Reply ONLY JSON: {"suspicious": true/false, "reason": "one sentence in Tajik"}

Mark suspicious=true if image shows:
- human face or person
- electronics (phone, laptop, TV, computer)
- vehicles (car, motorbike)
- construction materials
- clothing or shoes
- furniture
- anything clearly NOT food/agricultural

Mark suspicious=false if image shows:
- vegetables, fruits, meat, dairy, grains, honey, livestock, farming
- fields, gardens, barns, agricultural tools
- food products of any kind`,
          },
          { type: 'image_url', image_url: { url: imgBase64 } },
        ],
      }],
      max_tokens: 100,
      temperature: 0.1,
    });

    const text  = resp.choices[0]?.message?.content?.trim() || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return { suspicious: false, reason: '' };

    const result = JSON.parse(match[0]);
    return {
      suspicious: result.suspicious ?? false,
      reason:     result.reason     || '',
    };
  } catch (err) {
    console.error('[Vision] error:', err.message?.slice(0, 60));
    return { suspicious: false, reason: '' };
  }
}

module.exports = { checkImageWithYolo };
