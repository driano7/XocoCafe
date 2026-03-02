const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'netlify';
const sampleDir = path.join(__dirname, '..', 'env-samples');
const sampleFile = path.join(sampleDir, `${target}.env.example`);

if (!fs.existsSync(sampleFile)) {
  console.error(
    `Unknown target '\${target}'. Available samples: ${fs
      .readdirSync(sampleDir)
      .filter((file) => file.endsWith('.env.example'))
      .join(', ')}`
  );
  process.exit(1);
}

const dest = path.join(__dirname, '..', '.env.local');
fs.copyFileSync(sampleFile, dest);
console.log(`Copied ${path.basename(sampleFile)} → .env.local`);
