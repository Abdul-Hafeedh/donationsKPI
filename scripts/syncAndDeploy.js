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

  // Læs historiske data hvis tilgængelige (eller gendan fra backup hvis filen mangler)
  const histPath = path.join(rootDir, 'src/data/historical-donations-901600.json');
  const backupDir = path.join(rootDir, 'src/data/backups');
  let histData = [];

  if (fs.existsSync(histPath)) {
    histData = JSON.parse(fs.readFileSync(histPath, 'utf8'));
  } else if (fs.existsSync(path.join(backupDir, 'historical-donations-latest.backup.json'))) {
    console.log('🛡️ [Safety] Gendanner historiske data fra automatisk backup...');
    histData = JSON.parse(fs.readFileSync(path.join(backupDir, 'historical-donations-latest.backup.json'), 'utf8'));
    fs.writeFileSync(histPath, JSON.stringify(histData, null, 2), 'utf8');
  }

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
  const backupDir = path.join(rootDir, 'src/data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const histData = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : [];

  // Sikkerhedstjek: Undgå at duplikere samme id
  if (!histData.some(d => d.id === donation.id)) {
    histData.unshift(donation);
  }

  // 1. Skriv til den primære historiske fil
  fs.writeFileSync(histPath, JSON.stringify(histData, null, 2), 'utf8');

  // 2. Skriv en automatisk sikkerhedskopi med datostempel
  const todayStr = new Date().toISOString().split('T')[0];
  const dateBackupPath = path.join(backupDir, `historical-${todayStr}.json`);
  fs.writeFileSync(dateBackupPath, JSON.stringify(histData, null, 2), 'utf8');

  // 3. Fast rullende backup
  const rollingBackupPath = path.join(backupDir, `historical-donations-latest.backup.json`);
  fs.writeFileSync(rollingBackupPath, JSON.stringify(histData, null, 2), 'utf8');

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

export async function importCsvTransactions(csvContent) {
  console.log('📄 [CSV Import] Behandler MobilePay transaktionsrapport...');

  const histPath = path.join(rootDir, 'src/data/historical-donations-901600.json');
  const backupDir = path.join(rootDir, 'src/data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const histData = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : [];
  const existingIds = new Set(histData.map(d => String(d.id)));

  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV-filen er tom eller mangler rækker.');
  }

  const header = lines[0].split(';');
  const typeIdx = header.indexOf('Type');
  const idIdx = header.indexOf('Transaktions ID');
  const amountIdx = header.indexOf('Beløb');
  const dateIdx = header.indexOf('Tidsstempel');
  const nameIdx = header.indexOf('Kundenavn');
  const msgIdx = header.indexOf('Besked');
  const msnIdx = header.indexOf('MyShop Nummer');

  const addedItems = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const parts = row.split(';');

    const type = (typeIdx !== -1 ? parts[typeIdx] : parts[5])?.trim();
    // Vi filtrerer kun faktiske betalinger / donationer, ikke 'Gebyr'
    if (type !== 'Betaling') {
      continue;
    }

    const id = (idIdx !== -1 ? parts[idIdx] : parts[14])?.trim();
    if (!id || existingIds.has(id)) {
      continue;
    }

    const rawAmt = (amountIdx !== -1 ? parts[amountIdx] : parts[6])?.trim().replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(rawAmt);
    if (isNaN(amount)) continue;

    const dateTime = (dateIdx !== -1 ? parts[dateIdx] : parts[10])?.trim();
    const name = (nameIdx !== -1 ? parts[nameIdx] : parts[15])?.trim() || '';
    const message = (msgIdx !== -1 ? parts[msgIdx] : parts[11])?.trim() || '';
    const rawMsn = (msnIdx !== -1 ? parts[msnIdx] : parts[18])?.trim() || '';
    const mobilePayNumber = rawMsn.replace(/^DK:/, '') || '901600';

    const newRecord = {
      id,
      dateTime,
      name,
      amount,
      message,
      status: 'COMPLETED',
      isLive: false,
      mobilePayNumber,
    };

    addedItems.push(newRecord);
    existingIds.add(id);
  }

  console.log(`✅ [CSV Import] Fandt ${addedItems.length} nye donationer i CSV.`);

  if (addedItems.length > 0) {
    // Sæt nye donationer ind forrest og sorter faldende efter tidspunkt
    const updatedHist = [...addedItems, ...histData].sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );

    // 1. Skriv til den primære historiske fil
    fs.writeFileSync(histPath, JSON.stringify(updatedHist, null, 2), 'utf8');

    // 2. Skriv sikkerhedskopi med datostempel
    const todayStr = new Date().toISOString().split('T')[0];
    const dateBackupPath = path.join(backupDir, `historical-${todayStr}.json`);
    fs.writeFileSync(dateBackupPath, JSON.stringify(updatedHist, null, 2), 'utf8');

    // 3. Fast rullende backup
    const rollingBackupPath = path.join(backupDir, 'historical-donations-latest.backup.json');
    fs.writeFileSync(rollingBackupPath, JSON.stringify(updatedHist, null, 2), 'utf8');

    // Læs live-donations
    const livePath = path.join(rootDir, 'vipps-live-donations.json');
    const liveItems = fs.existsSync(livePath) ? JSON.parse(fs.readFileSync(livePath, 'utf8')) : [];

    // Krypter og gem til encrypted-donations.json
    const payloadToEncrypt = JSON.stringify({
      live: liveItems,
      historical: updatedHist,
      encryptedAt: new Date().toISOString(),
    });

    const encrypted = await encrypt(payloadToEncrypt, DASHBOARD_PASS);
    const encPath = path.join(rootDir, 'src/data/encrypted-donations.json');
    fs.writeFileSync(encPath, JSON.stringify(encrypted, null, 2), 'utf8');
    console.log('🔐 [CSV Import] Krypteret datapakke opdateret med CSV-donationer.');

    // Byg og deploy til GitHub
    console.log('🚀 [CSV Import] Bygger og sender til GitHub...');
    let deployOutput = '';
    try {
      deployOutput = execSync('bash deploy.sh', { cwd: rootDir, encoding: 'utf8' });
      console.log('✨ [CSV Import] Deploy til GitHub fuldført!');
    } catch (deployErr) {
      console.error('⚠️ [CSV Import] Advarsel: GitHub deploy fejlede, men lokale data er opdateret:', deployErr);
      deployOutput = String(deployErr);
    }

    return {
      success: true,
      addedCount: addedItems.length,
      addedItems,
      totalCount: updatedHist.length,
      deployOutput,
    };
  } else {
    return {
      success: true,
      addedCount: 0,
      addedItems: [],
      totalCount: histData.length,
      message: 'Alle transaktioner fra CSV eksisterede allerede i databasen.',
    };
  }
}

// Hvis kørt direkte fra kommandolinjen
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argFile = process.argv[2];
  if (argFile && fs.existsSync(argFile)) {
    console.log(`Læser CSV fil fra parameter: ${argFile}`);
    const content = fs.readFileSync(argFile, 'utf8');
    importCsvTransactions(content)
      .then(res => console.log('CSV Import færdig:', res))
      .catch(err => {
        console.error('CSV Import fejl:', err);
        process.exit(1);
      });
  } else {
    syncAndDeploy()
      .then(res => console.log('Udført:', res))
      .catch(err => {
        console.error('Fejl:', err);
        process.exit(1);
      });
  }
}


