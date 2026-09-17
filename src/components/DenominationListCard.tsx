import React, { useState } from 'react';
import { DenominationStat } from '../types';

interface DenominationListCardProps {
  denominations: DenominationStat[];
  onSelectDenomination?: (amount: number) => void;
  selectedAmount?: number | null;
}

export const DenominationListCard: React.FC<DenominationListCardProps> = ({
  denominations = [
    { amount: 50, count: 44, percentage: 36 },
    { amount: 100, count: 42, percentage: 34 },
    { amount: 25, count: 31, percentage: 25 },
  ],
  onSelectDenomination,
  selectedAmount,
}) => {
  const [hoveredAmt, setHoveredAmt] = useState<number | null>(null);

  return (
    <div
      className="dashboard-card"
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        height: '100%',
        width: '100%',
        transition: 'all 0.2s ease',
        boxShadow: selectedAmount
          ? '0 0 0 2px #004d40, 0 8px 20px -4px rgba(0, 77, 64, 0.15)'
          : '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <h3
          style={{
            fontSize: '23px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#000000',
            lineHeight: 1.15,
          }}
        >
          Beløb doneret
        </h3>
        {selectedAmount && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelectDenomination?.(selectedAmount);
            }}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#e6f4ea',
              color: '#004d40',
              padding: '2px 8px',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
            title="Klik for at nulstille filter"
          >
            Aktiv ({selectedAmount} kr.) ✕
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
          maxWidth: '260px',
        }}
      >
        {denominations.slice(0, 3).map((item) => {
          const isSelected = selectedAmount === item.amount;
          const isHovered = hoveredAmt === item.amount;

          return (
            <div
              key={item.amount}
              onClick={() => onSelectDenomination?.(item.amount)}
              onMouseEnter={() => setHoveredAmt(item.amount)}
              onMouseLeave={() => setHoveredAmt(null)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: '8px',
                backgroundColor: isSelected
                  ? '#e6f4ea'
                  : isHovered
                  ? '#f1f5f9'
                  : 'transparent',
                transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
              title={`Klik for at filtrere donationer på ${item.amount} kr.`}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: isSelected ? '#004d40' : '#000000',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                {item.amount} kr.
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: isSelected ? '#004d40' : '#1e293b',
                  lineHeight: 1.25,
                }}
              >
                ({item.count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
