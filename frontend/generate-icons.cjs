const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Az SVG ikon elérési útja
const iconPath = path.join(__dirname, 'public', 'icon.svg');
const publicDir = path.join(__dirname, 'public');

// Ellenőrizzük, hogy létezik-e az SVG fájl
if (!fs.existsSync(iconPath)) {
  console.error('Az icon.svg fájl nem található!');
  process.exit(1);
}

// PWA ikonméretek
const sizes = [
  16, 32, 72, 96, 120, 128, 144, 152, 180, 192, 384, 512
];

async function generateIcons() {
  console.log('PWA ikonok generálása...');
  
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(iconPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generálva: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Hiba a ${size}x${size} ikon generálásánál:`, error);
    }
  }
  
  // Favicon.ico generálás
  try {
    await sharp(iconPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));
    console.log('✅ Generálva: favicon.png');
  } catch (error) {
    console.error('❌ Hiba a favicon generálásánál:', error);
  }
  
  console.log('🎉 Ikonok sikeresen generálva!');
}

generateIcons().catch(console.error);
