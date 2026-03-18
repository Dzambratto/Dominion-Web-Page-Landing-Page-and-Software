import React from 'react';

interface EmptyInboxStateProps {
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
}

export function EmptyInboxState({ onConnectGmail, onConnectOutlook }: EmptyInboxStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 8C4 6.89543 4.89543 6 6 6H26C27.1046 6 28 6.89543 28 8V24C28 25.1046 27.1046 26 26 26H6C4.89543 26 4 25.1046 4 24V8Z" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M4 9L16 18L28 9" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-semibold text-[#0F172A] mb-2">
          Start by connecting your inbox
        </h2>

        {/* Subtext */}
        <p className="text-sm text-[#64748B] mb-8 leading-relaxed">
          Dominion scans your email for invoices, contracts, and financial documents — and organizes everything automatically.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onConnectGmail}
            className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#0F172A] shadow-sm"
          >
            {/* Gmail icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1.5 4.5L9 10.5L16.5 4.5" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="1.5" y="3" width="15" height="12" rx="1.5" stroke="#EA4335" strokeWidth="1.5"/>
            </svg>
            Connect Gmail
          </button>

          <button
            onClick={onConnectOutlook}
            className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors text-sm font-medium text-[#0F172A] shadow-sm"
          >
            {/* Outlook icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.5" y="3" width="9" height="12" rx="1" fill="#0078D4"/>
              <path d="M10.5 9L16.5 6V12L10.5 9Z" fill="#0078D4"/>
              <circle cx="6" cy="9" r="2.5" fill="white"/>
            </svg>
            Connect Outlook
          </button>
        </div>

        {/* Privacy note */}
        <p className="mt-6 text-xs text-[#94A3B8]">
          Read-only access. Dominion never sends emails on your behalf.
        </p>
      </div>
    </div>
  );
}
