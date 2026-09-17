import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const password = process.env.DASHBOARD_PASSWORD || process.argv[2];

if (!password) {
  console.error('\x1b[31mFejl: Du skal angive en adgangskode til krypteringen!\x1b[0m');
  console.log('Eksempel: npm run encrypt "MinHemmeligeKode123"');
  process.exit(1);
}

// Read raw data files
const livePath = path.join(rootDir, 'vipps-live-donations.json');
const histPath = path.join(rootDir, 'src/data/historical-donations-901600.json');

if (!fs.existsSync(livePath) || !fs.existsSync(histPath)) {
  console.error('\x1b[31mFejl: Rå datafiler blev ikke fundet lokalt.\x1b[0m');
  process.exit(1);
}

const rawLive = JSON.parse(fs.readFileSync(livePath, 'utf8'));
const rawHist = JSON.parse(fs.readFileSync(histPath, 'utf8'));

import crypto from 'crypto';

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function encrypt(plaintext, pass) {
  const enc = new TextEncoder();
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  const keyMaterial = await crypto.webcrypto.subtle.importKey(
    'raw',
    enc.encode(pass),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const ciphertext = await crypto.webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  return {
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(ciphertext),
  };
}

async function main() {
  console.log('🔐 Krypterer live- og historiske donationsdata med AES-256-GCM...');
  
  const payloadToEncrypt = JSON.stringify({
    live: rawLive,
    historical: rawHist,
    encryptedAt: new Date().toISOString(),
  });

  const encrypted = await encrypt(payloadToEncrypt, password);

  // Write encrypted bundle to src/data/encrypted-donations.json
  const outPath = path.join(rootDir, 'src/data/encrypted-donations.json');
  fs.writeFileSync(outPath, JSON.stringify(encrypted, null, 2), 'utf8');

  console.log(`\x1b[32m✓ Færdig! Krypteret payload skrevet til: ${outPath}\x1b[0m`);
  console.log(`\x1b[36mStørrelse: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB (ulæselig matematisk støj uden kodeord)\x1b[0m`);
}

main().catch(err => {
  console.error('Fejl under kryptering:', err);
  process.exit(1);
});
