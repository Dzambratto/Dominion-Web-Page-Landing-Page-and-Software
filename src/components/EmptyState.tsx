interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    secondary?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
}

export function EmptyState({ icon, title, description, action, secondaryAction, tips }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      textAlign: 'center',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '20px', lineHeight: 1 }}>{icon}</div>
      <h2 style={{ color: '#0F172A', fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>{title}</h2>
      <p style={{ color: '#64748B', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>{description}</p>

      {(action || secondaryAction) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                background: action.secondary ? '#fff' : '#3B82F6',
                color: action.secondary ? '#3B82F6' : '#fff',
                border: action.secondary ? '1px solid #3B82F6' : 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                background: 'transparent',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '11px 20px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {tips && tips.length > 0 && (
        <div style={{ marginTop: '32px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', width: '100%', maxWidth: '400px', textAlign: 'left' }}>
          <p style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            How it works
          </p>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < tips.length - 1 ? '8px' : 0 }}>
              <span style={{ color: '#3B82F6', fontWeight: 700, fontSize: '13px', minWidth: '18px' }}>{i + 1}.</span>
              <span style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
