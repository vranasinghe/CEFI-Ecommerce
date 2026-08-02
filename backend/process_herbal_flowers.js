const { Jimp } = require('jimp');
const path = require('path');

const inputFile = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\b82fb566-6fab-42fd-9bf0-515dcd9c6592\\media__1785678858496.jpg';
const outputFile = 'C:\\Users\\LENOVO\\OneDrive\\Desktop\\CEFI Ecommerce\\frontend\\public\\cat-herbal-flowers.png';

async function processImage() {
  try {
    const image = await Jimp.read(inputFile);
    
    // Remove black background
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If the pixel is very dark (close to black), make it transparent
      if (red < 15 && green < 15 && blue < 15) {
        this.bitmap.data[idx + 3] = 0; // Set alpha to 0
      }
    });

    image.write(outputFile, (err) => {
      if (err) throw err;
      console.log('Image processed and saved to:', outputFile);
    });
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
