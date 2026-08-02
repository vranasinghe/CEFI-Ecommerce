const { Jimp } = require(__dirname + '/node_modules/jimp');
const path = require('path');

const ARTIFACTS = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\b82fb566-6fab-42fd-9bf0-515dcd9c6592';
const OUTPUT = 'C:\\Users\\LENOVO\\OneDrive\\Desktop\\CEFI Ecommerce\\frontend\\public\\images';

// Map: source file → output name (in order: vegetables, spices, herbal, fruits)
const images = [
  { src: `${ARTIFACTS}\\media__1785670378988.jpg`, out: 'cat-vegetables.png' },
  { src: `${ARTIFACTS}\\media__1785670381543.jpg`, out: 'cat-spices.png' },
  { src: `${ARTIFACTS}\\media__1785670386110.jpg`, out: 'cat-herbal.png' },
  { src: `${ARTIFACTS}\\media__1785670389362.jpg`, out: 'cat-fruits.png' },
];

// Threshold for "black" (0-255 per channel)
const BLACK_THRESHOLD = 30;

async function removeBlackBackground(srcPath, outPath) {
  const image = await Jimp.read(srcPath);
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    // If pixel is close to black, make it fully transparent
    if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) {
      this.bitmap.data[idx + 3] = 0; // alpha = 0 (transparent)
    }
  });
  await image.write(outPath);
  console.log(`✅ Processed: ${path.basename(outPath)}`);
}

async function main() {
  for (const { src, out } of images) {
    const outPath = path.join(OUTPUT, out);
    try {
      await removeBlackBackground(src, outPath);
    } catch (err) {
      console.error(`❌ Error processing ${out}:`, err.message);
    }
  }
  console.log('Done! All images processed.');
}

main();

