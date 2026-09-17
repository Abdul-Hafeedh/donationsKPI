import React, { useState } from 'react';

interface LargestAmountsCardProps {
  amounts: number[];
  selectedAmount?: number;
  onSelectAmount?: (amt: number) => void;
  filteredAmount?: number | null;
}

export const LargestAmountsCard: React.FC<LargestAmountsCardProps> = ({
  amounts = [450, 500, 350, 325, 300],
  onSelectAmount,
  filteredAmount,
}) => {
  const [hoveredAmt, setHoveredAmt] = useState<number | null>(null);

  // Take the 5 biggest single amounts donated
  // The absolute biggest amount is max(amounts)
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 500;

  // Layout matching the design:
  // In the reference image: [450, (500), 350] on top row, [325, 300] on bottom row
  // If amounts are sorted [500, 450, 350, 325, 300], place the max in the center of top row:
  let topRow: number[] = [];
  let bottomRow: number[] = [];

  if (amounts.length >= 5) {
    const sorted = [...amounts].sort((a, b) => b - a);
    const top1 = sorted[0]; // biggest (circled in center)
    const top2 = sorted[1]; // left of biggest
    const top3 = sorted[2]; // right of biggest
    const top4 = sorted[3];
    const top5 = sorted[4];
    topRow = [top2, top1, top3];
    bottomRow = [top4, top5];
  } else {
    topRow = amounts.slice(0, 3);
    bottomRow = amounts.slice(3);
  }

  return (
    <div
      className="dashboard-card"
      style={{
        padding: '20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        height: '100%',
        width: '100%',
        transition: 'all 0.2s ease',
        boxShadow: filteredAmount !== null && filteredAmount !== undefined
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
          Største beløb
        </h3>
        {filteredAmount && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelectAmount?.(filteredAmount);
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
            Filtreret ({filteredAmount} kr.) ✕
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {/* Top Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '26px' }}>
          {topRow.map((amt) => {
            const isBiggest = amt === maxAmount;
            const isHovered = hoveredAmt === amt;

            if (isBiggest) {
              return (
                <div
                  key={amt}
                  onClick={() => onSelectAmount?.(amt)}
                  onMouseEnter={() => setHoveredAmt(amt)}
                  onMouseLeave={() => setHoveredAmt(null)}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 14px',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                  title={`Det absolut største enkeltbeløb over perioden: ${amt} kr.`}
                >
                  <svg
                    viewBox="0 0 110 50"
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      left: '-10px',
                      width: 'calc(100% + 20px)',
                      height: 'calc(100% + 12px)',
                      pointerEvents: 'none',
                    }}
                  >
                    <ellipse
                      cx="55"
                      cy="25"
                      rx="48"
                      ry="20"
                      fill={isHovered ? 'rgba(0, 77, 64, 0.08)' : 'none'}
                      stroke="#000000"
                      strokeWidth="2.4"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#000000',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {amt}
                  </span>
                </div>
              );
            }

            return (
              <span
                key={amt}
                onClick={() => onSelectAmount?.(amt)}
                onMouseEnter={() => setHoveredAmt(amt)}
                onMouseLeave={() => setHoveredAmt(null)}
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: isHovered ? '#004d40' : '#000000',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  backgroundColor: isHovered ? '#f1f5f9' : 'transparent',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
                title={`Enkeltbeløb: ${amt} kr.`}
              >
                {amt}
              </span>
            );
          })}
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
          {bottomRow.map((amt) => {
            const isHovered = hoveredAmt === amt;
            return (
              <span
                key={amt}
                onClick={() => onSelectAmount?.(amt)}
                onMouseEnter={() => setHoveredAmt(amt)}
                onMouseLeave={() => setHoveredAmt(null)}
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: isHovered ? '#004d40' : '#000000',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  backgroundColor: isHovered ? '#f1f5f9' : 'transparent',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
                title={`Enkeltbeløb: ${amt} kr.`}
              >
                {amt}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
