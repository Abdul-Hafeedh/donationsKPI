import React from 'react';
import { WeekData, DonationTransaction } from '../types';
import { Calendar, User, DollarSign, X } from 'lucide-react';

interface WeekDetailsModalProps {
  week: WeekData;
  onClose: () => void;
}

export function formatDonorName(fullName: string): string {
  if (!fullName || fullName.trim() === '' || fullName.toLowerCase() === 'anonym') {
    return 'Anonym';
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const initial = parts[1].charAt(0).toUpperCase();
  return `${firstName} ${initial}.`;
}

export const WeekDetailsModal: React.FC<WeekDetailsModalProps> = ({ week, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            border: 'none',
            background: '#f1f5f9',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', paddingRight: '40px', gap: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.25 }}>
            Uge {week.week} ({week.year})
          </h3>
          {week.mobilePayNumber && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: week.mobilePayNumber === '901600' ? '#e6f4ea' : '#e0f2fe',
                color: week.mobilePayNumber === '901600' ? '#004d40' : '#0284c7',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>📱 Nr. {week.mobilePayNumber}</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>({week.mobilePayNumber === '901600' ? 'Gammelt nr' : 'Aktivt nr'})</span>
            </span>
          )}
        </div>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          {week.dateRange}
        </p>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TOTAL INDSAMLING</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#004d40', marginTop: '2px' }}>
              {week.totalAmount} kr.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ANTAL BIDRAG</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {week.donationCount}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>GENNEMSNIT</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {Math.round(week.averageAmount)} kr.
            </div>
          </div>
        </div>

        {/* Donations list if available */}
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
            Registrerede donationer i denne uge:
          </h4>

          {week.donations && week.donations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {week.donations.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    borderLeft: '4px solid #004d40',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{formatDonorName(d.name)}</span>
                      {(d.amount % 5 !== 0 || Math.abs(d.amount - Math.round(d.amount)) > 0.01) && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7',
                          }}
                        >
                          Let's Repair
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {new Date(d.dateTime).toLocaleString('da-DK', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#004d40' }}>
                    {d.amount} kr.
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Samlet uge-opgørelse for Repair Café café-dagen. Individuelle Vipps MobilePay detaljer logges løbende.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
