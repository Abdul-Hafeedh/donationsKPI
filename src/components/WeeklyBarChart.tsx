import React, { useState } from 'react';
import { WeekData } from '../types';
import { DateRange } from './PeriodSelector';
import { getISOWeek } from '../data/vippsDataLoader';
import { Download } from 'lucide-react';

interface WeeklyBarChartProps {
  weeks: WeekData[];
  selectedYear: number;
  onYearChange?: (year: number) => void;
  availableYears?: number[];
  selectedWeek: number | null;
  onSelectWeek: (week: number | null) => void;
  targetAmount: number;
  averageAmount: number;
  filterAmount?: number | null;
  onClearFilter?: () => void;
  onExportPng?: () => void;
  isExporting?: boolean;
  dateRange?: DateRange;
  showBarStats?: boolean;
  onToggleBarStats?: () => void;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  weeks,
  selectedYear = 2026,
  onYearChange,
  availableYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020],
  selectedWeek,
  onSelectWeek,
  targetAmount,
  averageAmount,
  filterAmount,
  onClearFilter,
  onExportPng,
  isExporting,
  dateRange,
  showBarStats = false,
  onToggleBarStats,
}) => {
  const [hoveredWeek, setHoveredWeek] = useState<WeekData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; showBelow?: boolean } | null>(null);

  // SVG viewBox geometry matching orig (736 x 366 card)
  const width = 800;
  const height = 370;
  const marginLeft = 66;
  const marginRight = 32;
  const marginTop = 46;
  const marginBottom = 34;

  const chartWidth = width - marginLeft - marginRight;
  const chartHeight = height - marginTop - marginBottom;

  // Check if we are viewing "Alle år" (yearly overview)
  const isAllYearsView = selectedYear === 0;

  // Build yearly data when in "Alle år" mode
  const sortedYearsAsc = [...availableYears].sort((a, b) => a - b);
  const yearlyItems = sortedYearsAsc.map(yr => {
    const yrWeeks = weeks.filter(w => w.year === yr);
    const totalAmount = Math.round(yrWeeks.reduce((acc, w) => acc + w.totalAmount, 0) * 100) / 100;
    const donationCount = yrWeeks.reduce((acc, w) => acc + w.donationCount, 0);
    const averageAmount = donationCount > 0 ? Math.round((totalAmount / donationCount) * 100) / 100 : 0;
    const allYrDonations = yrWeeks.flatMap(w => w.donations || []);
    return {
      year: yr,
      totalAmount,
      donationCount,
      averageAmount,
      donations: allYrDonations,
    };
  });

  // Filter weeks by year for single-year view
  const activeWeeks = weeks.filter((w) => {
    if (selectedYear !== 0 && w.year && w.year !== selectedYear) return false;
    return true;
  });

  const weekMap = new Map<number, WeekData>();
  activeWeeks.forEach(w => {
    weekMap.set(w.week, w);
  });

  // Compute visible week numbers: if a date range filter is active, show only
  // weeks that fall within the period. Otherwise show weeks 1-53.
  const hasDateFilter = !!(dateRange && dateRange.startDate && dateRange.endDate && dateRange.presetKey !== 'all');
  let visibleWeekNumbers: number[];
  if (hasDateFilter && selectedYear !== 0) {
    const start = new Date(dateRange!.startDate! + 'T12:00:00');
    const end = new Date(dateRange!.endDate! + 'T12:00:00');
    const startIso = getISOWeek(start);
    const endIso = getISOWeek(end);

    let minWeek = 1;
    let maxWeek = 53;
    if (startIso.year === selectedYear) minWeek = startIso.week;
    else if (startIso.year > selectedYear) minWeek = 54; // out of range
    if (endIso.year === selectedYear) maxWeek = endIso.week;
    else if (endIso.year < selectedYear) maxWeek = 0; // out of range

    visibleWeekNumbers = [];
    for (let w = minWeek; w <= maxWeek; w++) visibleWeekNumbers.push(w);
  } else {
    // Default: show weeks 1-53
    visibleWeekNumbers = Array.from({ length: 53 }, (_, i) => i + 1);
  }

  // Dynamic Y-axis: scale to the max data value in visible weeks or visible years
  const maxDataValue = isAllYearsView
    ? Math.max(...yearlyItems.map(y => y.totalAmount), 1000)
    : Math.max(...visibleWeekNumbers.map(wn => weekMap.get(wn)?.totalAmount ?? 0), 100);

  // Round up to a "nice" tick value (nearest 2500, 5000, 100 or 200 depending on range)
  let tickStep = 200;
  if (isAllYearsView) {
    if (maxDataValue > 15000) tickStep = 2500;
    else if (maxDataValue > 8000) tickStep = 2000;
    else tickStep = 1000;
  } else {
    tickStep = maxDataValue <= 500 ? 100 : 200;
  }
  const maxScaleValue = Math.ceil(maxDataValue * 1.15 / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let t = maxScaleValue; t >= 0; t -= tickStep) yTicks.push(t);

  const totalSlots = isAllYearsView ? yearlyItems.length : visibleWeekNumbers.length;
  const slotWidth = chartWidth / totalSlots;
  // Wider bars when in yearly view or fewer weeks, thinner when many weeks
  const barWidth = isAllYearsView
    ? Math.min(slotWidth * 0.58, 48)
    : totalSlots <= 10
      ? Math.min(slotWidth * 0.7, 50)
      : Math.max(6.5, slotWidth * 0.76);

  // Compute trendline: for all years, calculate annual average donation; for weekly, average per event
  const annualAverage = isAllYearsView
    ? (yearlyItems.reduce((acc, y) => acc + y.totalAmount, 0) / Math.max(1, yearlyItems.filter(y => y.totalAmount > 0).length))
    : averageAmount;
  const trendY = marginTop + chartHeight * (1 - annualAverage / maxScaleValue);

  // Formatted year title string
  const yearTitle = selectedYear === 0 ? "Alle år" : `${selectedYear}`;

  // Compute period subtitle from dateRange
  const danishMonths = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  let periodSubtitle = '';
  if (hasDateFilter && dateRange) {
    const key = dateRange.presetKey;
    const startDate = new Date(dateRange.startDate! + 'T12:00:00');
    const endDate = new Date(dateRange.endDate! + 'T12:00:00');

    if (key === 'this_month' || key === 'last_month') {
      // Show month name, capitalised
      const monthName = danishMonths[startDate.getMonth()];
      periodSubtitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    } else if (key === 'this_quarter' || key === 'last_quarter') {
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      periodSubtitle = `${quarter}. kvartal`;
    } else if (key === 'this_week' || key === 'last_week') {
      const { week } = getISOWeek(startDate);
      periodSubtitle = `Uge ${week}`;
    } else if (key === 'today' || key === 'yesterday') {
      periodSubtitle = `${startDate.getDate()}. ${danishMonths[startDate.getMonth()]}`;
    } else if (key === 'this_year' || key === 'last_year') {
      // Full year — no subtitle needed
    } else {
      // Custom date range: "d/m til d/m"
      const fmtD = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
      periodSubtitle = `${fmtD(startDate)} til ${fmtD(endDate)}`;
    }
  }

  return (
    <div
      className="dashboard-card"
      style={{
        padding: '16px 20px 14px 20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Header title & controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          marginBottom: '4px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#334155',
              margin: 0,
            }}
          >
            {yearTitle}{periodSubtitle ? ` – ${periodSubtitle}` : ''}
          </h2>
        </div>

        {/* Top-right action buttons (hidden entirely during PNG export) */}
        {!isExporting && (
          <div data-export-ignore="true" style={{ position: 'absolute', right: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(selectedWeek !== null || filterAmount) && (
              <button
                onClick={() => {
                  onSelectWeek(null);
                  onClearFilter?.();
                }}
                style={{
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                Nulstil ✕
              </button>
            )}

            {onYearChange && (
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
                <option value={0}>Alle år</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* SVG Chart area */}
      <div style={{ position: 'relative', width: '100%', flex: 1 }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Y-axis gridlines and labels */}
          {yTicks.map((tick) => {
            const yPos = marginTop + chartHeight * (1 - tick / maxScaleValue);
            return (
              <g key={tick}>
                {/* Horizontal grid line */}
                <line
                  x1={marginLeft}
                  y1={yPos}
                  x2={width - marginRight}
                  y2={yPos}
                  stroke="#f1f3f5"
                  strokeWidth="1"
                />
                {/* Tick label */}
                <text
                  x={marginLeft - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="500"
                  fill="#94a3b8"
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid Lines */}
          {isAllYearsView ? (
            yearlyItems.map((item, idx) => {
              const xPos = marginLeft + idx * slotWidth;
              return (
                <line
                  key={`v-${item.year}`}
                  x1={xPos}
                  y1={marginTop}
                  x2={xPos}
                  y2={marginTop + chartHeight}
                  stroke="#f5f7fa"
                  strokeWidth="1"
                />
              );
            })
          ) : (
            visibleWeekNumbers.map((_wn, idx) => {
              const xPos = marginLeft + idx * slotWidth;
              return (
                <line
                  key={`v-${_wn}`}
                  x1={xPos}
                  y1={marginTop}
                  x2={xPos}
                  y2={marginTop + chartHeight}
                  stroke="#f5f7fa"
                  strokeWidth="1"
                />
              );
            })
          )}

          {/* Right boundary vertical line */}
          <line
            x1={width - marginRight}
            y1={marginTop}
            x2={width - marginRight}
            y2={marginTop + chartHeight}
            stroke="#f5f7fa"
            strokeWidth="1"
          />

          {/* Average Coral Trend Line */}
          <line
            x1={marginLeft}
            y1={trendY}
            x2={width - marginRight}
            y2={trendY}
            stroke="#f39775"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Yearly Bar elements for "Alle år" */}
          {isAllYearsView && yearlyItems.map((item, idx) => {
            const hasData = item.totalAmount > 0;
            const slotX = marginLeft + idx * slotWidth;
            const total = item.totalAmount;
            const bHeight = hasData ? Math.min(chartHeight, (total / maxScaleValue) * chartHeight) : 0;
            const bX = slotX + (slotWidth - barWidth) / 2;
            const bY = marginTop + chartHeight - bHeight;
            const isHovered = hoveredWeek?.year === item.year && hoveredWeek?.week === 0;

            const yearSyntheticWeek: WeekData = {
              week: 0,
              year: item.year,
              totalAmount: item.totalAmount,
              donationCount: item.donationCount,
              averageAmount: item.averageAmount,
              dateRange: `${item.year}`,
              donations: item.donations,
            };

            return (
              <g
                key={item.year}
                style={{ cursor: 'pointer' }}
                onClick={() => onYearChange?.(item.year)}
              >
                {/* Visual bar */}
                {hasData && (
                  <rect
                    data-bar="true"
                    x={bX}
                    y={bY}
                    width={barWidth}
                    height={bHeight}
                    fill={isHovered ? '#00362c' : '#004d40'}
                    rx="4"
                    style={{ transition: 'fill 0.15s ease' }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const showBelow = rect.top < 160;
                      setTooltipPos({
                        x: rect.left + rect.width / 2,
                        y: showBelow ? rect.bottom + 8 : rect.top - 8,
                        showBelow,
                      });
                      setHoveredWeek(yearSyntheticWeek);
                    }}
                    onMouseLeave={() => {
                      setHoveredWeek(null);
                      setTooltipPos(null);
                    }}
                  />
                )}

                {/* Optional stats badge over each bar: Å, T, D, G */}
                {showBarStats && hasData && (
                  <g pointerEvents="none">
                    <rect
                      x={slotX + slotWidth / 2 - 25}
                      y={Math.max(6, bY - 44)}
                      width={50}
                      height={40}
                      rx={5}
                      fill="#1e293b"
                      opacity={0.94}
                    />
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 9}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      Å: <tspan fill="#ffffff" fontWeight="800">{item.year}</tspan>
                    </text>
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 18}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      T: <tspan fill="#34d399" fontWeight="800">{Math.round(total).toLocaleString('da-DK')}</tspan>
                    </text>
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 27}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      D: <tspan fill="#ffffff" fontWeight="800">{item.donationCount}</tspan>
                    </text>
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 36}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      G: <tspan fill="#38bdf8" fontWeight="800">{Math.round(item.averageAmount)}</tspan>
                    </text>
                  </g>
                )}

                {/* X-axis year label */}
                <text
                  x={slotX + slotWidth / 2}
                  y={marginTop + chartHeight + 16}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#475569"
                  style={{ transition: 'fill 0.15s ease' }}
                >
                  {item.year}
                </text>
              </g>
            );
          })}

          {/* Bar elements for weekly view */}
          {!isAllYearsView && visibleWeekNumbers.map((weekNum, idx) => {
            const data = weekMap.get(weekNum);
            const hasData = !!data && data.totalAmount > 0;
            const isSelected = selectedWeek === weekNum;
            const slotX = marginLeft + idx * slotWidth;

            // Adaptive font size for x-axis labels
            const labelFontSize = totalSlots <= 15 ? '12' : totalSlots <= 30 ? '10.5' : '9.5';

            // When no data for this slot: clickable to select/filter, but does not pop up 0 kr tooltip
            if (!hasData) {
              return (
                <g key={weekNum}>
                  <rect
                    x={slotX}
                    y={marginTop}
                    width={slotWidth}
                    height={chartHeight}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectWeek(isSelected ? null : weekNum)}
                  />
                  <text
                    x={slotX + slotWidth / 2}
                    y={marginTop + chartHeight + 14}
                    textAnchor="middle"
                    fontSize={labelFontSize}
                    fontWeight={isSelected ? '800' : '500'}
                    fill={isSelected ? '#004d40' : '#64748b'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectWeek(isSelected ? null : weekNum)}
                  >
                    {weekNum}
                  </text>
                </g>
              );
            }

            // Single unified Green bar for the week with data
            const total = data.totalAmount;
            const bHeight = Math.min(chartHeight, (total / maxScaleValue) * chartHeight);
            const bX = slotX + (slotWidth - barWidth) / 2;
            const bY = marginTop + chartHeight - bHeight;
            const isHovered = hoveredWeek?.week === data.week && hoveredWeek?.year === data.year;

            return (
              <g
                key={weekNum}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectWeek(isSelected ? null : weekNum)}
              >
                {/* Visual bar with direct hover listeners */}
                <rect
                  data-bar="true"
                  x={bX}
                  y={bY}
                  width={barWidth}
                  height={bHeight}
                  fill={isSelected ? '#0f766e' : isHovered ? '#00362c' : '#004d40'}
                  rx={totalSlots <= 15 ? '3' : '1'}
                  style={{ transition: 'fill 0.15s ease' }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    // Position tooltip closely right above the top of the bar, or below if bar is near the top
                    const showBelow = rect.top < 160;
                    setTooltipPos({
                      x: rect.left + rect.width / 2,
                      y: showBelow ? rect.bottom + 8 : rect.top - 8,
                      showBelow,
                    });
                    setHoveredWeek(data);
                  }}
                  onMouseLeave={() => {
                    setHoveredWeek(null);
                    setTooltipPos(null);
                  }}
                />

                {/* Optional stats badge over each bar: U, T, D, G */}
                {showBarStats && (
                  <g pointerEvents="none">
                    {/* Dark pill background */}
                    <rect
                      x={slotX + slotWidth / 2 - 16}
                      y={Math.max(6, bY - 44)}
                      width={32}
                      height={40}
                      rx={5}
                      fill="#1e293b"
                      opacity={0.94}
                    />
                    {/* U: Week */}
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 9}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      U: <tspan fill="#ffffff" fontWeight="800">{weekNum}</tspan>
                    </text>
                    {/* T: Total */}
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 18}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      T: <tspan fill="#34d399" fontWeight="800">{Math.round(total)}</tspan>
                    </text>
                    {/* D: Donationer */}
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 27}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      D: <tspan fill="#ffffff" fontWeight="800">{data.donationCount}</tspan>
                    </text>
                    {/* G: Gennemsnit */}
                    <text
                      x={slotX + slotWidth / 2}
                      y={Math.max(6, bY - 44) + 36}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      fill="#94a3b8"
                      letterSpacing="-0.02em"
                    >
                      G: <tspan fill="#38bdf8" fontWeight="800">{Math.round(data.averageAmount)}</tspan>
                    </text>
                  </g>
                )}

                {/* X-axis week number label */}
                <text
                  x={slotX + slotWidth / 2}
                  y={marginTop + chartHeight + 14}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fontWeight={isSelected ? '800' : '600'}
                  fill={isSelected ? '#004d40' : '#475569'}
                  style={{ transition: 'fill 0.15s ease' }}
                >
                  {weekNum}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip Overlay */}
        {hoveredWeek && tooltipPos && (
          <div
            style={{
              position: 'fixed',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: tooltipPos.showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              zIndex: 100,
              minWidth: '175px',
              animation: 'tooltipFadeIn 0.1s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>
                {hoveredWeek.week === 0 ? `År ${hoveredWeek.year}` : `Uge ${hoveredWeek.week} (${hoveredWeek.dateRange})`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span style={{ color: '#94a3b8' }}>Total:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>{hoveredWeek.totalAmount.toLocaleString('da-DK')} kr.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span style={{ color: '#94a3b8' }}>Donationer:</span>
              <span style={{ fontWeight: 600 }}>{hoveredWeek.donationCount} stk</span>
            </div>
            {hoveredWeek.donationCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span style={{ color: '#94a3b8' }}>Gennemsnit:</span>
                <span style={{ fontWeight: 600 }}>{Math.round(hoveredWeek.averageAmount).toLocaleString('da-DK')} kr.</span>
              </div>
            )}

            {/* Almindelig vs. Let's Repair breakdown */}
            {hoveredWeek.donations && hoveredWeek.donations.length > 0 && (() => {
              const isStandardDonation = (amount: number) => {
                const rounded = Math.round(amount);
                return Math.abs(amount - rounded) < 0.01 && rounded % 5 === 0;
              };
              const letsRepairCount = hoveredWeek.donations.filter(d => !isStandardDonation(d.amount)).length;
              const standardCount = hoveredWeek.donations.length - letsRepairCount;

              return (
                <div style={{ margin: '6px 0 3px 0', paddingTop: '5px', borderTop: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>
                    Type fordeling:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ color: '#cbd5e1' }}>Almindelig:</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{standardCount} stk</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                    <span style={{ color: '#cbd5e1' }}>Let's Repair:</span>
                    <span style={{ fontWeight: 700, color: letsRepairCount > 0 ? '#38bdf8' : '#94a3b8' }}>
                      {letsRepairCount} stk
                    </span>
                  </div>
                </div>
              );
            })()}

            {filterAmount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0 2px 0', backgroundColor: '#0f3d32', padding: '2px 6px', borderRadius: '4px' }}>
                <span style={{ color: '#6ee7b7' }}>Med {filterAmount} kr.:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>
                  {hoveredWeek.donations.filter(d => Math.round(d.amount) === filterAmount).length}x
                </span>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', textAlign: 'center' }}>
              {hoveredWeek.week === 0 ? 'Klik for at se uger for dette år' : 'Klik for detaljeret ugeoversigt'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
