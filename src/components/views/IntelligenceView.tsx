import { useState, useMemo } from 'react';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Building2,
  DollarSign, Shield, Repeat, BarChart3, CheckCircle, RefreshCw,
  ChevronRight, X, Clock, FileText, Users, Minus,
} from 'lucide-react';
import { VENDOR_PROFILES } from '@/lib/vendorData';
import { VendorProfileModal } from '@/components/modals/VendorProfileModal';
import type { VendorProfile } from '@/lib/vendorData';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type AlertType = 'cost_spike' | 'duplicate' | 'vendor_quality' | 'contract_breach' |
  'coverage_gap' | 'cash_flow' | 'seasonal' | 'market_rate' | 'repeated_service' | 'renewal';

interface PatternAlert {
  id: string; type: AlertType; severity: Severity; title: string;
  description: string; amount: number; recoverable: boolean;
  vendor?: string; property?: string; detectedAt: string; dismissed: boolean;
}

const fmt = (n: number) => '$' + n.toLocaleString();
const fmtK = (n: number) => n >= 1000 ? '$' + (n / 1000).toFixed(0) + 'k' : '$' + n;

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'CRITICAL', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  high:     { label: 'HIGH',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  medium:   { label: 'MEDIUM',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  low:      { label: 'LOW',      color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', dot: '#10B981' },
};

const TYPE_LABELS: Record<AlertType, string> = {
  cost_spike: 'Cost Spike', duplicate: 'Duplicate', vendor_quality: 'Vendor Quality',
  contract_breach: 'Contract Breach', coverage_gap: 'Coverage Gap', cash_flow: 'Cash Flow',
  seasonal: 'Seasonal', market_rate: 'Market Rate', repeated_service: 'Repeated Service', renewal: 'Renewal',
};

// Suppress unused import warnings
const _unused = { TrendingUp, TrendingDown, DollarSign, Shield, Repeat, BarChart3, AlertTriangle, Clock, FileText, Users };
void _unused;

const MOCK_ALERTS: PatternAlert[] = [
  { id: '1', type: 'cost_spike', severity: 'critical', title: 'Maintenance cost spike at 89 Cedar Avenue', description: 'Maintenance costs increased 340% vs. 90-day average. Current month: $4,200. Average: $1,240.', amount: 2960, recoverable: true, vendor: 'HandyPro Services', property: '89 Cedar Avenue', detectedAt: '2 hours ago', dismissed: false },
  { id: '2', type: 'repeated_service', severity: 'critical', title: 'Repeated plumbing issue at 123 Main Street', description: 'Same plumbing vendor dispatched 4 times in 35 days. Total spend: $5,800. Root cause unresolved.', amount: 5800, recoverable: true, vendor: 'QuickFix Plumbing', property: '123 Main Street', detectedAt: '5 hours ago', dismissed: false },
  { id: '3', type: 'duplicate', severity: 'high', title: 'Possible duplicate invoice from Apex IT Solutions', description: 'Invoice #INV-2024-891 appears to duplicate #INV-2024-847 — same amount, same line items, 12 days apart.', amount: 3200, recoverable: true, vendor: 'Apex IT Solutions', detectedAt: '1 day ago', dismissed: false },
  { id: '4', type: 'renewal', severity: 'high', title: 'General Liability policy expires in 23 days', description: 'Policy #GL-2024-0091 expires March 15. Auto-renewal not confirmed. 3 competitive quotes available.', amount: 8400, recoverable: false, vendor: 'Hartford Insurance', detectedAt: '3 days ago', dismissed: false },
  { id: '5', type: 'market_rate', severity: 'medium', title: 'Landscaping rates 28% above market benchmark', description: 'Current contract at $1,850/month. Market average for comparable properties: $1,445/month.', amount: 4860, recoverable: true, vendor: 'GreenScape Pro', detectedAt: '1 week ago', dismissed: false },
  { id: '6', type: 'contract_breach', severity: 'medium', title: 'HVAC vendor exceeded agreed response time SLA', description: 'Contract requires 4-hour emergency response. Last 3 calls averaged 7.2 hours. Penalty clause applies.', amount: 1500, recoverable: true, vendor: 'CoolAir HVAC', detectedAt: '2 days ago', dismissed: false },
  { id: '7', type: 'cash_flow', severity: 'low', title: 'Unusually high Q1 spend vs. prior year', description: 'Q1 operational spend is 22% above Q1 2023. Primary drivers: maintenance (+41%) and utilities (+18%).', amount: 12400, recoverable: false, detectedAt: '1 week ago', dismissed: false },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
      <div className="text-xs font-medium text-[#64748B] mb-1 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? '#0F172A' }}>{value}</div>
      {sub && <div className="text-xs text-[#94A3B8] mt-0.5">{sub}</div>}
    </div>
  );
}

function AlertCard({ alert, onDismiss }: { alert: PatternAlert; onDismiss: (id: string) => void }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
              <span className="text-[11px] text-[#64748B]">{TYPE_LABELS[alert.type]}</span>
              {alert.vendor && <span className="text-[11px] text-[#94A3B8]">· {alert.vendor}</span>}
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-1 leading-snug">{alert.title}</h3>
            <p className="text-xs text-[#64748B] leading-relaxed mb-2">{alert.description}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: alert.recoverable ? '#F0FDF4' : '#FEF2F2', color: alert.recoverable ? '#059669' : '#DC2626' }}>
                {fmt(alert.amount)} {alert.recoverable ? '· recoverable' : '· at risk'}
              </span>
              <span className="text-[11px] text-[#94A3B8]">{alert.detectedAt}</span>
            </div>
          </div>
        </div>
        <button onClick={() => onDismiss(alert.id)} className="text-[#CBD5E1] hover:text-[#64748B] transition-colors flex-shrink-0 mt-0.5"><X size={14} /></button>
      </div>
      <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
        <button className="flex items-center gap-1 text-xs font-medium text-[#3B82F6] hover:text-blue-700 transition-colors">
          View recommendation <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Mini sparkline for vendor card ──────────────────────────────────────────
