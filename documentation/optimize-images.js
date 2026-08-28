const fs = require('fs');
const path = require('path');

// Check if sharp is available, if not provide instructions
try {
  const sharp = require('sharp');

  async function optimizeImages() {
    const imgDir = path.join(__dirname, 'static', 'img');

    // Optimize 404.png
    const inputPath = path.join(imgDir, '404.png');
    const outputPath = path.join(imgDir, '404.webp');

    if (fs.existsSync(inputPath)) {
      console.log('Optimizing 404.png...');

      // Get original size
      const originalStats = fs.statSync(inputPath);
      console.log(`Original size: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Resize to 600px width (2x for retina) and convert to WebP
      await sharp(inputPath)
        .resize(600, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 85 })
        .toFile(outputPath);

      // Get new size
      const newStats = fs.statSync(outputPath);
      console.log(`Optimized size: ${(newStats.size / 1024).toFixed(2)} KB`);
      console.log(
        `Size reduction: ${((1 - newStats.size / originalStats.size) * 100).toFixed(1)}%`,
      );

      // Create a backup of original
      const backupPath = path.join(imgDir, '404-original.png');
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(inputPath, backupPath);
        console.log('Original backed up as 404-original.png');
      }
    }

    // Optimize other images if needed
    const otherImages = [
      { name: 'docusaurus-social-card.jpg', format: 'webp', quality: 85 },
      { name: 'soroban-social-card.png', format: 'webp', quality: 85 },
    ];

    for (const img of otherImages) {
      const inputPath = path.join(imgDir, img.name);
      const outputPath = path.join(imgDir, img.name.replace(/\.(jpg|png)$/, '.webp'));

      if (fs.existsSync(inputPath) && !fs.existsSync(outputPath)) {
        console.log(`\nOptimizing ${img.name}...`);
        const originalStats = fs.statSync(inputPath);
        console.log(`Original size: ${(originalStats.size / 1024).toFixed(2)} KB`);

        await sharp(inputPath).webp({ quality: img.quality }).toFile(outputPath);

        const newStats = fs.statSync(outputPath);
        console.log(`Optimized size: ${(newStats.size / 1024).toFixed(2)} KB`);
        console.log(
          `Size reduction: ${((1 - newStats.size / originalStats.size) * 100).toFixed(1)}%`,
        );
      }
    }
  }

  optimizeImages().catch(console.error);
} catch (error) {
  console.log('Sharp is not installed. Please run:');
  console.log('npm install sharp');
  console.log('Then run: node optimize-images.js');
}
