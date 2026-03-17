/**
 * Dominion — Supabase data layer
 * All CRUD operations for the app's core entities.
 * Falls back gracefully when Supabase is not configured.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { Invoice, Contract, InsurancePolicy, Payment, InboxAlert, DeliveryOrder } from './types';

// ─── Invoices ────────────────────────────────────────────────────────────────

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchInvoices error:', error); return []; }
  return (data || []).map(rowToInvoice);
}

export async function upsertInvoice(userId: string, invoice: Invoice): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('invoices').upsert({
    id: invoice.id,
    user_id: userId,
    invoice_number: invoice.invoiceNumber,
    vendor_name: invoice.vendorName,
    amount: invoice.amount,
    currency: invoice.currency || 'USD',
    due_date: invoice.dueDate,
    invoice_date: invoice.invoiceDate,
    status: invoice.status,
    category: invoice.category,
    description: invoice.description,
    line_items: invoice.lineItems || [],
    anomalies: invoice.anomalies || [],
    source: invoice.source || 'manual',
    source_email_id: invoice.sourceEmailId,
    pdf_url: invoice.pdfUrl,
    notes: invoice.notes,
  }, { onConflict: 'id' });
  if (error) console.error('upsertInvoice error:', error);
}

export async function updateInvoiceStatus(invoiceId: string, status: Invoice['status']): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);
  if (error) console.error('updateInvoiceStatus error:', error);
}

function rowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    invoiceNumber: (row.invoice_number as string) || '',
    vendorName: (row.vendor_name as string) || '',
    amount: Number(row.amount) || 0,
    currency: (row.currency as string) || 'USD',
    dueDate: (row.due_date as string) || '',
    invoiceDate: (row.invoice_date as string) || '',
    status: (row.status as Invoice['status']) || 'pending',
    category: (row.category as string) || '',
    description: (row.description as string) || '',
    lineItems: (row.line_items as Invoice['lineItems']) || [],
    anomalies: (row.anomalies as Invoice['anomalies']) || [],
    source: (row.source as Invoice['source']) || 'manual',
    sourceEmailId: row.source_email_id as string | undefined,
    pdfUrl: row.pdf_url as string | undefined,
    notes: row.notes as string | undefined,
  };
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function fetchContracts(userId: string): Promise<Contract[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchContracts error:', error); return []; }
  return (data || []).map(rowToContract);
}

export async function upsertContract(userId: string, contract: Contract): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('contracts').upsert({
    id: contract.id,
    user_id: userId,
    vendor_name: contract.vendorName,
    contract_type: contract.contractType,
    description: contract.description,
    start_date: contract.startDate,
    end_date: contract.endDate,
    auto_renews: contract.autoRenews,
    renewal_notice_days: contract.renewalNoticeDays,
    total_contract_value: contract.totalContractValue,
    billing_frequency: contract.billingFrequency,
    line_items: contract.lineItems || [],
    linked_invoice_ids: contract.linkedInvoiceIds || [],
    year_over_year: contract.yearOverYear || [],
    requires_service_verification: contract.requiresServiceVerification,
    service_verification_type: contract.serviceVerificationType,
    notes: contract.notes,
  }, { onConflict: 'id' });
  if (error) console.error('upsertContract error:', error);
}

function rowToContract(row: Record<string, unknown>): Contract {
  return {
    id: row.id as string,
    vendorName: (row.vendor_name as string) || '',
    contractType: (row.contract_type as Contract['contractType']) || 'service',
    description: (row.description as string) || '',
    startDate: (row.start_date as string) || '',
    endDate: (row.end_date as string) || '',
    autoRenews: Boolean(row.auto_renews),
    renewalNoticeDays: Number(row.renewal_notice_days) || 30,
    totalContractValue: Number(row.total_contract_value) || 0,
    billingFrequency: (row.billing_frequency as Contract['billingFrequency']) || 'monthly',
    lineItems: (row.line_items as Contract['lineItems']) || [],
    linkedInvoiceIds: (row.linked_invoice_ids as string[]) || [],
    yearOverYear: (row.year_over_year as Contract['yearOverYear']) || [],
    requiresServiceVerification: Boolean(row.requires_service_verification),
    serviceVerificationType: row.service_verification_type as Contract['serviceVerificationType'],
    notes: row.notes as string | undefined,
  };
}

// ─── Insurance Policies ──────────────────────────────────────────────────────

export async function fetchPolicies(userId: string): Promise<InsurancePolicy[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchPolicies error:', error); return []; }
  return (data || []).map(rowToPolicy);
}

export async function upsertPolicy(userId: string, policy: InsurancePolicy): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('insurance_policies').upsert({
    id: policy.id,
    user_id: userId,
    carrier: policy.carrier,
    policy_number: policy.policyNumber,
    policy_type: policy.policyType,
    premium: policy.premium,
    billing_frequency: policy.billingFrequency,
    effective_date: policy.effectiveDate,
    expiration_date: policy.expirationDate,
    coverage_items: policy.coverageItems || [],
    status: policy.status,
    ai_summary: policy.aiSummary,
    gaps_detected: policy.gapsDetected || [],
    year_over_year_premiums: policy.yearOverYearPremiums || [],
    alternative_quotes: policy.alternativeQuotes || [],
    notes: policy.notes,
  }, { onConflict: 'id' });
  if (error) console.error('upsertPolicy error:', error);
}

function rowToPolicy(row: Record<string, unknown>): InsurancePolicy {
  const expDate = row.expiration_date as string;
  const daysUntil = expDate
    ? Math.ceil((new Date(expDate).getTime() - Date.now()) / 86400000)
    : 0;
  return {
    id: row.id as string,
    carrier: (row.carrier as string) || '',
    policyNumber: (row.policy_number as string) || '',
    policyType: (row.policy_type as InsurancePolicy['policyType']) || 'general_liability',
    premium: Number(row.premium) || 0,
    billingFrequency: (row.billing_frequency as InsurancePolicy['billingFrequency']) || 'annual',
    effectiveDate: (row.effective_date as string) || '',
    expirationDate: expDate || '',
    coverageItems: (row.coverage_items as InsurancePolicy['coverageItems']) || [],
    status: (row.status as InsurancePolicy['status']) || 'active',
    daysUntilExpiration: daysUntil,
    aiSummary: (row.ai_summary as string) || '',
    gapsDetected: (row.gaps_detected as string[]) || [],
    yearOverYearPremiums: (row.year_over_year_premiums as InsurancePolicy['yearOverYearPremiums']) || [],
    alternativeQuotes: (row.alternative_quotes as InsurancePolicy['alternativeQuotes']) || [],
  };
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function fetchPayments(userId: string): Promise<Payment[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchPayments error:', error); return []; }
  return (data || []).map(rowToPayment);
}

export async function upsertPayment(userId: string, payment: Payment): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('payments').upsert({
    id: payment.id,
    user_id: userId,
    vendor_name: payment.vendorName,
    invoice_number: payment.invoiceNumber,
    amount: payment.amount,
    due_date: payment.dueDate,
    payment_method: payment.paymentMethod,
    bank_account: payment.bankAccount,
    routing_number: payment.routingNumber,
    status: payment.status,
    quickbooks_status: payment.quickbooksStatus,
    notes: payment.notes,
  }, { onConflict: 'id' });
  if (error) console.error('upsertPayment error:', error);
}

export async function updatePaymentStatus(paymentId: string, status: Payment['status']): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) console.error('updatePaymentStatus error:', error);
}

function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    vendorName: (row.vendor_name as string) || '',
    invoiceId: (row.invoice_id as string) || '',
    invoiceNumber: (row.invoice_number as string) || '',
    amount: Number(row.amount) || 0,
    dueDate: (row.due_date as string) || '',
    paymentMethod: (row.payment_method as Payment['paymentMethod']) || 'ach',
    bankAccount: row.bank_account as string | undefined,
    routingNumber: row.routing_number as string | undefined,
    status: (row.status as Payment['status']) || 'pending_approval',
    quickbooksStatus: (row.quickbooks_status as Payment['quickbooksStatus']) || 'not_connected',
    notes: row.notes as string | undefined,
  };
}

// ─── Inbox Alerts ────────────────────────────────────────────────────────────

export async function fetchAlerts(userId: string): Promise<InboxAlert[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('inbox_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('dismissed', false)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchAlerts error:', error); return []; }
  return (data || []).map(rowToAlert);
}

export async function upsertAlert(userId: string, alert: InboxAlert): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('inbox_alerts').upsert({
    id: alert.id,
    user_id: userId,
    priority: alert.priority,
    title: alert.title,
    subtitle: alert.subtitle,
    amount: alert.amount,
    action_label: alert.actionLabel,
    secondary_action_label: alert.secondaryActionLabel,
    dismissed: alert.dismissed,
    invoice_id: alert.invoiceId,
    created_at: alert.createdAt,
  }, { onConflict: 'id' });
  if (error) console.error('upsertAlert error:', error);
}

export async function dismissAlert(alertId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('inbox_alerts')
    .update({ dismissed: true })
    .eq('id', alertId);
  if (error) console.error('dismissAlert error:', error);
}

function rowToAlert(row: Record<string, unknown>): InboxAlert {
  return {
    id: row.id as string,
    priority: (row.priority as InboxAlert['priority']) || 'info',
    title: (row.title as string) || '',
    subtitle: (row.subtitle as string) || '',
    amount: row.amount as number | undefined,
    actionLabel: (row.action_label as string) || 'View',
    secondaryActionLabel: row.secondary_action_label as string | undefined,
    dismissed: Boolean(row.dismissed),
    createdAt: (row.created_at as string) || new Date().toISOString(),
    invoiceId: row.invoice_id as string | undefined,
  };
}

// ─── Delivery Orders ─────────────────────────────────────────────────────────

export async function fetchOrders(userId: string): Promise<DeliveryOrder[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchOrders error:', error); return []; }
  return (data || []).map(rowToOrder);
}

export async function upsertOrder(userId: string, order: DeliveryOrder): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('delivery_orders').upsert({
    id: order.id,
    user_id: userId,
    bol_number: order.bolNumber,
    status: order.status,
    source: order.source,
    raw_email_subject: order.rawEmailSubject,
    received_date: order.receivedDate,
    extraction_confidence: order.extractionConfidence,
    shipper: order.shipper,
    consignee: order.consignee,
    third_party_bill_to: order.thirdPartyBillTo,
    pickup_ready: order.pickupReady,
    pickup_close: order.pickupClose,
    projected_delivery: order.projectedDelivery,
    cargo_items: order.cargoItems || [],
    total_pieces: order.totalPieces,
    total_weight_lbs: order.totalWeightLbs,
    quoted_rate: order.quotedRate,
    currency: order.currency || 'USD',
    carrier_quote_ref: order.carrierQuoteRef,
    billing_portal: order.billingPortal,
    references: order.references || [],
    carrier_contact: order.carrierContact,
    anomalies: order.anomalies || [],
    missing_fields: order.missingFields || [],
    auto_response_sent: order.autoResponseSent,
    ai_notes: order.aiNotes,
  }, { onConflict: 'id' });
  if (error) console.error('upsertOrder error:', error);
}

function rowToOrder(row: Record<string, unknown>): DeliveryOrder {
  return {
    id: row.id as string,
    bolNumber: (row.bol_number as string) || '',
    status: (row.status as DeliveryOrder['status']) || 'new',
    source: (row.source as DeliveryOrder['source']) || 'manual',
    rawEmailSubject: row.raw_email_subject as string | undefined,
    receivedDate: (row.received_date as string) || '',
    extractionConfidence: Number(row.extraction_confidence) || 0,
    shipper: (row.shipper as DeliveryOrder['shipper']) || { name: '', address: '', city: '', state: '', zip: '', country: '' },
    consignee: (row.consignee as DeliveryOrder['consignee']) || { name: '', address: '', city: '', state: '', zip: '', country: '' },
    thirdPartyBillTo: row.third_party_bill_to as DeliveryOrder['thirdPartyBillTo'],
    pickupReady: (row.pickup_ready as string) || '',
    pickupClose: (row.pickup_close as string) || '',
    projectedDelivery: (row.projected_delivery as string) || '',
    cargoItems: (row.cargo_items as DeliveryOrder['cargoItems']) || [],
    totalPieces: Number(row.total_pieces) || 0,
    totalWeightLbs: Number(row.total_weight_lbs) || 0,
    quotedRate: row.quoted_rate as number | undefined,
    currency: (row.currency as string) || 'USD',
    carrierQuoteRef: row.carrier_quote_ref as string | undefined,
    billingPortal: row.billing_portal as string | undefined,
    references: (row.references as DeliveryOrder['references']) || [],
    carrierContact: row.carrier_contact as DeliveryOrder['carrierContact'],
    anomalies: (row.anomalies as DeliveryOrder['anomalies']) || [],
    missingFields: (row.missing_fields as string[]) || [],
    autoResponseSent: Boolean(row.auto_response_sent),
    aiNotes: row.ai_notes as string | undefined,
  };
}

// ─── Scan history ────────────────────────────────────────────────────────────

export async function recordScan(
  userId: string,
  provider: 'gmail' | 'outlook',
  scannedCount: number,
  extractedCount: number,
  errors: string[]
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('scan_history').insert({
    user_id: userId,
    provider,
    scanned_count: scannedCount,
    extracted_count: extractedCount,
    errors,
  });
  if (error) console.error('recordScan error:', error);
}