function MiniSparkline({ vendor }: { vendor: VendorProfile }) {
  const recent = vendor.monthlySpend.filter(m => m.year === 2025).slice(0, 3);
  if (recent.length < 2) return null;
  const max = Math.max(...recent.map(m => m.amount));
  return (
    <div className="flex items-end gap-0.5 h-6">
      {recent.map((m, i) => (
        <div
          key={i}
          className="w-3 rounded-t-sm"
          style={{
            height: `${Math.max(20, (m.amount / max) * 100)}%`,
            backgroundColor: vendor.trend === 'up' ? '#10B981' : vendor.trend === 'down' ? '#EF4444' : '#94A3B8',
            opacity: 0.6 + i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// ─── Vendor Card ─────────────────────────────────────────────────────────────
function VendorCard({ vendor, onClick }: { vendor: VendorProfile; onClick: () => void }) {
  const trendIcon = vendor.trend === 'up'
    ? <TrendingUp size={12} className="text-emerald-500" />
    : vendor.trend === 'down'
    ? <TrendingDown size={12} className="text-red-500" />
    : <Minus size={12} className="text-slate-400" />;

  const scoreColor = vendor.reputationScore >= 75 ? '#10B981' : vendor.reputationScore >= 50 ? '#F59E0B' : '#EF4444';
  const scoreLabel = vendor.reputationScore >= 75 ? 'Good' : vendor.reputationScore >= 50 ? 'Fair' : 'At Risk';

  // Last 3 months spend for this vendor
  const recentSpend = vendor.monthlySpend
    .filter(m => m.year === 2025)
    .slice(0, 3)
    .reduce((s, m) => s + m.amount, 0);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md hover:border-[#BFDBFE] transition-all cursor-pointer group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-[#3B82F6]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[#0F172A] group-hover:text-[#3B82F6] transition-colors">{vendor.name}</span>
              {trendIcon}
            </div>
            <span className="text-[10px] text-[#94A3B8] bg-[#F8FAFC] border border-[#F1F5F9] px-1.5 py-0.5 rounded-full">{vendor.category}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold text-[#0F172A]">{fmtK(vendor.totalSpend)}</div>
          <div className="text-[10px] text-[#94A3B8]">total spend</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">Reputation</span>
          <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
        </div>
        <ScoreBar score={vendor.reputationScore} />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1"><FileText size={10} />{vendor.invoiceCount} invoices</span>
          {vendor.flaggedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle size={10} />{vendor.flaggedCount} flagged
            </span>
          )}
          {vendor.flaggedCount === 0 && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle size={10} />Clean
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MiniSparkline vendor={vendor} />
          <span className="text-[10px] text-[#94A3B8]">{fmtK(recentSpend)} / 3mo</span>
        </div>
      </div>

      {/* Click hint */}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors">
        <span>View full profile</span>
        <ChevronRight size={10} />
      </div>
    </div>
  );
}

// ─── Vendor Intelligence Panel ────────────────────────────────────────────────
function VendorIntelligencePanel() {
  const [selectedVendor, setSelectedVendor] = useState<VendorProfile | null>(null);
  const [sortBy, setSortBy] = useState<'spend' | 'score' | 'flagged' | 'recent'>('spend');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = [...new Set(VENDOR_PROFILES.map(v => v.category))].sort();
    return ['all', ...cats];
  }, []);

  const sorted = useMemo(() => {
    let list = [...VENDOR_PROFILES];
    if (filterCategory !== 'all') list = list.filter(v => v.category === filterCategory);
    if (sortBy === 'spend') list.sort((a, b) => b.totalSpend - a.totalSpend);
    else if (sortBy === 'score') list.sort((a, b) => b.reputationScore - a.reputationScore);
    else if (sortBy === 'flagged') list.sort((a, b) => b.flaggedCount - a.flaggedCount);
    else if (sortBy === 'recent') list.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
    return list;
  }, [sortBy, filterCategory]);

  const totalSpend = VENDOR_PROFILES.reduce((s, v) => s + v.totalSpend, 0);
  const totalFlagged = VENDOR_PROFILES.reduce((s, v) => s + v.flaggedCount, 0);
  const avgScore = Math.round(VENDOR_PROFILES.reduce((s, v) => s + v.reputationScore, 0) / VENDOR_PROFILES.length);

  return (
    <>
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Vendors Tracked', value: VENDOR_PROFILES.length, sub: 'auto-profiled', color: '#3B82F6', icon: <Building2 size={14} className="text-[#3B82F6]" /> },
          { label: 'Total Spend', value: fmtK(totalSpend), sub: 'all vendors, all time', color: '#0F172A', icon: <DollarSign size={14} className="text-[#10B981]" /> },
          { label: 'Flagged Invoices', value: totalFlagged, sub: 'across all vendors', color: totalFlagged > 0 ? '#D97706' : '#059669', icon: <AlertTriangle size={14} className="text-[#F59E0B]" /> },
          { label: 'Avg Reputation', value: avgScore + '/100', sub: avgScore >= 65 ? 'Portfolio healthy' : 'Needs attention', color: avgScore >= 65 ? '#059669' : '#D97706', icon: <BarChart3 size={14} className="text-[#8B5CF6]" /> },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">{kpi.icon}<span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">{kpi.label}</span></div>
            <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Vendor Profiles</h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Profiles are built automatically — click any vendor to see their full spend history
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="spend">Sort: Total Spend</option>
            <option value="score">Sort: Reputation</option>
            <option value="flagged">Sort: Most Flagged</option>
            <option value="recent">Sort: Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Vendor grid */}
      <div className="grid grid-cols-2 gap-3">
        {sorted.map(vendor => (
          <VendorCard key={vendor.id} vendor={vendor} onClick={() => setSelectedVendor(vendor)} />
        ))}
      </div>

      {/* Onboarding note */}
      <div className="mt-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Brain size={13} className="text-[#3B82F6]" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[#0F172A] mb-0.5">How vendor profiles work</div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            A profile is created the first time Dominion encounters a vendor in your documents. Every subsequent invoice, contract, or order enriches the profile — building a complete picture of spend by month, quarter, and year, alongside reputation scoring and anomaly history. The more you use Dominion, the smarter each profile becomes.
          </p>
        </div>
      </div>

      {/* Profile modal */}
      {selectedVendor && (
        <VendorProfileModal vendor={selectedVendor} onClose={() => setSelectedVendor(null)} />
      )}
    </>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

type TabId = 'alerts' | 'vendors' | 'monthly';

export default function IntelligenceView() {
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('alerts');
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const critical = activeAlerts.filter(a => a.severity === 'critical');
  const high = activeAlerts.filter(a => a.severity === 'high');
  const totalRecoverable = activeAlerts.filter(a => a.recoverable).reduce((s, a) => s + a.amount, 0);
  const filteredAlerts = filterType === 'all' ? activeAlerts : activeAlerts.filter(a => a.type === filterType);
  const dismiss = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  const alertTypeCounts = activeAlerts.reduce((acc, a) => { acc[a.type] = (acc[a.type] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'alerts', label: 'Alerts', count: activeAlerts.length },
    { id: 'vendors', label: 'Vendor Intelligence', count: VENDOR_PROFILES.length },
    { id: 'monthly', label: 'Monthly Report' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
            <Brain size={18} className="text-[#3B82F6]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">AI Operational Intelligence</h2>
            <p className="text-xs text-[#64748B]">Pattern detection · Vendor profiling · Continuous monitoring</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#DBEAFE] transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Active Alerts" value={activeAlerts.length} sub={`${critical.length} critical`} color={critical.length > 0 ? '#DC2626' : '#0F172A'} />
        <StatCard label="Recoverable Savings" value={fmt(totalRecoverable)} sub="flagged this month" color="#059669" />
        <StatCard label="Critical Issues" value={critical.length} sub="need immediate action" color={critical.length > 0 ? '#DC2626' : '#0F172A'} />
        <StatCard label="Vendors Profiled" value={VENDOR_PROFILES.length} sub="auto-tracked" color="#3B82F6" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1 mb-5">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center ${activeTab === tab.id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-[#EFF6FF] text-[#3B82F6]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Alerts Tab ── */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterType === 'all' ? 'bg-[#3B82F6] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'}`}>All ({activeAlerts.length})</button>
              {(Object.entries(alertTypeCounts) as [AlertType, number][]).map(([type, count]) => (
                <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterType === type ? 'bg-[#3B82F6] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'}`}>
                  {TYPE_LABELS[type]} ({count})
                </button>
              ))}
            </div>
            {filteredAlerts.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center shadow-sm">
                <CheckCircle size={28} className="text-[#10B981] mx-auto mb-3" />
                <div className="text-sm font-semibold text-[#0F172A] mb-1">No alerts in this category</div>
                <div className="text-xs text-[#64748B]">Upload documents to begin monitoring vendors, invoices, and contracts</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map(alert => <AlertCard key={alert.id} alert={alert} onDismiss={dismiss} />)}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Detection Summary</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#F8FAFC] rounded-lg p-2"><div className="text-base font-bold text-[#0F172A]">{critical.length}</div><div className="text-[10px] text-[#94A3B8] leading-tight">Invoice Mismatches</div></div>
                <div className="bg-[#F8FAFC] rounded-lg p-2"><div className="text-base font-bold text-[#0F172A]">{alertTypeCounts['duplicate'] ?? 0}</div><div className="text-[10px] text-[#94A3B8] leading-tight">Contract Mismatches</div></div>
                <div className="bg-[#F8FAFC] rounded-lg p-2"><div className="text-base font-bold text-[#0F172A]">{alertTypeCounts['cost_spike'] ?? 0}</div><div className="text-[10px] text-[#94A3B8] leading-tight">Price Increases</div></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Portfolio Health</div>
                <span className="text-xs font-bold text-[#059669]">{critical.length === 0 ? 'Good' : critical.length <= 2 ? 'Fair' : 'At Risk'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-bold text-[#0F172A]">{activeAlerts.length}</div><div className="text-[10px] text-[#94A3B8]">Total Alerts</div></div>
                <div><div className="text-lg font-bold text-[#DC2626]">{critical.length}</div><div className="text-[10px] text-[#94A3B8]">Critical</div></div>
                <div><div className="text-lg font-bold text-[#D97706]">{high.length}</div><div className="text-[10px] text-[#94A3B8]">High</div></div>
              </div>
            </div>
            <div className="bg-[#F0FDF4] rounded-xl border border-[#BBF7D0] p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-bold text-[#059669] uppercase tracking-wide">Engine Active</span>
              </div>
              <div className="text-xs text-[#065F46]">Upload documents to begin monitoring vendors, invoices, and contracts</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Vendor Intelligence Tab ── */}
      {activeTab === 'vendors' && <VendorIntelligencePanel />}

      {/* ── Monthly Report Tab ── */}
      {activeTab === 'monthly' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Spend by Category</h3>
            {[
              { label: 'Maintenance', amount: 28400, pct: 34 },
              { label: 'Technology', amount: 18200, pct: 22 },
              { label: 'Insurance', amount: 14800, pct: 18 },
              { label: 'Utilities', amount: 11200, pct: 13 },
              { label: 'Landscaping', amount: 7400, pct: 9 },
              { label: 'Other', amount: 3200, pct: 4 },
            ].map(item => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span className="text-[#0F172A] font-medium">{item.label}</span><span className="text-[#64748B]">{fmt(item.amount)}</span></div>
                <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden"><div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${item.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Month Summary</h3>
              {[
                { label: 'Total Spend', value: activeAlerts.length > 0 ? fmt(83200) : '—', color: '#0F172A' },
                { label: 'Flagged for Review', value: totalRecoverable > 0 ? fmt(totalRecoverable) : '—', color: '#D97706' },
                { label: 'Recovered / Saved', value: activeAlerts.length > 0 ? fmt(4800) : '—', color: '#059669' },
                { label: 'Alerts Generated', value: String(activeAlerts.length), color: '#3B82F6' },
                { label: 'Vendors Monitored', value: String(VENDOR_PROFILES.length), color: '#0F172A' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-xs text-[#64748B]">{row.label}</span>
                  <span className="text-sm font-semibold" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] p-4">
              <div className="flex items-center gap-2 mb-2"><Brain size={14} className="text-[#3B82F6]" /><span className="text-xs font-bold text-[#1D4ED8]">AI Insight</span></div>
              <p className="text-xs text-[#1E40AF] leading-relaxed">
                {activeAlerts.length > 0
                  ? 'Patterns detected across your documents. Review the Alerts tab for actionable findings.'
                  : `${VENDOR_PROFILES.length} vendor profiles are active. Connect your inbox to start detecting anomalies and building real-time spend intelligence.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
