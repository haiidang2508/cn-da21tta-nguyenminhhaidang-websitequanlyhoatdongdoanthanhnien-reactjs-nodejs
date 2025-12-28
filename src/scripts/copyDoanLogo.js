const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'assets', 'Huy_Hiệu_Đoàn.png');
const publicDir = path.join(__dirname, '..', 'public');

const targets = [
  'Huy_Hiệu_Đoàn.png',
  'logo192.png',
  'logo512.png',
  'favicon.ico'
];

targets.forEach((name) => {
  const dest = path.join(publicDir, name);
  try {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Failed to copy to ${dest}:`, err.message);
    process.exitCode = 1;
  }
});

console.log('Done.');
