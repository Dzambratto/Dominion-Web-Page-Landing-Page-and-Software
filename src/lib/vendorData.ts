// ─── Vendor Intelligence Data Model ──────────────────────────────────────────

export type VendorTrend = 'up' | 'down' | 'stable';
export type VendorRelationship = 'vendor' | 'customer' | 'both';

export interface VendorTransaction {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number;
  type: 'invoice' | 'contract' | 'order' | 'payment';
  status: 'paid' | 'pending' | 'flagged' | 'disputed';
  flagReason?: string;
}

export interface VendorMonthlySpend {
  month: string;   // e.g. "Jan 2024"
  year: number;
  monthIndex: number; // 0-11
  amount: number;
  invoiceCount: number;
  flaggedCount: number;
}

export interface VendorProfile {
  id: string;
  name: string;
  category: string;
  relationship: VendorRelationship;
  reputationScore: number;
  totalSpend: number;
  invoiceCount: number;
  flaggedCount: number;
  avgResponseTime: string;
  trend: VendorTrend;
  firstSeen: string;      // ISO date
  lastActivity: string;   // ISO date
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  notes?: string;
  monthlySpend: VendorMonthlySpend[];
  transactions: VendorTransaction[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildMonthlySpend(
  baseAmounts: number[],
  flagRates: number[],
  startYear = 2024
): VendorMonthlySpend[] {
  return baseAmounts.map((amount, i) => {
    const year = i >= 12 ? startYear + 1 : startYear;
    const monthIndex = i % 12;
    const flaggedCount = Math.round((flagRates[i] ?? 0) * Math.ceil(amount / 1200));
    return {
      month: `${MONTHS[monthIndex]} ${year}`,
      year,
      monthIndex,
      amount,
      invoiceCount: Math.max(1, Math.ceil(amount / 1200)),
      flaggedCount,
    };
  });
}

function buildTransactions(
  vendorName: string,
  monthly: VendorMonthlySpend[]
): VendorTransaction[] {
  const txns: VendorTransaction[] = [];
  let txId = 1;
  monthly.forEach(m => {
    const count = m.invoiceCount;
    for (let i = 0; i < count; i++) {
      const day = Math.min(28, Math.floor((i / count) * 28) + 1);
      const dateStr = `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const perInvoice = Math.round(m.amount / count);
      const flagged = i < m.flaggedCount;
      txns.push({
        id: `${vendorName.slice(0, 3).toUpperCase()}-${String(txId++).padStart(4, '0')}`,
        date: dateStr,
        description: `Invoice from ${vendorName}`,
        amount: perInvoice,
        type: 'invoice',
        status: flagged ? 'flagged' : 'paid',
        flagReason: flagged ? 'Amount exceeds contract rate' : undefined,
      });
    }
  });
  return txns.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Mock Vendor Data ─────────────────────────────────────────────────────────

const handyProMonthly = buildMonthlySpend(
  [1800, 2100, 1950, 2400, 2200, 1600, 1400, 1900, 2800, 3200, 4200, 2600,
   2100, 2300, 2050, 2700, 2500, 1800, 1600, 2100, 3000, 3500, 4500, 2900],
  [0, 0.1, 0, 0.2, 0.1, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.2,
   0, 0.1, 0, 0.2, 0.1, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.2]
);

const quickFixMonthly = buildMonthlySpend(
  [800, 600, 1200, 900, 700, 500, 400, 600, 1100, 1400, 2200, 1800,
   900, 700, 1300, 1000, 800, 600, 500, 700, 1200, 1500, 2400, 2000],
  [0.1, 0.2, 0.3, 0.2, 0.1, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.3,
   0.1, 0.2, 0.3, 0.2, 0.1, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.3]
);

const greenScapeMonthly = buildMonthlySpend(
  [1200, 1200, 1600, 1850, 1850, 1850, 1850, 1850, 1850, 1600, 1200, 1200,
   1300, 1300, 1700, 1950, 1950, 1950, 1950, 1950, 1950, 1700, 1300, 1300],
  [0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0, 0]
);

const apexITMonthly = buildMonthlySpend(
  [2800, 2800, 3200, 2800, 2800, 3600, 2800, 2800, 3200, 2800, 3600, 4200,
   3000, 3000, 3400, 3000, 3000, 3800, 3000, 3000, 3400, 3000, 3800, 4400],
  [0, 0, 0.1, 0, 0, 0.1, 0, 0, 0.1, 0, 0.2, 0.1,
   0, 0, 0.1, 0, 0, 0.1, 0, 0, 0.1, 0, 0.2, 0.1]
);

const coolAirMonthly = buildMonthlySpend(
  [600, 600, 800, 1200, 2400, 3200, 3600, 3200, 2400, 1200, 800, 600,
   700, 700, 900, 1300, 2600, 3400, 3800, 3400, 2600, 1300, 900, 700],
  [0, 0, 0, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1, 0, 0, 0,
   0, 0, 0, 0.1, 0.1, 0.2, 0.2, 0.2, 0.1, 0, 0, 0]
);

const secureGuardMonthly = buildMonthlySpend(
  [1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200,
   1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
);

export const VENDOR_PROFILES: VendorProfile[] = [
  {
    id: 'v1',
    name: 'HandyPro Services',
    category: 'Maintenance',
    relationship: 'vendor',
    reputationScore: 42,
    totalSpend: handyProMonthly.reduce((s, m) => s + m.amount, 0),
    invoiceCount: handyProMonthly.reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: handyProMonthly.reduce((s, m) => s + m.flaggedCount, 0),
    avgResponseTime: '6.2 hrs',
    trend: 'down',
    firstSeen: '2024-01-08',
    lastActivity: '2025-03-10',
    contactEmail: 'billing@handypro.com',
    contactPhone: '(555) 210-4400',
    website: 'handypro.com',
    notes: 'Primary maintenance vendor. Repeated SLA violations. Consider switching.',
    monthlySpend: handyProMonthly,
    transactions: buildTransactions('HandyPro Services', handyProMonthly),
  },
  {
    id: 'v2',
    name: 'QuickFix Plumbing',
    category: 'Plumbing',
    relationship: 'vendor',
    reputationScore: 38,
    totalSpend: quickFixMonthly.reduce((s, m) => s + m.amount, 0),
    invoiceCount: quickFixMonthly.reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: quickFixMonthly.reduce((s, m) => s + m.flaggedCount, 0),
    avgResponseTime: '4.8 hrs',
    trend: 'down',
    firstSeen: '2024-02-14',
    lastActivity: '2025-03-08',
    contactEmail: 'accounts@quickfixplumbing.com',
    contactPhone: '(555) 334-8821',
    notes: 'Recurring issue at 123 Main St. Root cause unresolved after 4 visits.',
    monthlySpend: quickFixMonthly,
    transactions: buildTransactions('QuickFix Plumbing', quickFixMonthly),
  },
  {
    id: 'v3',
    name: 'GreenScape Pro',
    category: 'Landscaping',
    relationship: 'vendor',
    reputationScore: 71,
    totalSpend: greenScapeMonthly.reduce((s, m) => s + m.amount, 0),
    invoiceCount: greenScapeMonthly.reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: greenScapeMonthly.reduce((s, m) => s + m.flaggedCount, 0),
    avgResponseTime: '24 hrs',
    trend: 'stable',
    firstSeen: '2024-01-15',
    lastActivity: '2025-03-01',
    contactEmail: 'invoices@greenscapepro.com',
    contactPhone: '(555) 778-2290',
    website: 'greenscapepro.com',
    notes: 'Rates 28% above market benchmark. Renegotiation due at contract renewal.',
    monthlySpend: greenScapeMonthly,
    transactions: buildTransactions('GreenScape Pro', greenScapeMonthly),
  },
  {
    id: 'v4',
    name: 'Apex IT Solutions',
    category: 'Technology',
    relationship: 'vendor',
    reputationScore: 65,
    totalSpend: apexITMonthly.reduce((s, m) => s + m.amount, 0),
    invoiceCount: apexITMonthly.reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: apexITMonthly.reduce((s, m) => s + m.flaggedCount, 0),
    avgResponseTime: '2.1 hrs',
    trend: 'stable',
    firstSeen: '2024-01-03',
    lastActivity: '2025-03-12',
    contactEmail: 'billing@apexit.com',
    contactPhone: '(555) 901-5544',
    website: 'apexit.com',
    notes: 'Duplicate invoice detected in Q4 2024. Resolved after dispute.',
    monthlySpend: apexITMonthly,
    transactions: buildTransactions('Apex IT Solutions', apexITMonthly),
  },
  {
    id: 'v5',
    name: 'CoolAir HVAC',
    category: 'HVAC',
    relationship: 'vendor',
    reputationScore: 58,
    totalSpend: coolAirMonthly.reduce((s, m) => s + m.amount, 0),
    invoiceCount: coolAirMonthly.reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: coolAirMonthly.reduce((s, m) => s + m.flaggedCount, 0),
    avgResponseTime: '7.2 hrs',
    trend: 'down',
    firstSeen: '2024-01-20',
    lastActivity: '2025-02-28',
    contactEmail: 'service@coolair.com',
    contactPhone: '(555) 456-7890',
    notes: 'SLA breach: contract requires 4-hr response, averaging 7.2 hrs. Penalty clause active.',
    monthlySpend: coolAirMonthly,
    transactions: buildTransactions('CoolAir HVAC', coolAirMonthly),
  },
  {
    id: 'v6',
    name: 'SecureGuard',
    category: 'Security',
    relationship: 'vendor',
    reputationScore: 89,
    totalSpend: secureGuardMonthly.reduce((s, m) => s + m.amount, 0),
    invoiceCount: secureGuardMonthly.reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: secureGuardMonthly.reduce((s, m) => s + m.flaggedCount, 0),
    avgResponseTime: '1.5 hrs',
    trend: 'up',
    firstSeen: '2024-01-01',
    lastActivity: '2025-03-15',
    contactEmail: 'accounts@secureguard.com',
    contactPhone: '(555) 123-9900',
    website: 'secureguard.com',
    notes: 'Best-performing vendor. Zero flagged invoices. Recommend for contract renewal.',
    monthlySpend: secureGuardMonthly,
    transactions: buildTransactions('SecureGuard', secureGuardMonthly),
  },
];

// ─── Aggregation helpers ──────────────────────────────────────────────────────

export function getQuarterlySpend(vendor: VendorProfile, year: number) {
  const months = vendor.monthlySpend.filter(m => m.year === year);
  const quarters = [
    { label: 'Q1', months: [0, 1, 2] },
    { label: 'Q2', months: [3, 4, 5] },
    { label: 'Q3', months: [6, 7, 8] },
    { label: 'Q4', months: [9, 10, 11] },
  ];
  return quarters.map(q => ({
    label: `${q.label} ${year}`,
    amount: months.filter(m => q.months.includes(m.monthIndex)).reduce((s, m) => s + m.amount, 0),
    invoiceCount: months.filter(m => q.months.includes(m.monthIndex)).reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: months.filter(m => q.months.includes(m.monthIndex)).reduce((s, m) => s + m.flaggedCount, 0),
  }));
}

export function getYearlySpend(vendor: VendorProfile) {
  const years = [...new Set(vendor.monthlySpend.map(m => m.year))].sort();
  return years.map(year => ({
    label: String(year),
    amount: vendor.monthlySpend.filter(m => m.year === year).reduce((s, m) => s + m.amount, 0),
    invoiceCount: vendor.monthlySpend.filter(m => m.year === year).reduce((s, m) => s + m.invoiceCount, 0),
    flaggedCount: vendor.monthlySpend.filter(m => m.year === year).reduce((s, m) => s + m.flaggedCount, 0),
  }));
}

export function getAvailableYears(vendor: VendorProfile): number[] {
  return [...new Set(vendor.monthlySpend.map(m => m.year))].sort((a, b) => b - a);
}
