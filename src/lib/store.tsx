import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Invoice, Contract, InsurancePolicy, Payment, Renewal, InboxAlert, AppSummary, DeliveryOrder } from './types';
import { runGmailScan } from './gmail-scan';
import {
  fetchInvoices, upsertInvoice, updateInvoiceStatus,
  fetchContracts, upsertContract,
  fetchPolicies, upsertPolicy,
  fetchPayments, upsertPayment, updatePaymentStatus,
  fetchAlerts, upsertAlert, dismissAlert as dbDismissAlert,
  fetchOrders, upsertOrder,
  recordScan,
} from './db';

interface AppState {
  invoices: Invoice[];
  contracts: Contract[];
  policies: InsurancePolicy[];
  payments: Payment[];
  renewals: Renewal[];
  alerts: InboxAlert[];
  orders: DeliveryOrder[];
  summary: AppSummary;
  isScanning: boolean;
  activeView: string;
  lastScanMessage: string | null;
  isLoadingData: boolean;
}

type Action =
  | { type: 'DISMISS_ALERT'; id: string }
  | { type: 'APPROVE_INVOICE'; id: string }
  | { type: 'FLAG_INVOICE'; id: string }
  | { type: 'APPROVE_PAYMENT'; id: string }
  | { type: 'SET_SCANNING'; value: boolean }
  | { type: 'SET_VIEW'; view: string }
  | { type: 'ADD_INVOICE'; invoice: Invoice }
  | { type: 'ADD_CONTRACT'; contract: Contract }
  | { type: 'ADD_POLICY'; policy: InsurancePolicy }
  | { type: 'LOAD_SCAN_RESULTS'; invoices: Invoice[]; alerts: InboxAlert[]; message: string }
  | { type: 'LOAD_DATA'; invoices: Invoice[]; contracts: Contract[]; policies: InsurancePolicy[]; payments: Payment[]; alerts: InboxAlert[]; orders: DeliveryOrder[] }
  | { type: 'SET_LOADING'; value: boolean };

const EMPTY_SUMMARY: AppSummary = {
  pendingApprovals: 0,
  anomaliesDetected: 0,
  renewalsDueSoon: 0,
  coverageGaps: 0,
  totalPayableThisWeek: 0,
  aiScansToday: 0,
  monthlySavingsIdentified: 0,
};

function computeSummary(state: Pick<AppState, 'invoices' | 'payments' | 'policies' | 'contracts'>): AppSummary {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);
  const pendingApprovals = state.invoices.filter(i => i.status === 'pending').length
    + state.payments.filter(p => p.status === 'pending_approval').length;
  const anomaliesDetected = state.invoices.filter(i => i.status === 'flagged').length;
  const renewalsDueSoon = state.policies.filter(p => {
    const exp = new Date(p.expirationDate);
    return exp >= now && exp <= weekFromNow;
  }).length + state.contracts.filter(c => {
    const end = new Date(c.endDate);
    return end >= now && end <= weekFromNow;
  }).length;
  const coverageGaps = state.policies.reduce((sum, p) => sum + (p.gapsDetected?.length || 0), 0);
  const totalPayableThisWeek = state.payments
    .filter(p => p.status === 'pending_approval' || p.status === 'approved')
    .filter(p => new Date(p.dueDate) <= weekFromNow)
    .reduce((sum, p) => sum + p.amount, 0);
  return {
    pendingApprovals,
    anomaliesDetected,
    renewalsDueSoon,
    coverageGaps,
    totalPayableThisWeek,
    aiScansToday: 0,
    monthlySavingsIdentified: 0,
  };
}

