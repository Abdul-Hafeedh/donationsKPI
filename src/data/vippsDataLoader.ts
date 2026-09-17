import { DonationTransaction, WeekData } from '../types';
import encryptedPayload from './encrypted-donations.json';
import { decryptData, EncryptedPayload } from '../utils/crypto';

// Helper to get ISO week number from Date
export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

// Convert raw Vipps items to clean DonationTransaction list, ignoring amounts under 10 kr
export function parseVippsDonations(items: any[]): DonationTransaction[] {
  return items
    .map((item, idx) => {
      // Proper minor unit correction: Vipps report payments are in øre (100 øre = 1 DKK)
      const amountDkk = Number(((item.amount ?? 0) / 100).toFixed(2));
      const rawName = item.payer?.name || item.payerName || "Anonym";
      const name = rawName.replace(/\s+/g, ' ').trim();
      const dateTime = item.capturedAt || item.paymentDateTimeUtc || new Date().toISOString();

      return {
        id: item.pspReference || item.transactionReference || `vipps-${idx}`,
        dateTime,
        name,
        amount: amountDkk,
        message: item.message || '',
        status: item.status || 'CAPTURED',
        isLive: true,
        mobilePayNumber: '115888' as const,
      };
    })
    .filter((donation) => donation.amount >= 10);
}

// Helper to get localized Danish date range string for an ISO week
export function getWeekDateRange(year: number, week: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (day - 1) * 86400000 + (week - 1) * 7 * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const mStr = monday.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
  const sStr = sunday.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
  return `${mStr} – ${sStr}`;
}

// Aggregate donations into WeekData list combining both numbers into a single source
export function aggregateDonationsByWeek(donations: DonationTransaction[]): WeekData[] {
  const weekMap = new Map<string, WeekData>();

  for (const don of donations) {
    const d = new Date(don.dateTime);
    const { week, year } = getISOWeek(d);
    const key = `${year}-W${week}`;

    if (!weekMap.has(key)) {
      weekMap.set(key, {
        week,
        year,
        totalAmount: 0,
        donationCount: 0,
        averageAmount: 0,
        dateRange: getWeekDateRange(year, week),
        donations: [],
      });
    }

    const entry = weekMap.get(key)!;
    entry.totalAmount += don.amount;
    entry.donationCount += 1;
    entry.donations.push(don);
  }

  const results = Array.from(weekMap.values()).map(w => ({
    ...w,
    totalAmount: Math.round(w.totalAmount * 100) / 100,
    averageAmount: Math.round((w.totalAmount / w.donationCount) * 100) / 100,
  }));

  return results.sort((a, b) => a.year !== b.year ? a.year - b.year : a.week - b.week);
}

export interface DecryptedDonationsBundle {
  liveDonations: DonationTransaction[];
  historicalDonations: DonationTransaction[];
  allDonations: DonationTransaction[];
}

// Unlock and decrypt data bundle using provided password
export async function unlockDonations(password: string): Promise<DecryptedDonationsBundle> {
  const decryptedJsonStr = await decryptData(encryptedPayload as EncryptedPayload, password);
  const rawData = JSON.parse(decryptedJsonStr);

  const live = parseVippsDonations(rawData.live || []);
  const hist = (rawData.historical || []) as DonationTransaction[];
  const all = [...hist, ...live];

  return {
    liveDonations: live,
    historicalDonations: hist,
    allDonations: all,
  };
}
