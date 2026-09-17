import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Calendar, ArrowLeft, ArrowRight, X } from 'lucide-react';

export interface DateRange {
  startDate: string | null; // 'YYYY-MM-DD'
  endDate: string | null;   // 'YYYY-MM-DD'
  label?: string;
  presetKey?: string;
}

interface PeriodSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { key: 'today', label: 'I dag' },
  { key: 'this_week', label: 'Denne uge' },
  { key: 'this_month', label: 'Denne måned' },
  { key: 'this_quarter', label: 'Dette kvartal' },
  { key: 'this_year', label: 'Dette år' },
];

function formatDateDK(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatISODate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

// Compute preset dates relative to current reference date (2026-09-17)
export function getPresetRange(key: string, refDate = new Date('2026-09-17T12:00:00')): { start: Date; end: Date; displayRange: string } {
  const d = new Date(refDate);

  if (key === 'today') {
    return { start: new Date(d), end: new Date(d), displayRange: formatDateDK(d) };
  }

  if (key === 'yesterday') {
    const y = new Date(d);
    y.setDate(y.getDate() - 1);
    return { start: y, end: y, displayRange: formatDateDK(y) };
  }

  if (key === 'this_week') {
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));
    return {
      start: monday,
      end: new Date(d),
      displayRange: `${monday.getDate()}.${monday.getMonth() + 1} - ${formatDateDK(d)}`,
    };
  }

  if (key === 'last_week') {
    const day = d.getDay() || 7;
    const lastSunday = new Date(d);
    lastSunday.setDate(d.getDate() - day);
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    return {
      start: lastMonday,
      end: lastSunday,
      displayRange: `${lastMonday.getDate()}.${lastMonday.getMonth() + 1} - ${formatDateDK(lastSunday)}`,
    };
  }

  if (key === 'this_month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    return {
      start,
      end: new Date(d),
      displayRange: `1.${d.getMonth() + 1} - ${formatDateDK(d)}`,
    };
  }

  if (key === 'this_quarter') {
    const currentQuarterStartMonth = Math.floor(d.getMonth() / 3) * 3;
    const start = new Date(d.getFullYear(), currentQuarterStartMonth, 1);
    return {
      start,
      end: new Date(d),
      displayRange: `1.${start.getMonth() + 1} - ${formatDateDK(d)}`,
    };
  }

  if (key === 'this_year') {
    const start = new Date(d.getFullYear(), 0, 1);
    return {
      start,
      end: new Date(d),
      displayRange: `1.1 - ${formatDateDK(d)}`,
    };
  }

  if (key === 'last_year') {
    const start = new Date(d.getFullYear() - 1, 0, 1);
    const end = new Date(d.getFullYear() - 1, 11, 31);
    return {
      start,
      end,
      displayRange: `1.1 - ${formatDateDK(end)}`,
    };
  }

  if (key === 'last_3_years') {
    const start = new Date(d.getFullYear() - 3, 0, 1);
    return {
      start,
      end: new Date(d),
      displayRange: `${d.getFullYear() - 3} - ${d.getFullYear()}`,
    };
  }

  // 'all'
  return {
    start: new Date(2020, 0, 1),
    end: new Date(d.getFullYear(), 11, 31),
    displayRange: 'Alle data',
  };
}

