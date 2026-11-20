// Готовит картинку первого экрана: webp в трёх ширинах и Open Graph 1200×630.
// Запуск: npm run images (исходник — assets-src/hero-original.webp).
import sharp from 'sharp';
const src = 'assets-src/hero-original.webp';
const out = 'public/img';
for (const w of [1672, 1200, 800, 560]) {
  const info = await sharp(src).resize({ width: w }).webp({ quality: w > 1000 ? 70 : 64, effort: 6 }).toFile(`${out}/hero-${w}.webp`);
  console.log(`hero-${w}.webp`, info.width + '×' + info.height, Math.round(info.size / 1024) + ' КБ');
}
const og = await sharp(src).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 80, mozjpeg: true }).toFile(`${out}/og.jpg`);
console.log('og.jpg', og.width + '×' + og.height, Math.round(og.size / 1024) + ' КБ');

// портрет куратора: assets-src/strofilov-original.webp → public/img/strofilov-480/800.webp
for (const w of [480, 800]) {
  const info = await sharp('assets-src/strofilov-original.webp').resize({ width: w }).webp({ quality: 70, effort: 6 }).toFile(`${out}/strofilov-${w}.webp`);
  console.log(`strofilov-${w}.webp`, Math.round(info.size / 1024) + ' КБ');
}
