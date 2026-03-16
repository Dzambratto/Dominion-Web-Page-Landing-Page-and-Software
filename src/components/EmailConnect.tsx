import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { EmailConnection } from '@/lib/auth';

interface EmailConnectProps {
  onDone?: () => void;
  compact?: boolean; // for use inside Settings
}

export function EmailConnect({ onDone, compact = false }: EmailConnectProps) {
  const { user, addEmailConnection, removeEmailConnection } = useAuth();
  const [connectingProvider, setConnectingProvider] = useState<'gmail' | 'outlook' | null>(null);
  const [showManualForm, setShowManualForm] = useState<'gmail' | 'outlook' | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const gmailConnected = user?.emailConnections.find(c => c.provider === 'gmail');
  const outlookConnected = user?.emailConnections.find(c => c.provider === 'outlook');

  const handleConnect = (provider: 'gmail' | 'outlook') => {
    setConnectingProvider(provider);
    setShowManualForm(provider);
  };

  const handleManualSubmit = (provider: 'gmail' | 'outlook') => {
    if (!manualEmail.trim() || !manualEmail.includes('@')) return;
    const connection: EmailConnection = {
      provider,
      email: manualEmail.trim(),
      connectedAt: new Date().toISOString(),
      status: 'active',
    };
    addEmailConnection(connection);
    setShowManualForm(null);
    setConnectingProvider(null);
    setManualEmail('');
    setSuccessMessage(`${provider === 'gmail' ? 'Gmail' : 'Outlook'} connected! We'll start scanning your inbox for financial documents.`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleDisconnect = (provider: 'gmail' | 'outlook') => {
    removeEmailConnection(provider);
  };

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {successMessage && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 14px', color: '#15803D', fontSize: '13px' }}>
            ✓ {successMessage}
          </div>
        )}
        <EmailProviderRow
          provider="gmail"
          label="Gmail"
          icon="📧"
          description="Connect your Google Workspace or Gmail account"
          connected={gmailConnected}
          onConnect={() => handleConnect('gmail')}
          onDisconnect={() => handleDisconnect('gmail')}
          showForm={showManualForm === 'gmail'}
          manualEmail={manualEmail}
          setManualEmail={setManualEmail}
          onSubmitForm={() => handleManualSubmit('gmail')}
          onCancelForm={() => { setShowManualForm(null); setConnectingProvider(null); setManualEmail(''); }}
        />
        <EmailProviderRow
          provider="outlook"
          label="Outlook / Microsoft 365"
          icon="📨"
          description="Connect your Outlook or Microsoft 365 account"
          connected={outlookConnected}
          onConnect={() => handleConnect('outlook')}
          onDisconnect={() => handleDisconnect('outlook')}
          showForm={showManualForm === 'outlook'}
          manualEmail={manualEmail}
          setManualEmail={setManualEmail}
          onSubmitForm={() => handleManualSubmit('outlook')}
          onCancelForm={() => { setShowManualForm(null); setConnectingProvider(null); setManualEmail(''); }}
        />
      </div>
    );
  }

  // Full onboarding modal style
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📬</div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Connect your email
          </h1>
          <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6 }}>
            Dominion monitors your inbox for invoices, contracts, and insurance documents — processing them automatically the moment they arrive.
          </p>
        </div>

        {successMessage && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 16px', color: '#15803D', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            ✓ {successMessage}
          </div>
        )}

        {/* Providers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <EmailProviderCard
            provider="gmail"
            label="Connect Gmail"
            sublabel="Google Workspace · Personal Gmail"
            icon="📧"
            color="#EA4335"
            connected={gmailConnected}
            onConnect={() => handleConnect('gmail')}
            onDisconnect={() => handleDisconnect('gmail')}
            showForm={showManualForm === 'gmail'}
            manualEmail={manualEmail}
            setManualEmail={setManualEmail}
            onSubmitForm={() => handleManualSubmit('gmail')}
            onCancelForm={() => { setShowManualForm(null); setConnectingProvider(null); setManualEmail(''); }}
          />
          <EmailProviderCard
            provider="outlook"
            label="Connect Outlook"
            sublabel="Microsoft 365 · Outlook.com"
            icon="📨"
            color="#0078D4"
            connected={outlookConnected}
            onConnect={() => handleConnect('outlook')}
            onDisconnect={() => handleDisconnect('outlook')}
            showForm={showManualForm === 'outlook'}
            manualEmail={manualEmail}
            setManualEmail={setManualEmail}
            onSubmitForm={() => handleManualSubmit('outlook')}
            onCancelForm={() => { setShowManualForm(null); setConnectingProvider(null); setManualEmail(''); }}
          />
        </div>

        {/* What we scan */}
        <div style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>What Dominion scans for</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {['📄 Invoices & bills', '📋 Vendor contracts', '🛡️ Insurance policies', '📦 Delivery orders', '💳 Payment confirmations', '🔄 Renewal notices'].map(item => (
              <div key={item} style={{ color: '#CBD5E1', fontSize: '13px' }}>{item}</div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(gmailConnected || outlookConnected) && (
            <button
              onClick={onDone}
              style={{
                background: '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Continue to Dashboard →
            </button>
          )}
          <button
            onClick={onDone}
            style={{
              background: 'transparent',
              color: '#64748B',
              border: '1px solid #1E293B',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Skip for now — I'll connect later
          </button>
        </div>

        <p style={{ color: '#334155', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
          🔒 Read-only access · We never send emails on your behalf · Disconnect anytime
        </p>
      </div>
    </div>
  );
}

// ─── Card variant (full onboarding) ──────────────────────────────────────────
function EmailProviderCard({
  provider, label, sublabel, icon, color, connected,
  onConnect, onDisconnect, showForm, manualEmail, setManualEmail, onSubmitForm, onCancelForm
}: {
  provider: 'gmail' | 'outlook';
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  connected?: EmailConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  showForm: boolean;
  manualEmail: string;
  setManualEmail: (v: string) => void;
  onSubmitForm: () => void;
  onCancelForm: () => void;
}) {
  return (
    <div style={{
      background: '#111827',
      border: `1px solid ${connected ? '#10B981' : '#1E293B'}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            {icon}
          </div>
          <div>
            <div style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 600 }}>{label}</div>
            <div style={{ color: '#64748B', fontSize: '12px' }}>
              {connected ? `Connected: ${connected.email}` : sublabel}
            </div>
          </div>
        </div>
        {connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>✓ Connected</span>
            <button onClick={onDisconnect} style={{ background: 'none', border: '1px solid #334155', borderRadius: '6px', color: '#64748B', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            style={{
              background: color,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Connect
          </button>
        )}
      </div>
      {showForm && !connected && (
        <div style={{ borderTop: '1px solid #1E293B', padding: '16px 20px', background: '#0F172A' }}>
          <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '10px' }}>
            Enter the email address you want to connect:
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={manualEmail}
              onChange={e => setManualEmail(e.target.value)}
              placeholder={provider === 'gmail' ? 'you@gmail.com' : 'you@company.com'}
              autoFocus
              style={{
                flex: 1,
                background: '#111827',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#F1F5F9',
                fontSize: '14px',
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && onSubmitForm()}
            />
            <button onClick={onSubmitForm} style={{ background: color, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Connect
            </button>
            <button onClick={onCancelForm} style={{ background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#64748B', fontSize: '13px', padding: '9px 12px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
          <p style={{ color: '#475569', fontSize: '11px', marginTop: '8px' }}>
            ℹ️ Full OAuth integration coming in Phase 2. For now, register your email address so we can set up your forwarding rules.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Row variant (compact, for Settings) ─────────────────────────────────────
function EmailProviderRow({
  provider, label, icon, description, connected,
  onConnect, onDisconnect, showForm, manualEmail, setManualEmail, onSubmitForm, onCancelForm
}: {
  provider: 'gmail' | 'outlook';
  label: string;
  icon: string;
  description: string;
  connected?: EmailConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  showForm: boolean;
  manualEmail: string;
  setManualEmail: (v: string) => void;
  onSubmitForm: () => void;
  onCancelForm: () => void;
}) {
  return (
    <div style={{ background: '#F8FAFC', border: `1px solid ${connected ? '#10B981' : '#E2E8F0'}`, borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <div>
            <div style={{ color: '#0F172A', fontSize: '14px', fontWeight: 600 }}>{label}</div>
            <div style={{ color: '#64748B', fontSize: '12px' }}>
              {connected ? `Connected: ${connected.email}` : description}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {connected && <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>✓ Active</span>}
          <button
            onClick={connected ? onDisconnect : onConnect}
            style={{
              background: connected ? '#fff' : '#3B82F6',
              color: connected ? '#64748B' : '#fff',
              border: connected ? '1px solid #E2E8F0' : 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
      {showForm && !connected && (
        <div style={{ borderTop: '1px solid #E2E8F0', padding: '12px 16px', background: '#F1F5F9' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={manualEmail}
              onChange={e => setManualEmail(e.target.value)}
              placeholder={provider === 'gmail' ? 'you@gmail.com' : 'you@company.com'}
              autoFocus
              style={{
                flex: 1,
                background: '#fff',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#0F172A',
                fontSize: '13px',
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && onSubmitForm()}
            />
            <button onClick={onSubmitForm} style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
            <button onClick={onCancelForm} style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: '6px', color: '#64748B', fontSize: '13px', padding: '8px 10px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
