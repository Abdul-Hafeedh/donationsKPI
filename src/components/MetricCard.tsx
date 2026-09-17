import React, { useState } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  onClick?: () => void;
  interactive?: boolean;
  className?: string;
  badge?: string;
  hint?: string;
  isSelected?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  onClick,
  interactive = true,
  className = '',
  badge,
  hint,
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`dashboard-card flex flex-col justify-center select-none ${className}`}
      style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        height: '100%',
        width: '100%',
        cursor: interactive ? 'pointer' : 'default',
        transform: interactive && isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isSelected
          ? '0 0 0 2px #004d40, 0 8px 20px -4px rgba(0, 77, 64, 0.15)'
          : isHovered && interactive
          ? '0 10px 20px -4px rgba(0, 0, 0, 0.06), 0 2px 6px -2px rgba(0, 0, 0, 0.03)'
          : '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#004d40',
            backgroundColor: '#e6f4ea',
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          {badge}
        </span>
      )}

      {/* Header title */}
      <h3
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#0a0e14',
          marginBottom: '8px',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h3>

      {/* Large Numerical metric */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '4px',
        }}
      >
        <span
          className="num-bold"
          style={{
            fontSize: '62px',
            lineHeight: 1,
            fontWeight: 800,
            color: '#000000',
            letterSpacing: '-0.04em',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '40px',
              fontWeight: 800,
              color: '#000000',
              letterSpacing: '-0.03em',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle / Unit label */}
      {subtitle && (
        <div
          style={{
            fontSize: '20px',
            fontWeight: 500,
            color: '#1e293b',
            marginTop: '2px',
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Hover action hint */}
      {hint && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#004d40',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
            transition: 'all 0.15s ease',
            pointerEvents: 'none',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
};
