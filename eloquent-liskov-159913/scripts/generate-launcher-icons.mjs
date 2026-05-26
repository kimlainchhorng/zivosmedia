import sharp from 'sharp';
import { copyFileSync } from 'node:fs';

const src = 'android/store-listing/icon-512.png';

const sizes = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const base = 'android/app/src/main/res';

for (const { dir, size } of sizes) {
  const out = `${base}/${dir}`;
  await sharp(src).resize(size, size).toFile(`${out}/ic_launcher.png`);
  await sharp(src).resize(size, size).toFile(`${out}/ic_launcher_round.png`);
  await sharp(src).resize(size, size).toFile(`${out}/ic_launcher_foreground.png`);
  console.log(`✓ ${dir} (${size}x${size})`);
}

console.log('Done!');
