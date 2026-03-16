import { useState, useRef, useCallback } from 'react';

export type UploadDocType = 'invoice' | 'contract' | 'insurance' | 'order' | 'auto';

interface UploadModalProps {
  onClose: () => void;
  onProcessed: (docType: UploadDocType, fileName: string) => void;
  defaultType?: UploadDocType;
}

const DOC_TYPES: { value: UploadDocType; label: string; icon: string; description: string }[] = [
  { value: 'auto', label: 'Auto-detect', icon: '🤖', description: 'Dominion identifies the document type' },
  { value: 'invoice', label: 'Invoice / Bill', icon: '📄', description: 'Vendor invoices, bills, receipts' },
  { value: 'contract', label: 'Contract', icon: '📋', description: 'Vendor agreements, service contracts' },
  { value: 'insurance', label: 'Insurance Policy', icon: '🛡️', description: 'Policy documents, certificates' },
  { value: 'order', label: 'Delivery Order', icon: '📦', description: 'BOLs, shipping documents, POs' },
];

export function UploadModal({ onClose, onProcessed, defaultType = 'auto' }: UploadModalProps) {
  const [docType, setDocType] = useState<UploadDocType>(defaultType);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|jpg|jpeg|png|webp|heic)$/i)) {
      alert('Please upload a PDF or image file (JPG, PNG, WEBP, HEIC).');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      alert('File size must be under 20MB.');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);

    // Simulate AI processing stages
    const stages = [
      { label: 'Reading document…', pct: 20 },
      { label: 'Extracting fields with AI…', pct: 50 },
      { label: 'Cross-referencing data…', pct: 75 },
      { label: 'Finalizing…', pct: 95 },
    ];

    for (const s of stages) {
      setStage(s.label);
      setProgress(s.pct);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }

    setProgress(100);
    setStage('Complete!');
    await new Promise(r => setTimeout(r, 400));

    onProcessed(docType, file.name);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <h2 style={{ color: '#0F172A', fontSize: '18px', fontWeight: 700, margin: 0 }}>Upload Document</h2>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '2px 0 0' }}>AI will extract and categorize all data automatically</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {!processing ? (
            <>
              {/* Doc type selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#475569', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Document Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {DOC_TYPES.map(dt => (
                    <button
                      key={dt.value}
                      onClick={() => setDocType(dt.value)}
                      style={{
                        background: docType === dt.value ? '#EFF6FF' : '#F8FAFC',
                        border: `1px solid ${docType === dt.value ? '#3B82F6' : '#E2E8F0'}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{dt.icon}</span>
                        <span style={{ color: docType === dt.value ? '#1D4ED8' : '#0F172A', fontSize: '13px', fontWeight: 600 }}>{dt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#3B82F6' : file ? '#10B981' : '#CBD5E1'}`,
                  borderRadius: '12px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? '#EFF6FF' : file ? '#F0FDF4' : '#F8FAFC',
                  transition: 'all 0.15s',
                  marginBottom: '16px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {file ? (
                  <>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <p style={{ color: '#15803D', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>{file.name}</p>
                    <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📎</div>
                    <p style={{ color: '#0F172A', fontWeight: 600, fontSize: '15px', margin: '0 0 6px' }}>
                      {isDragging ? 'Drop it here' : 'Drag & drop or click to upload'}
                    </p>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>PDF, JPG, PNG, WEBP up to 20MB</p>
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, background: '#fff', color: '#64748B',
                    border: '1px solid #E2E8F0', borderRadius: '10px',
                    padding: '12px', fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcess}
                  disabled={!file}
                  style={{
                    flex: 2, background: file ? '#3B82F6' : '#E2E8F0',
                    color: file ? '#fff' : '#94A3B8', border: 'none',
                    borderRadius: '10px', padding: '12px', fontSize: '14px',
                    fontWeight: 600, cursor: file ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}
                >
                  {file ? '🤖 Process with AI' : 'Select a file first'}
                </button>
              </div>
            </>
          ) : (
            /* Processing state */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {progress < 100 ? '⚙️' : '✅'}
              </div>
              <h3 style={{ color: '#0F172A', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                {progress < 100 ? 'Processing document…' : 'Document processed!'}
              </h3>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>{stage}</p>

              {/* Progress bar */}
              <div style={{ background: '#F1F5F9', borderRadius: '999px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{
                  background: progress < 100 ? '#3B82F6' : '#10B981',
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <p style={{ color: '#94A3B8', fontSize: '12px' }}>{progress}%</p>

              <div style={{ marginTop: '20px', background: '#F8FAFC', borderRadius: '10px', padding: '14px 16px', textAlign: 'left' }}>
                <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
                  📄 <strong>{file?.name}</strong> — AI is extracting vendor, amounts, dates, and line items
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
