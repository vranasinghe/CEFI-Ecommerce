const sharp = require('sharp');

/**
 * Process an uploaded image through Sharp.
 * Re-encodes the image, strips EXIF metadata, removes polyglots.
 */
async function processImage(inputBuffer, mimeType, purpose) {
  const pipeline = sharp(inputBuffer, {
    failOn: 'none',           // Don't fail on warnings
    sequentialRead: true,     // Optimize for memory
  });

  const metadata = await pipeline.metadata();

  // Validate image dimensions
  if (purpose === 'avatar') {
    const maxDimension = 4096;
    if (
      (metadata.width && metadata.width > maxDimension) ||
      (metadata.height && metadata.height > maxDimension)
    ) {
      throw new Error(
        `Image dimensions ${metadata.width}x${metadata.height} exceed maximum ${maxDimension}`
      );
    }
  }

  // Process based on MIME type
  switch (mimeType) {
    case 'image/jpeg':
      return processJpeg(pipeline, purpose);
    case 'image/png':
      return processPng(pipeline, purpose);
    case 'image/webp':
      return processWebp(pipeline, purpose);
    case 'image/gif':
      // convert GIF to PNG for safety
      return processPng(pipeline, purpose);
    default:
      throw new Error(`Unsupported image type: ${mimeType}`);
  }
}

async function processJpeg(pipeline, purpose) {
  const quality = purpose === 'avatar' ? 85 : 80;

  const result = await pipeline
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
      force: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/jpeg',
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

async function processPng(pipeline, purpose) {
  const result = await pipeline
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
      force: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/png',
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

async function processWebp(pipeline, purpose) {
  const quality = purpose === 'avatar' ? 85 : 80;

  const result = await pipeline
    .webp({
      quality,
      force: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/webp',
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

module.exports = {
  processImage
};
