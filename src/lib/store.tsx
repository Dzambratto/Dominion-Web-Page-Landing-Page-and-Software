import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Invoice, Contract, InsurancePolicy, Payment, Renewal, InboxAlert, AppSummary, DeliveryOrder } from './types';

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
  | { type: 'ADD_POLICY'; policy: InsurancePolicy };

const EMPTY_SUMMARY: AppSummary = {
  pendingApprovals: 0,
  anomaliesDetected: 0,
  renewalsDueSoon: 0,
  coverageGaps: 0,
  totalPayableThisWeek: 0,
  aiScansToday: 0,
  monthlySavingsIdentified: 0,
};

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
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'DISMISS_ALERT':
      return { ...state, alerts: state.alerts.map(a => a.id === action.id ? { ...a, dismissed: true } : a) };
    case 'APPROVE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map(inv => inv.id === action.id ? { ...inv, status: 'approved' as const } : inv),
        summary: { ...state.summary, pendingApprovals: Math.max(0, state.summary.pendingApprovals - 1) },
      };
    case 'FLAG_INVOICE':
      return { ...state, invoices: state.invoices.map(inv => inv.id === action.id ? { ...inv, status: 'flagged' as const } : inv) };
    case 'APPROVE_PAYMENT':
      return {
        ...state,
        payments: state.payments.map(p => p.id === action.id ? { ...p, status: 'approved' as const } : p),
        summary: { ...state.summary, pendingApprovals: Math.max(0, state.summary.pendingApprovals - 1) },
      };
    case 'SET_SCANNING':
      return { ...state, isScanning: action.value };
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'ADD_INVOICE':
      return {
        ...state,
        invoices: [action.invoice, ...state.invoices],
        summary: { ...state.summary, pendingApprovals: state.summary.pendingApprovals + 1 },
      };
    case 'ADD_CONTRACT':
      return { ...state, contracts: [action.contract, ...state.contracts] };
    case 'ADD_POLICY':
      return { ...state, policies: [action.policy, ...state.policies] };
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
  triggerScan: () => void;
  setView: (view: string) => void;
  addInvoice: (invoice: Invoice) => void;
  addContract: (contract: Contract) => void;
  addPolicy: (policy: InsurancePolicy) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const dismissAlert = useCallback((id: string) => dispatch({ type: 'DISMISS_ALERT', id }), []);
  const approveInvoice = useCallback((id: string) => dispatch({ type: 'APPROVE_INVOICE', id }), []);
  const flagInvoice = useCallback((id: string) => dispatch({ type: 'FLAG_INVOICE', id }), []);
  const approvePayment = useCallback((id: string) => dispatch({ type: 'APPROVE_PAYMENT', id }), []);
  const setView = useCallback((view: string) => dispatch({ type: 'SET_VIEW', view }), []);
  const addInvoice = useCallback((invoice: Invoice) => dispatch({ type: 'ADD_INVOICE', invoice }), []);
  const addContract = useCallback((contract: Contract) => dispatch({ type: 'ADD_CONTRACT', contract }), []);
  const addPolicy = useCallback((policy: InsurancePolicy) => dispatch({ type: 'ADD_POLICY', policy }), []);

  const triggerScan = useCallback(() => {
    dispatch({ type: 'SET_SCANNING', value: true });
    setTimeout(() => dispatch({ type: 'SET_SCANNING', value: false }), 2500);
  }, []);

  return (
    <AppContext.Provider value={{
      state, dismissAlert, approveInvoice, flagInvoice, approvePayment,
      triggerScan, setView, addInvoice, addContract, addPolicy,
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
