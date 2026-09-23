import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CLIENT_ID = process.env.VIPPS_CLIENT_ID || '019fcc37-0bf5-751e-9df6-369f0aa03f0f';
const CLIENT_SECRET = process.env.VIPPS_CLIENT_SECRET || 'XXt32mcKZ_hC0dK23kjVTQ';
const MSN = process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '1171973';
const BASE_URL = process.env.VIPPS_API_BASE_URL || 'https://api.vipps.no';
const DASHBOARD_PASS = process.env.DASHBOARD_PASSWORD || 'RcFIGAvrckkea2qEb9uX';

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

export async function syncAndDeploy() {
  console.log('🔄 [Sync] Starter hentning af friske MobilePay/Vipps transaktioner...');

  // 1. Hent access token
  const authHeader = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${BASE_URL}/miami/v1/token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Vipps-System-Name': 'reparations-konsortiet-donations',
      'Vipps-System-Version': '1.0.0',
      'Merchant-Serial-Number': MSN,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Kunne ikke hente Vipps token (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  // 2. Hent de seneste donationer (90 dages historik til fremtidig buffer)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const reportUrl = `${BASE_URL}/donations/v1/reports/payments?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&includeGDPRSensitiveData=true`;
  const reportRes = await fetch(reportUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Vipps-System-Name': 'reparations-konsortiet-donations',
      'Vipps-System-Version': '1.0.0',
      'Merchant-Serial-Number': MSN,
    },
  });

  if (!reportRes.ok) {
    const errText = await reportRes.text();
    throw new Error(`Kunne ikke hente Vipps donationsrapport (${reportRes.status}): ${errText}`);
  }

  const reportData = await reportRes.json();
  const liveItems = Array.isArray(reportData)
    ? reportData
    : (reportData.payments || reportData.items || []);

  console.log(`✅ [Sync] Fandt ${liveItems.length} transaktioner fra MobilePay.`);

  // 3. Gem lokalt i vipps-live-donations.json
  const livePath = path.join(rootDir, 'vipps-live-donations.json');
  fs.writeFileSync(livePath, JSON.stringify(liveItems, null, 2), 'utf8');

  // Læs historiske data hvis tilgængelige
  const histPath = path.join(rootDir, 'src/data/historical-donations-901600.json');
  const histData = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : [];

  // 4. Krypter og gem til encrypted-donations.json
  const payloadToEncrypt = JSON.stringify({
    live: liveItems,
    historical: histData,
    encryptedAt: new Date().toISOString(),
  });

  const encrypted = await encrypt(payloadToEncrypt, DASHBOARD_PASS);
  const encPath = path.join(rootDir, 'src/data/encrypted-donations.json');
  fs.writeFileSync(encPath, JSON.stringify(encrypted, null, 2), 'utf8');
  console.log('🔐 [Sync] Krypteret datapakke opdateret lokalt.');

  // 5. Automatisk build & deploy til GitHub
  console.log('🚀 [Sync] Bygger og sender til GitHub...');
  let deployOutput = '';
  try {
    deployOutput = execSync('bash deploy.sh', { cwd: rootDir, encoding: 'utf8' });
    console.log('✨ [Sync] Deploy til GitHub fuldført!');
  } catch (deployErr) {
    console.error('⚠️ [Sync] Advarsel: GitHub deploy fejlede, men lokale data er opdateret:', deployErr);
    deployOutput = String(deployErr);
  }

  return {
    success: true,
    count: liveItems.length,
    rawLive: liveItems,
    historical: histData,
    timestamp: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
    deployOutput,
  };
}

export async function addManualDonation(donation) {
  console.log('➕ [Manual] Tilføjer manuel donation:', donation);

  const histPath = path.join(rootDir, 'src/data/historical-donations-901600.json');
  const histData = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : [];

  // Tilføj den nye donation
  histData.unshift(donation);

  // Gem lokalt
  fs.writeFileSync(histPath, JSON.stringify(histData, null, 2), 'utf8');

  // Læs live-donations
  const livePath = path.join(rootDir, 'vipps-live-donations.json');
  const liveItems = fs.existsSync(livePath) ? JSON.parse(fs.readFileSync(livePath, 'utf8')) : [];

  // Krypter og gem til encrypted-donations.json
  const payloadToEncrypt = JSON.stringify({
    live: liveItems,
    historical: histData,
    encryptedAt: new Date().toISOString(),
  });

  const encrypted = await encrypt(payloadToEncrypt, DASHBOARD_PASS);
  const encPath = path.join(rootDir, 'src/data/encrypted-donations.json');
  fs.writeFileSync(encPath, JSON.stringify(encrypted, null, 2), 'utf8');
  console.log('🔐 [Manual] Krypteret datapakke opdateret lokalt med manuel donation.');

  // Byg og deploy til GitHub
  console.log('🚀 [Manual] Bygger og sender til GitHub...');
  let deployOutput = '';
  try {
    deployOutput = execSync('bash deploy.sh', { cwd: rootDir, encoding: 'utf8' });
    console.log('✨ [Manual] Deploy til GitHub fuldført!');
  } catch (deployErr) {
    console.error('⚠️ [Manual] Advarsel: GitHub deploy fejlede, men lokale data er opdateret:', deployErr);
    deployOutput = String(deployErr);
  }

  return {
    success: true,
    donation,
    historical: histData,
    rawLive: liveItems,
    timestamp: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
    deployOutput,
  };
}

// Hvis kørt direkte fra kommandolinjen
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncAndDeploy()
    .then(res => console.log('Udført:', res))
    .catch(err => {
      console.error('Fejl:', err);
      process.exit(1);
    });
}

