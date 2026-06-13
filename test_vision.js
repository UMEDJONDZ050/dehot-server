require('dotenv').config();
const { checkImageWithYolo } = require('./src/lib/yolo');

// Test with a URL (will check if file exists locally)
async function test() {
  console.log('Testing vision check (no image = no suspicious):');
  const r1 = await checkImageWithYolo(null);
  console.log('null image:', r1);

  // Simulate with a real uploaded image if exists
  const fs = require('fs');
  const path = require('path');
  const uploads = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploads)) {
    const files = fs.readdirSync(uploads).filter(f => f.match(/\.(jpg|jpeg|png)$/i));
    if (files[0]) {
      console.log(`\nTesting with real image: ${files[0]}`);
      const r2 = await checkImageWithYolo(`http://localhost:3001/uploads/${files[0]}`);
      console.log('Result:', r2);
    }
  }
}
test().catch(console.error);
