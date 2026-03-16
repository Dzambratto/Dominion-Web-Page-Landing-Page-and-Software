import { useState, useMemo } from 'react';
import {
  X, Building2, TrendingUp, TrendingDown, Minus,
  Calendar, DollarSign, AlertTriangle, CheckCircle,
  Mail, Phone, Globe, FileText, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import {
  VendorProfile, getQuarterlySpend, getYearlySpend, getAvailableYears,
} from '@/lib/vendorData';

const fmt = (n: number) =>
  n >= 1_000_000
    ? '$' + (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
    ? '$' + (n / 1_000).toFixed(1) + 'k'
    : '$' + n.toLocaleString();

const fmtFull = (n: number) => '$' + n.toLocaleString();

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type SpendView = 'monthly' | 'quarterly' | 'yearly';

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function BarChart({
  data,
  maxAmount,
  highlightIndex,
  onHover,
}: {
  data: { label: string; amount: number; flaggedCount: number }[];
  maxAmount: number;
  highlightIndex: number | null;
  onHover: (i: number | null) => void;
}) {
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((bar, i) => {
        const pct = maxAmount > 0 ? (bar.amount / maxAmount) * 100 : 0;
        const isHighlighted = highlightIndex === i;
        const hasFlagged = bar.flaggedCount > 0;
        return (
          <div
            key={bar.label}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
          >
            <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
              <div
                className="w-full rounded-t-sm transition-all duration-150"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  backgroundColor: isHighlighted
                    ? '#3B82F6'
                    : hasFlagged
                    ? '#F59E0B'
                    : '#BFDBFE',
                  opacity: highlightIndex !== null && !isHighlighted ? 0.5 : 1,
                }}
              />
            </div>
            <span
              className="text-[9px] text-center leading-tight"
              style={{ color: isHighlighted ? '#1D4ED8' : '#94A3B8' }}
            >
              {bar.label.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'At Risk';
  const circumference = 2 * Math.PI * 28;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r="28" fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle
          cx="40" cy="40" r="28" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black" style={{ color }}>{score}</span>
        <span className="text-[9px] font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface VendorProfileModalProps {
  vendor: VendorProfile;
  onClose: () => void;
}

export function VendorProfileModal({ vendor, onClose }: VendorProfileModalProps) {
  const [spendView, setSpendView] = useState<SpendView>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [txPage, setTxPage] = useState(0);
  const TX_PAGE_SIZE = 8;

  const availableYears = useMemo(() => getAvailableYears(vendor), [vendor]);

  const chartData = useMemo(() => {
    if (spendView === 'monthly') {
      return vendor.monthlySpend
        .filter(m => m.year === selectedYear)
        .map(m => ({ label: m.month, amount: m.amount, flaggedCount: m.flaggedCount, invoiceCount: m.invoiceCount }));
    }
    if (spendView === 'quarterly') {
      return getQuarterlySpend(vendor, selectedYear).map(q => ({
        label: q.label, amount: q.amount, flaggedCount: q.flaggedCount, invoiceCount: q.invoiceCount,
      }));
    }
    return getYearlySpend(vendor).map(y => ({
      label: y.label, amount: y.amount, flaggedCount: y.flaggedCount, invoiceCount: y.invoiceCount,
    }));
  }, [vendor, spendView, selectedYear]);

  const maxAmount = useMemo(() => Math.max(...chartData.map(d => d.amount), 1), [chartData]);

  const totalForView = chartData.reduce((s, d) => s + d.amount, 0);
  const flaggedForView = chartData.reduce((s, d) => s + d.flaggedCount, 0);
  const invoicesForView = chartData.reduce((s, d) => s + d.invoiceCount, 0);

  const hoveredData = hoveredBar !== null ? chartData[hoveredBar] : null;

  const trendIcon = vendor.trend === 'up'
    ? <TrendingUp size={14} className="text-emerald-500" />
    : vendor.trend === 'down'
    ? <TrendingDown size={14} className="text-red-500" />
    : <Minus size={14} className="text-slate-400" />;

  const trendLabel = vendor.trend === 'up' ? 'Trending up' : vendor.trend === 'down' ? 'Trending down' : 'Stable';
  const trendColor = vendor.trend === 'up' ? '#10B981' : vendor.trend === 'down' ? '#EF4444' : '#94A3B8';

  const pagedTxns = vendor.transactions.slice(txPage * TX_PAGE_SIZE, (txPage + 1) * TX_PAGE_SIZE);
  const totalPages = Math.ceil(vendor.transactions.length / TX_PAGE_SIZE);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: '860px', maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
              <Building2 size={22} className="text-[#3B82F6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#0F172A]">{vendor.name}</h2>
                <span className="text-xs font-semibold bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded-full">
                  {vendor.category}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {trendIcon}
                <span className="text-xs font-medium" style={{ color: trendColor }}>{trendLabel}</span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-xs text-[#94A3B8]">Since {fmtDate(vendor.firstSeen)}</span>
                <span className="text-[#CBD5E1]">·</span>
                <span className="text-xs text-[#94A3B8]">Last active {fmtDate(vendor.lastActivity)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#CBD5E1] hover:text-[#64748B] transition-colors p-1 rounded-lg hover:bg-[#F8FAFC]"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Spend', value: fmt(vendor.totalSpend), sub: 'all time', icon: <DollarSign size={14} className="text-[#3B82F6]" /> },
              { label: 'Invoices', value: vendor.invoiceCount, sub: 'processed', icon: <FileText size={14} className="text-[#8B5CF6]" /> },
              { label: 'Flagged', value: vendor.flaggedCount, sub: 'for review', icon: <AlertTriangle size={14} className="text-[#F59E0B]" /> },
              { label: 'Avg Response', value: vendor.avgResponseTime, sub: 'per ticket', icon: <CheckCircle size={14} className="text-[#10B981]" /> },
            ].map(kpi => (
              <div key={kpi.label} className="bg-[#F8FAFC] rounded-xl p-3 border border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 mb-1.5">{kpi.icon}<span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">{kpi.label}</span></div>
                <div className="text-xl font-bold text-[#0F172A]">{kpi.value}</div>
                <div className="text-[11px] text-[#94A3B8]">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Spend Chart ── */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            {/* Chart header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Spend Analysis</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  {hoveredData
                    ? `${hoveredData.label} — ${fmtFull(hoveredData.amount)} · ${hoveredData.invoiceCount} invoices · ${hoveredData.flaggedCount} flagged`
                    : `${fmtFull(totalForView)} total · ${invoicesForView} invoices · ${flaggedForView} flagged`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex bg-[#F1F5F9] rounded-lg p-0.5 text-xs font-medium">
                  {(['monthly', 'quarterly', 'yearly'] as SpendView[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setSpendView(v)}
                      className={`px-3 py-1.5 rounded-md transition-all capitalize ${
                        spendView === v ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {/* Year selector (hidden for yearly view) */}
                {spendView !== 'yearly' && (
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="text-xs border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Bar chart */}
            <BarChart
              data={chartData}
              maxAmount={maxAmount}
              highlightIndex={hoveredBar}
              onHover={setHoveredBar}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[11px] text-[#94A3B8]">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#BFDBFE]" /><span>Normal</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#F59E0B]" /><span>Has flagged invoices</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#3B82F6]" /><span>Selected</span></div>
            </div>
          </div>

          {/* ── Bottom Row: Score + Contact + Notes ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Reputation Score */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm flex flex-col items-center gap-2">
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide self-start">Reputation Score</div>
              <ScoreRing score={vendor.reputationScore} />
              <p className="text-[11px] text-[#94A3B8] text-center leading-relaxed">
                Based on invoice accuracy, response time, and contract compliance
              </p>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">Contact</div>
              <div className="space-y-2.5">
                {vendor.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-[#94A3B8] flex-shrink-0" />
                    <a href={`mailto:${vendor.contactEmail}`} className="text-xs text-[#3B82F6] hover:underline truncate">{vendor.contactEmail}</a>
                  </div>
                )}
                {vendor.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-[#94A3B8] flex-shrink-0" />
                    <span className="text-xs text-[#0F172A]">{vendor.contactPhone}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="text-[#94A3B8] flex-shrink-0" />
                    <a href={`https://${vendor.website}`} target="_blank" rel="noreferrer" className="text-xs text-[#3B82F6] hover:underline flex items-center gap-0.5">
                      {vendor.website} <ArrowUpRight size={10} />
                    </a>
                  </div>
                )}
                {!vendor.contactEmail && !vendor.contactPhone && !vendor.website && (
                  <p className="text-xs text-[#94A3B8]">No contact info on file</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">AI Notes</div>
              <p className="text-xs text-[#475569] leading-relaxed">
                {vendor.notes ?? 'No notes yet. Notes are generated automatically as Dominion processes documents from this vendor.'}
              </p>
            </div>
          </div>

          {/* ── Transaction History ── */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Transaction History</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">{vendor.transactions.length} transactions total</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                <button
                  onClick={() => setTxPage(p => Math.max(0, p - 1))}
                  disabled={txPage === 0}
                  className="px-2 py-1 rounded border border-[#E2E8F0] disabled:opacity-30 hover:bg-[#F8FAFC] transition-colors"
                >
                  ← Prev
                </button>
                <span>{txPage + 1} / {totalPages}</span>
                <button
                  onClick={() => setTxPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={txPage >= totalPages - 1}
                  className="px-2 py-1 rounded border border-[#E2E8F0] disabled:opacity-30 hover:bg-[#F8FAFC] transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                  <th className="text-left px-5 py-2.5 text-[#64748B] font-semibold uppercase tracking-wide text-[10px]">ID</th>
                  <th className="text-left px-3 py-2.5 text-[#64748B] font-semibold uppercase tracking-wide text-[10px]">Date</th>
                  <th className="text-left px-3 py-2.5 text-[#64748B] font-semibold uppercase tracking-wide text-[10px]">Description</th>
                  <th className="text-right px-5 py-2.5 text-[#64748B] font-semibold uppercase tracking-wide text-[10px]">Amount</th>
                  <th className="text-center px-3 py-2.5 text-[#64748B] font-semibold uppercase tracking-wide text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedTxns.map((tx, i) => {
                  const statusCfg = {
                    paid: { bg: '#F0FDF4', color: '#059669', label: 'Paid' },
                    pending: { bg: '#FFFBEB', color: '#D97706', label: 'Pending' },
                    flagged: { bg: '#FEF3C7', color: '#D97706', label: 'Flagged' },
                    disputed: { bg: '#FEF2F2', color: '#DC2626', label: 'Disputed' },
                  }[tx.status];
                  return (
                    <tr key={tx.id} className={`border-b border-[#F8FAFC] hover:bg-[#FAFBFF] transition-colors ${i % 2 === 0 ? '' : 'bg-[#FAFCFF]'}`}>
                      <td className="px-5 py-3 font-mono text-[#3B82F6] font-medium">{tx.id}</td>
                      <td className="px-3 py-3 text-[#64748B]">{fmtDate(tx.date)}</td>
                      <td className="px-3 py-3 text-[#0F172A]">
                        <div>{tx.description}</div>
                        {tx.flagReason && <div className="text-[10px] text-[#D97706] mt-0.5 flex items-center gap-1"><AlertTriangle size={9} />{tx.flagReason}</div>}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[#0F172A]">{fmtFull(tx.amount)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#F1F5F9] bg-[#F8FAFC]">
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Calendar size={12} />
            <span>Profile last updated {fmtDate(vendor.lastActivity)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#3B82F6] hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF]">
              Export Report <ChevronRight size={12} />
            </button>
            <button
              onClick={onClose}
              className="text-xs font-semibold bg-[#0F172A] text-white px-4 py-1.5 rounded-lg hover:bg-[#1E293B] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
