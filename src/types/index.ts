export type DonationTransaction = {
  id: string;
  dateTime: string;
  name: string;
  amount: number; // in DKK (kr.)
  message?: string;
  status: string;
  isLive?: boolean;
  mobilePayNumber?: '901600' | '115888';
};

export type WeekData = {
  week: number;
  year: number;
  totalAmount: number;
  donationCount: number;
  averageAmount: number;
  dateRange: string;
  donations: DonationTransaction[];
  mobilePayNumber?: '901600' | '115888' | 'begge';
};

export type DenominationStat = {
  amount: number;
  count: number;
  percentage: number;
};

export type DashboardStats = {
  targetPerEvent: number;
  averagePerEvent: number;
  averagePerDonation: number;
  donationsPerEvent: number;
  totalDonationsCount: number;
  totalDonatedAmount: number;
  largestAmounts: number[];
  selectedLargestAmount: number;
  denominations: DenominationStat[];
  weeks: WeekData[];
};