const initialState: AppState = {
  invoices: [],
  contracts: [],
  policies: [],
  payments: [],
  renewals: [],
  alerts: [],
  orders: [],
  summary: EMPTY_SUMMARY,
  isScanning: false,
  activeView: 'inbox',
  lastScanMessage: null,
  isLoadingData: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoadingData: action.value };
    case 'LOAD_DATA': {
      const next = {
        ...state,
        invoices: action.invoices,
        contracts: action.contracts,
        policies: action.policies,
        payments: action.payments,
        alerts: action.alerts,
        orders: action.orders,
        isLoadingData: false,
      };
      return { ...next, summary: computeSummary(next) };
    }
    case 'DISMISS_ALERT':
      return { ...state, alerts: state.alerts.map(a => a.id === action.id ? { ...a, dismissed: true } : a) };
    case 'APPROVE_INVOICE': {
      const invoices = state.invoices.map(inv => inv.id === action.id ? { ...inv, status: 'approved' as const } : inv);
      return {
        ...state, invoices,
        summary: { ...state.summary, pendingApprovals: Math.max(0, state.summary.pendingApprovals - 1) },
      };
    }
    case 'FLAG_INVOICE':
      return { ...state, invoices: state.invoices.map(inv => inv.id === action.id ? { ...inv, status: 'flagged' as const } : inv) };
    case 'APPROVE_PAYMENT': {
      const payments = state.payments.map(p => p.id === action.id ? { ...p, status: 'approved' as const } : p);
      return {
        ...state, payments,
        summary: { ...state.summary, pendingApprovals: Math.max(0, state.summary.pendingApprovals - 1) },
      };
    }
    case 'SET_SCANNING':
      return { ...state, isScanning: action.value };
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'ADD_INVOICE': {
      const invoices = [action.invoice, ...state.invoices];
      const next = { ...state, invoices };
      return { ...next, summary: computeSummary(next) };
    }
    case 'ADD_CONTRACT': {
      const contracts = [action.contract, ...state.contracts];
      const next = { ...state, contracts };
      return { ...next, summary: computeSummary(next) };
    }
    case 'ADD_POLICY': {
      const policies = [action.policy, ...state.policies];
      const next = { ...state, policies };
      return { ...next, summary: computeSummary(next) };
    }
    case 'LOAD_SCAN_RESULTS': {
      const newInvoices = action.invoices.filter(
        inv => !state.invoices.find(e => e.invoiceNumber === inv.invoiceNumber && e.vendorName === inv.vendorName)
      );
      const newAlerts = action.alerts.filter(a => !state.alerts.find(e => e.id === a.id));
      const invoices = [...newInvoices, ...state.invoices];
      const alerts = [...newAlerts, ...state.alerts];
      const next = { ...state, invoices, alerts };
      return {
        ...next,
        summary: computeSummary(next),
        isScanning: false,
        lastScanMessage: action.message,
      };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dismissAlert: (id: string) => void;
  approveInvoice: (id: string) => void;
  flagInvoice: (id: string) => void;
  approvePayment: (id: string) => void;
  triggerScan: (userId?: string) => void;
  setView: (view: string) => void;
  addInvoice: (invoice: Invoice) => void;
  addContract: (contract: Contract) => void;
  addPolicy: (policy: InsurancePolicy) => void;
  loadScanResults: (invoices: Invoice[], alerts: InboxAlert[], message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load data from Supabase on mount
  useEffect(() => {
    if (!userId) return;
    dispatch({ type: 'SET_LOADING', value: true });
    Promise.all([
      fetchInvoices(userId),
      fetchContracts(userId),
      fetchPolicies(userId),
      fetchPayments(userId),
      fetchAlerts(userId),
      fetchOrders(userId),
    ]).then(([invoices, contracts, policies, payments, alerts, orders]) => {
      dispatch({ type: 'LOAD_DATA', invoices, contracts, policies, payments, alerts, orders });
    }).catch(err => {
      console.error('Failed to load data from Supabase:', err);
      dispatch({ type: 'SET_LOADING', value: false });
    });
  }, [userId]);

  const dismissAlert = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_ALERT', id });
    if (userId) dbDismissAlert(id);
  }, [userId]);

  const approveInvoice = useCallback((id: string) => {
    dispatch({ type: 'APPROVE_INVOICE', id });
    if (userId) updateInvoiceStatus(id, 'approved');
  }, [userId]);

  const flagInvoice = useCallback((id: string) => {
    dispatch({ type: 'FLAG_INVOICE', id });
    if (userId) updateInvoiceStatus(id, 'flagged');
  }, [userId]);

  const approvePayment = useCallback((id: string) => {
    dispatch({ type: 'APPROVE_PAYMENT', id });
    if (userId) updatePaymentStatus(id, 'approved');
  }, [userId]);

  const setView = useCallback((view: string) => dispatch({ type: 'SET_VIEW', view }), []);

  const addInvoice = useCallback((invoice: Invoice) => {
    dispatch({ type: 'ADD_INVOICE', invoice });
    if (userId) upsertInvoice(userId, invoice);
  }, [userId]);

  const addContract = useCallback((contract: Contract) => {
    dispatch({ type: 'ADD_CONTRACT', contract });
    if (userId) upsertContract(userId, contract);
  }, [userId]);

  const addPolicy = useCallback((policy: InsurancePolicy) => {
    dispatch({ type: 'ADD_POLICY', policy });
    if (userId) upsertPolicy(userId, policy);
  }, [userId]);

  const loadScanResults = useCallback((invoices: Invoice[], alerts: InboxAlert[], message: string) => {
    dispatch({ type: 'LOAD_SCAN_RESULTS', invoices, alerts, message });
    if (userId) {
      invoices.forEach(inv => upsertInvoice(userId, inv));
      alerts.forEach(alert => upsertAlert(userId, alert));
    }
  }, [userId]);

  const triggerScan = useCallback((scanUserId?: string) => {
    dispatch({ type: 'SET_SCANNING', value: true });
    if (scanUserId) {
      runGmailScan(scanUserId)
        .then(result => {
          const msg = result.extractedCount > 0
            ? `Scan complete — ${result.extractedCount} document${result.extractedCount > 1 ? 's' : ''} extracted from ${result.scannedCount} emails`
            : result.scannedCount > 0
              ? `Scanned ${result.scannedCount} emails — no new financial documents found`
              : 'No new emails found since last scan';
          dispatch({ type: 'LOAD_SCAN_RESULTS', invoices: result.invoices, alerts: result.alerts, message: msg });
          if (userId) {
            result.invoices.forEach(inv => upsertInvoice(userId, inv));
            result.alerts.forEach(alert => upsertAlert(userId, alert));
            recordScan(userId, 'gmail', result.scannedCount, result.extractedCount, result.errors);
          }
        })
        .catch((err) => {
          console.error('Gmail scan failed:', err);
          dispatch({ type: 'SET_SCANNING', value: false });
        });
    } else {
      setTimeout(() => dispatch({ type: 'SET_SCANNING', value: false }), 1500);
    }
  }, [userId]);

  return (
    <AppContext.Provider value={{
      state, dismissAlert, approveInvoice, flagInvoice, approvePayment,
      triggerScan, setView, addInvoice, addContract, addPolicy, loadScanResults,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
