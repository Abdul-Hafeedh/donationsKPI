import React from 'react';
import { RefreshCw, Radio, CheckCircle, Sliders, Download, Lock } from 'lucide-react';

interface HeaderControlsProps {
  dataSource: 'live' | 'benchmark' | 'hybrid';
  onSourceChange: (source: 'live' | 'benchmark' | 'hybrid') => void;
  targetAmount: number;
  onTargetChange: (newTarget: number) => void;
  lastUpdated: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExportPng?: () => void;
  isExporting?: boolean;
  periodSelector?: React.ReactNode;
  showBarStats?: boolean;
  onToggleBarStats?: () => void;
  onLock?: () => void;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  dataSource,
  onSourceChange,
  targetAmount,
  onTargetChange,
  lastUpdated,
  isRefreshing,
  onRefresh,
  onExportPng,
  isExporting,
  periodSelector,
  showBarStats = false,
  onToggleBarStats,
  onLock,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 24px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Brand & API status on Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, margin: 0 }}>
            Reparations.Konsortiet
          </h1>
        </div>

        {periodSelector && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: 300 }}>|</span>
            {periodSelector}
          </div>
        )}
      </div>

      {/* Target (Mål) adjuster, refresh & PNG on Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="target-goal-select" style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
            Mål:
          </label>
          <select
            id="target-goal-select"
            value={targetAmount}
            onChange={(e) => onTargetChange(Number(e.target.value))}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            {[150, 200, 250, 300, 350, 400].map((val) => (
              <option key={val} value={val}>
                {val} kr.
              </option>
            ))}
          </select>

          {/* Søjletal toggle placed right next to Mål */}
          {onToggleBarStats && (
            <button
              onClick={onToggleBarStats}
              title="Vis / skjul statistik (Uge, Total, Donationer, Gennemsnit) over hver søjle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: showBarStats ? '#004d40' : '#f8fafc',
                border: `1px solid ${showBarStats ? '#004d40' : '#cbd5e1'}`,
                color: showBarStats ? '#ffffff' : '#334155',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '12px' }}>📊</span>
              <span>Søjletal: {showBarStats ? 'Til' : 'Fra'}</span>
            </button>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Opdater seneste Vipps transaktioner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {lastUpdated}
        </button>

        {onExportPng && (
          <button
            onClick={onExportPng}
            disabled={isExporting}
            title="Download PNG billede af dashboardet"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#004d40',
              cursor: isExporting ? 'wait' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
              transition: 'background 0.15s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Download size={14} />
            {isExporting ? 'Eksporterer...' : 'Eksportér PNG'}
          </button>
        )}

        {onLock && (
          <button
            onClick={onLock}
            title="Lås dashboard og ryd dekrypteret data fra browseren"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Lock size={13} />
            Lås
          </button>
        )}
      </div>
    </header>
  );
};