const MONTH_NAMES = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december'
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(8); // 8 = September
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActivePicker(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (presetKey: string, presetLabel: string) => {
    if (presetKey === 'all') {
      onChange({
        startDate: null,
        endDate: null,
        label: 'Alle',
        presetKey: 'all',
      });
    } else {
      const range = getPresetRange(presetKey);
      onChange({
        startDate: formatISODate(range.start),
        endDate: formatISODate(range.end),
        label: presetLabel,
        presetKey,
      });
    }
    setActivePicker(null);
    setIsOpen(false);
  };

  const currentLabel = value.label || (value.presetKey ? PRESETS.find(p => p.key === value.presetKey)?.label : null) || (value.startDate && value.endDate ? `${value.startDate} - ${value.endDate}` : 'Vælg periode');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() || 7) - 1;

  const handleDayClick = (day: number) => {
    const dateStr = formatISODate(new Date(viewYear, viewMonth, day));
    if (activePicker === 'from') {
      onChange({
        ...value,
        startDate: dateStr,
        label: `${dateStr} – ${value.endDate || ''}`,
        presetKey: undefined,
      });
      setActivePicker('to');
    } else if (activePicker === 'to') {
      onChange({
        ...value,
        endDate: dateStr,
        label: `${value.startDate || ''} – ${dateStr}`,
        presetKey: undefined,
      });
      setActivePicker(null);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button Matching User Screenshot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: '#ffffff',
            border: isOpen ? '2px solid #7c3aed' : '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0f172a',
            cursor: 'pointer',
            minWidth: '150px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentLabel}
          </span>
          {isOpen ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
        </button>

        {value.startDate && (
          <button
            onClick={() => handleSelectPreset('all', 'Alle')}
            title="Nulstil filter"
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 8px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              fontSize: '11px',
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown Modal matching the exact user reference screenshots */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '320px',
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.18)',
            padding: '16px',
            zIndex: 1000,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Custom Date Inputs Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                Fra
              </label>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: activePicker === 'from' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <input
                  type="date"
                  value={value.startDate || ''}
                  onFocus={() => setActivePicker('from')}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    if (newStart) {
                      const endDate = value.endDate || newStart;
                      onChange({
                        startDate: newStart,
                        endDate: endDate < newStart ? newStart : endDate,
                        label: 'Brugerdefineret',
                        presetKey: 'custom',
                      });
                    }
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    color: value.startDate ? '#0f172a' : '#94a3b8',
                    padding: '8px 0',
                    flex: 1,
                    fontFamily: 'inherit',
                  }}
                />
                <Calendar size={14} color="#334155" style={{ flexShrink: 0 }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                Til
              </label>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: activePicker === 'to' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              >
                <input
                  type="date"
                  value={value.endDate || ''}
                  onFocus={() => setActivePicker('to')}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    if (newEnd) {
                      const startDate = value.startDate || newEnd;
                      onChange({
                        startDate: startDate > newEnd ? newEnd : startDate,
                        endDate: newEnd,
                        label: 'Brugerdefineret',
                        presetKey: 'custom',
                      });
                    }
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    color: value.endDate ? '#0f172a' : '#94a3b8',
                    padding: '8px 0',
                    flex: 1,
                    fontFamily: 'inherit',
                  }}
                />
                <Calendar size={14} color="#334155" style={{ flexShrink: 0 }} />
              </div>
            </div>
          </div>

          {/* Interactive Date Picker Popover */}
          {activePicker && (
            <div
              style={{
                position: 'absolute',
                top: '80px',
                left: activePicker === 'to' ? '50px' : '12px',
                width: '260px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                padding: '14px',
                zIndex: 1100,
              }}
            >
              {/* Calendar header with prev/next arrows */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear(viewYear - 1);
                      } else {
                        setViewMonth(viewMonth - 1);
                      }
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    <ArrowLeft size={12} />
                  </button>
                  <button
                    onClick={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0);
                        setViewYear(viewYear + 1);
                      } else {
                        setViewMonth(viewMonth + 1);
                      }
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* Day initials */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>
                {['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'].map(d => (
                  <div key={d} style={{ padding: '2px 0' }}>{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const isToday = day === 17 && viewMonth === 8 && viewYear === 2026;
                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      style={{
                        border: 'none',
                        background: isToday ? '#e0e7ff' : 'transparent',
                        color: isToday ? '#4338ca' : '#0f172a',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: isToday ? 800 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Forudindstillede */}
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Forudindstillede
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {PRESETS.map((preset) => {
              const range = getPresetRange(preset.key);
              const isSelected = value.presetKey === preset.key;

              return (
                <button
                  key={preset.key}
                  onClick={() => handleSelectPreset(preset.key, preset.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSelected ? '#f5f3ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#7c3aed' : '#0f172a' }}>
                    {preset.label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {range.displayRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
