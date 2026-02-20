const path = require('path');
const fs = require('fs');
const { sign, selfSignedCert } = require('./client/node_modules/zxp-sign-cmd');

const PLUGIN_DIR = path.resolve(__dirname);
const STAGE_DIR = path.resolve(__dirname, '..', 'zxp-stage');
const OUTPUT_ZXP = path.resolve(__dirname, '..', 'FXbuddy.zxp');
const CERT_FILE = path.resolve(__dirname, 'cert.p12');
const CERT_PASS = 'FXbuddy2026';

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

async function build() {
  if (!fs.existsSync(path.join(PLUGIN_DIR, 'client', 'dist', 'index.html'))) {
    console.error('ERROR: client/dist not found. Run "npm run build" in plugin/client first.');
    process.exit(1);
  }

  // Stage only the files needed for the ZXP
  console.log('Staging plugin files...');
  cleanDir(STAGE_DIR);
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  copyRecursive(path.join(PLUGIN_DIR, 'CSXS'), path.join(STAGE_DIR, 'CSXS'));
  copyRecursive(path.join(PLUGIN_DIR, 'client', 'dist'), path.join(STAGE_DIR, 'client', 'dist'));
  copyRecursive(path.join(PLUGIN_DIR, 'host'), path.join(STAGE_DIR, 'host'));

  // Create self-signed cert if needed
  if (!fs.existsSync(CERT_FILE)) {
    console.log('Creating self-signed certificate...');
    await new Promise((resolve, reject) => {
      selfSignedCert({
        country: 'US',
        province: 'CA',
        org: 'FXbuddy',
        name: 'FXbuddy',
        password: CERT_PASS,
        output: CERT_FILE,
      }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    console.log('Certificate created:', CERT_FILE);
  }

  // Remove old ZXP
  if (fs.existsSync(OUTPUT_ZXP)) fs.unlinkSync(OUTPUT_ZXP);

  console.log('Packaging ZXP...');
  await new Promise((resolve, reject) => {
    sign({
      input: STAGE_DIR,
      output: OUTPUT_ZXP,
      cert: CERT_FILE,
      password: CERT_PASS,
    }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  // Clean up staging
  cleanDir(STAGE_DIR);

  const size = (fs.statSync(OUTPUT_ZXP).size / 1024).toFixed(0);
  console.log(`ZXP created: ${OUTPUT_ZXP} (${size} KB)`);
}

build().catch((err) => {
  console.error('Build failed:', err);
  cleanDir(STAGE_DIR);
  process.exit(1);
});
