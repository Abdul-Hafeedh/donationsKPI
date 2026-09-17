import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MetricCard } from './components/MetricCard';
import { WeeklyBarChart } from './components/WeeklyBarChart';
import { LargestAmountsCard } from './components/LargestAmountsCard';
import { DenominationListCard } from './components/DenominationListCard';
import { HeaderControls } from './components/HeaderControls';
import { WeekDetailsModal } from './components/WeekDetailsModal';
import { PeriodSelector, DateRange } from './components/PeriodSelector';
import { unlockDonations, aggregateDonationsByWeek, DecryptedDonationsBundle } from './data/vippsDataLoader';
import { WeekData, DonationTransaction } from './types';
import { Target, TrendingUp, Users, X, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { PasswordPrompt } from './components/PasswordPrompt';

export function App() {
  const [unlockedData, setUnlockedData] = useState<DecryptedDonationsBundle | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [targetAmount, setTargetAmount] = useState<number>(250);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  const [filteredAmount, setFilteredAmount] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<'largest' | 'denominations' | null>(null);
  const [activeKpiModal, setActiveKpiModal] = useState<'mal' | 'gennemsnit' | 'donationer' | null>(null);
  const [inspectingWeek, setInspectingWeek] = useState<WeekData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Opdater');
  const [showBarStats, setShowBarStats] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'Vælg periode',
    presetKey: 'all',
  });

  // Try auto-unlocking from session storage if already authenticated in this browser session
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('rc_auth_key');
    if (savedPassword) {
      unlockDonations(savedPassword)
        .then(bundle => setUnlockedData(bundle))
        .catch(() => sessionStorage.removeItem('rc_auth_key'));
    }
  }, []);

  const handleUnlock = async (pass: string): Promise<boolean> => {
    try {
      const bundle = await unlockDonations(pass);
      setUnlockedData(bundle);
      sessionStorage.setItem('rc_auth_key', pass);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('rc_auth_key');
    setUnlockedData(null);
  };

  // Listen for Escape key to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectingWeek) {
          setInspectingWeek(null);
        } else if (activeKpiModal) {
          setActiveKpiModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingWeek, activeKpiModal]);

  // If a date range preset explicitly targets a single year (e.g. Sidste år), auto-sync selectedYear if desired
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setSelectedWeekNum(null);
    if (newRange.presetKey === 'last_year') {
      setSelectedYear(2025);
    } else if (newRange.presetKey === 'this_year') {
      setSelectedYear(2026);
    } else if (newRange.presetKey === 'all') {
      // keep selectedYear or 2026
    }
  };

  // Filter the master pool of donations by the selected date range
  const allDonationsList = useMemo(() => {
    return unlockedData?.allDonations || [];
  }, [unlockedData]);

  const filteredDonations = useMemo(() => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return allDonationsList;
    }
    return allDonationsList.filter(d => {
      const dt = d.dateTime.slice(0, 10);
      if (dateRange.startDate && dt < dateRange.startDate) return false;
      if (dateRange.endDate && dt > dateRange.endDate) return false;
      return true;
    });
  }, [allDonationsList, dateRange]);

  // Compute weeks based on filtered donations
  const rawWeeks = useMemo(() => {
    return aggregateDonationsByWeek(filteredDonations);
  }, [filteredDonations]);

  // Apply amount filtering if user clicked a specific denomination/amount:
  // Shows which days (weeks) this specific donation amount was received
  const weeks = useMemo(() => {
    if (!filteredAmount) return rawWeeks;

    return rawWeeks.map(w => {
      const hasSpecificDonation = w.donations.some(d => Math.round(d.amount) === filteredAmount);
      return hasSpecificDonation ? w : { ...w, totalAmount: 0, donationCount: 0 };
    });
  }, [rawWeeks, filteredAmount]);

  // Compute KPI metrics dynamically based on filtered pool and selected year
  const metrics = useMemo(() => {
    let pool = filteredDonations;

    // Filter by year if a specific year is active (or if All is selected)
    if (selectedYear !== 0) {
      pool = pool.filter(d => d.dateTime.startsWith(String(selectedYear)));
    }

    const allAmounts = pool.map(d => Math.round(d.amount));
    
    // Calculate frequencies for all received donations
    const freqMap = new Map<number, number>();
    for (const amt of allAmounts) {
      if (amt > 0) {
        freqMap.set(amt, (freqMap.get(amt) || 0) + 1);
      }
    }

    // 3 most common donations:
    const sortedFreqs = Array.from(freqMap.entries())
      .map(([amount, count]) => ({
        amount,
        count,
        percentage: Math.round((count / (allAmounts.length || 1)) * 100),
      }))
      .sort((a, b) => b.count !== a.count ? b.count - a.count : b.amount - a.amount)
      .slice(0, 3);

    // 5 biggest single amounts donated:
    const uniqueAmountsSorted = Array.from(new Set(allAmounts)).sort((a, b) => b - a);
    const top5Amounts = uniqueAmountsSorted.slice(0, 5);

    // Almindelig vs. Let's Repair donations
    const isStandardDonation = (amount: number) => {
      const rounded = Math.round(amount);
      return Math.abs(amount - rounded) < 0.01 && rounded % 5 === 0;
    };
    const letsRepairDonations = pool.filter(d => !isStandardDonation(d.amount));
    const standardDonationsCount = pool.length - letsRepairDonations.length;
    const letsRepairDonationsCount = letsRepairDonations.length;

    // Weeks in scope for this calculation
    const validWeeks = rawWeeks.filter(w => {
      if (w.totalAmount <= 0) return false;
      if (selectedYear !== 0 && w.year !== selectedYear) return false;
      return true;
    });

    const totalAmount = validWeeks.reduce((acc, w) => acc + w.totalAmount, 0);
    const totalDonations = validWeeks.reduce((acc, w) => acc + w.donationCount, 0);
    const eventCount = Math.max(1, validWeeks.length);
    const eventsMetTarget = validWeeks.filter(w => w.totalAmount >= targetAmount).length;

    return {
      averagePerEvent: Math.round(totalAmount / eventCount),
      donationsPerEvent: Number((totalDonations / eventCount).toFixed(2)),
      totalAmount,
      totalDonations,
      eventsMetTarget,
      totalEvents: eventCount,
      amounts: top5Amounts.length >= 5 ? top5Amounts : [1000, 500, 400, 200, 100],
      denominations: sortedFreqs,
      standardDonationsCount,
      letsRepairDonationsCount,
      letsRepairSampleAmounts: Array.from(new Set(letsRepairDonations.map(d => Math.round(d.amount)))).slice(0, 4),
    };
  }, [filteredDonations, rawWeeks, targetAmount, selectedYear]);

  // Handle amount click from Største beløb
  const handleSelectLargestAmount = (amt: number) => {
    if (filteredAmount === amt && filterSource === 'largest') {
      setFilteredAmount(null);
      setFilterSource(null);
    } else {
      setFilteredAmount(amt);
      setFilterSource('largest');
    }
  };

  // Handle denomination click from Beløb doneret
  const handleSelectDenomination = (amt: number) => {
    if (filteredAmount === amt && filterSource === 'denominations') {
      setFilteredAmount(null);
      setFilterSource(null);
    } else {
      setFilteredAmount(amt);
      setFilterSource('denominations');
    }
  };

  // Manual refresh simulation / live check
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  const handleSelectWeek = (weekNum: number | null) => {
    setSelectedWeekNum(weekNum);
    if (weekNum !== null) {
      const found = weeks.find(w => {
        if (w.week !== weekNum) return false;
        if (selectedYear !== 0 && w.year !== selectedYear) return false;
        return true;
      });
      if (found) {
        setInspectingWeek(found);
      }
    }
  };

  const [showAdminControls, setShowAdminControls] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const handleExportPng = async () => {
    if (!dashboardRef.current || isExporting) return;
    setIsExporting(true);
    // Wait for React to commit the isExporting re-render and for the browser
    // to paint the updated DOM. This ensures toPng captures the current state
    // (including any active filters) rather than a stale pre-render snapshot.
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    try {
      const source = dashboardRef.current;
      if (!source) { setIsExporting(false); return; }

      // Reference image proportions (5334 × 3000 px):
      // The reference uses a #e3e3e3 background with the card grid inset by
      // asymmetric padding (~2% left, ~1.5% right, ~2.3% top, ~3% bottom).
      // We replicate this by capturing the live dashboard at its natural
      // viewport size × devicePixelRatio for a crisp retina-quality output,
      // then compositing it onto a padded canvas.
      const dpr = window.devicePixelRatio || 2;

      // Padding ratios derived from the reference image (5334×3000):
      // Left: ~110px/5334 ≈ 2.06%, Right: ~82px/5334 ≈ 1.54%
      // Top: ~68px/3000 ≈ 2.27%, Bottom: ~90px/3000 ≈ 3.0%
      const PAD_RATIO_LEFT = 0.0206;
      const PAD_RATIO_RIGHT = 0.0154;
      const PAD_RATIO_TOP = 0.0227;
      const PAD_RATIO_BOTTOM = 0.03;

      // Step 1: Capture the dashboard at its natural DOM size at full DPI.
      // No resizing — the layout stays exactly as the user sees it on screen.
      const filterFn = (node: HTMLElement) => {
        if (node instanceof HTMLElement) {
          if (
            node.getAttribute('data-export-ignore') === 'true' ||
            node.closest?.('[data-export-ignore="true"]')
          ) {
            return false;
          }
          if (node.tagName?.toLowerCase() === 'select') return false;
        }
        return true;
      };

      const rawDataUrl = await toPng(source, {
        cacheBust: true,
        pixelRatio: dpr,
        backgroundColor: '#e3e3e3',
        filter: filterFn,
      });

      // Step 2: Load captured image
      const srcImg = new Image();
      await new Promise<void>((resolve, reject) => {
        srcImg.onload = () => resolve();
        srcImg.onerror = reject;
        srcImg.src = rawDataUrl;
      });

      // Step 3: Composite onto final canvas with reference-style padding.
      // The captured image becomes the inner card area; we add the grey
      // border around it matching the reference proportions.
      const capturedW = srcImg.naturalWidth;
      const capturedH = srcImg.naturalHeight;

      // Calculate padding in pixels based on the captured card dimensions
      const padLeft = Math.round(capturedW * PAD_RATIO_LEFT / (1 - PAD_RATIO_LEFT - PAD_RATIO_RIGHT));
      const padRight = Math.round(capturedW * PAD_RATIO_RIGHT / (1 - PAD_RATIO_LEFT - PAD_RATIO_RIGHT));
      const padTop = Math.round(capturedH * PAD_RATIO_TOP / (1 - PAD_RATIO_TOP - PAD_RATIO_BOTTOM));
      const padBottom = Math.round(capturedH * PAD_RATIO_BOTTOM / (1 - PAD_RATIO_TOP - PAD_RATIO_BOTTOM));

      const canvasW = capturedW + padLeft + padRight;
      const canvasH = capturedH + padTop + padBottom;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;
      // No image smoothing needed — we're drawing the capture at 1:1 pixel ratio
      ctx.imageSmoothingEnabled = false;

      // Fill the outer background
      ctx.fillStyle = '#e3e3e3';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Draw the captured image at 1:1 pixel ratio (no scaling = no blur)
      ctx.drawImage(srcImg, padLeft, padTop);

      const dataUrl = canvas.toDataURL('image/png');

      // Check if the browser supports the File System Access API (showSaveFilePicker)
      // which opens the OS native "Gem som..." (Save As) dialog allowing the user to choose folder and filename
      if ('showSaveFilePicker' in window) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          const defaultFileName = `reparations-konsortiet-dashboard-${selectedYear === 0 ? 'alle-aar' : selectedYear}.png`;
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [
              {
                description: 'PNG Billede',
                accept: { 'image/png': ['.png'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (pickerErr: any) {
          // If the user cancelled the save dialog, do nothing
          if (pickerErr.name === 'AbortError') {
            return;
          }
          console.warn('showSaveFilePicker failed or was rejected, falling back to link download', pickerErr);
        }
      }

      // Fallback for browsers without showSaveFilePicker: standard browser download
      const link = document.createElement('a');
      link.download = `reparations-konsortiet-dashboard-${selectedYear === 0 ? 'alle-aar' : selectedYear}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export dashboard as PNG', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!unlockedData) {
    return <PasswordPrompt onUnlock={handleUnlock} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Menu Bar Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button
          onClick={() => setShowAdminControls(!showAdminControls)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '6px',
          }}
        >
          {showAdminControls ? 'Skjul indstillinger ▲' : '⚙ Data & Mål indstillinger ▼'}
        </button>
      </div>

      {showAdminControls && (
        <div style={{ marginBottom: '12px' }}>
          <HeaderControls
            dataSource="live"
            onSourceChange={() => {}}
            targetAmount={targetAmount}
            onTargetChange={setTargetAmount}
            lastUpdated={lastUpdated}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onExportPng={handleExportPng}
            isExporting={isExporting}
            periodSelector={<PeriodSelector value={dateRange} onChange={handleDateRangeChange} />}
            showBarStats={showBarStats}
            onToggleBarStats={() => setShowBarStats(!showBarStats)}
            onLock={handleLock}
          />
        </div>
      )}

      {/* Main Dashboard Layout Container matching the reference design dimensions */}
      <div ref={dashboardRef} className="dashboard-grid-container">
        {/* Top Section: Left 2 KPIs (24.6%) + Weekly Bar Chart (75.4%) */}
        <div className="dashboard-top-section">
          <div className="dashboard-left-kpis">
            {/* Card 1: Mål */}
            <MetricCard
              title="Mål"
              value={targetAmount}
              unit="kr."
              subtitle="pr. gang"
              interactive={true}
              hint="Klik for mål-detaljer & justering"
              isSelected={activeKpiModal === 'mal'}
              onClick={() => setActiveKpiModal('mal')}
            />

            {/* Card 2: Gennemsnit */}
            <MetricCard
              title="Gennemsnit"
              value={metrics.averagePerEvent}
              unit="kr."
              subtitle="pr. gang"
              interactive={true}
              hint="Klik for gennemsnits-analyse"
              isSelected={activeKpiModal === 'gennemsnit'}
              onClick={() => setActiveKpiModal('gennemsnit')}
            />
          </div>

          {/* Top Right Main Canvas: Weekly Bar Chart */}
          <div style={{ height: '100%', width: '100%', minHeight: 0 }}>
            <WeeklyBarChart
              weeks={weeks}
              selectedYear={selectedYear}
              onYearChange={(yr) => {
                setSelectedYear(yr);
                setFilteredAmount(null);
                setFilterSource(null);
                setSelectedWeekNum(null);
              }}
              availableYears={[2026, 2025, 2024, 2023, 2022, 2021, 2020]}
              selectedWeek={selectedWeekNum}
              onSelectWeek={handleSelectWeek}
              targetAmount={targetAmount}
              averageAmount={metrics.averagePerEvent}
              filterAmount={filteredAmount}
              onClearFilter={() => {
                setFilteredAmount(null);
                setFilterSource(null);
              }}
              onExportPng={handleExportPng}
              isExporting={isExporting}
              dateRange={dateRange}
              showBarStats={showBarStats}
              onToggleBarStats={() => setShowBarStats(!showBarStats)}
            />
          </div>
        </div>

        {/* Bottom Section: 3 equal cards (Største beløb, Donationer pr. gang, Beløb doneret) */}
        <div className="dashboard-bottom-section">
          {/* Bottom Card 1: Største beløb */}
          <LargestAmountsCard
            amounts={metrics.amounts}
            onSelectAmount={handleSelectLargestAmount}
            filteredAmount={filterSource === 'largest' ? filteredAmount : null}
          />

          {/* Bottom Card 2: Donationer pr. gang */}
          <MetricCard
            title="Donationer pr. gang"
            value={metrics.donationsPerEvent}
            interactive={true}
            hint="Klik for frekvens-fordeling"
            isSelected={activeKpiModal === 'donationer'}
            onClick={() => setActiveKpiModal('donationer')}
          />

          {/* Bottom Card 3: Beløb doneret */}
          <DenominationListCard
            denominations={metrics.denominations}
            selectedAmount={filterSource === 'denominations' ? filteredAmount : null}
            onSelectDenomination={handleSelectDenomination}
          />
        </div>
      </div>

      {/* Week Details Modal */}
      {inspectingWeek && (
        <WeekDetailsModal
          week={inspectingWeek}
          onClose={() => setInspectingWeek(null)}
        />
      )}

      {/* Interactive KPI Detail Modals */}
      {activeKpiModal === 'mal' && (
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
          onClick={() => setActiveKpiModal(null)}
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
            <button
              onClick={() => setActiveKpiModal(null)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingRight: '40px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#e6f4ea', color: '#004d40', flexShrink: 0 }}>
                <Target size={22} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, margin: 0 }}>
                Målopfyldelse (Mål: {targetAmount} kr.)
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              Statistik over café-dage der nåede indsamlingsmålet.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>SUCCESRATE</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#004d40', marginTop: '4px' }}>
                  {Math.round((metrics.eventsMetTarget / (metrics.totalEvents || 1)) * 100)}%
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{metrics.eventsMetTarget} af {metrics.totalEvents} café-dage</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>GENNEMSNIT VS MÅL</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: metrics.averagePerEvent >= targetAmount ? '#004d40' : '#e11d48', marginTop: '4px' }}>
                  {metrics.averagePerEvent >= targetAmount ? `+${metrics.averagePerEvent - targetAmount} kr.` : `${metrics.averagePerEvent - targetAmount} kr.`}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>i forhold til {targetAmount} kr. målet</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                Skift mål for donationer pr. gang:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[150, 200, 250, 300, 350, 400].map((val) => (
                  <button
                    key={val}
                    onClick={() => setTargetAmount(val)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: targetAmount === val ? '#004d40' : '#f1f5f9',
                      color: targetAmount === val ? '#ffffff' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {val} kr.
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeKpiModal === 'gennemsnit' && (
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
          onClick={() => setActiveKpiModal(null)}
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
            <button
              onClick={() => setActiveKpiModal(null)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingRight: '40px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fde8e1', color: '#ea580c', flexShrink: 0 }}>
                <TrendingUp size={22} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, margin: 0 }}>
                Gennemsnitlig Donation ({metrics.averagePerEvent} kr.)
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              Overordnet overblik over indsamlede beløb og café-dage.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TOTAL DONERET</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#004d40', marginTop: '2px' }}>
                  {metrics.totalAmount.toLocaleString('da-DK')} kr.
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>CAFÉ-DAGE</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {metrics.totalEvents}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>GNS. PR. GANG</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#004d40', marginTop: '2px' }}>
                  {metrics.averagePerEvent} kr.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeKpiModal === 'donationer' && (
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
          onClick={() => setActiveKpiModal(null)}
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
            <button
              onClick={() => setActiveKpiModal(null)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingRight: '40px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', flexShrink: 0 }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, margin: 0 }}>
                Donations-volumen ({metrics.donationsPerEvent} pr. gang)
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              Frekvens af besøgende gæster der giver et bidrag via MobilePay.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TOTAL DONATIONER</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {metrics.totalDonations} stk.
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>GNS. DONATIONSBELØB</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#004d40', marginTop: '4px' }}>
                  {Math.round(metrics.totalAmount / (metrics.totalDonations || 1))} kr.
                </div>
              </div>
            </div>

            {/* Almindelig vs Let's Repair breakdown */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Almindelig vs. Let's Repair donation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Almindelige</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {metrics.standardDonationsCount} stk.
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    F.eks. 50 kr., 100 kr., 20 kr.
                  </div>
                </div>
                <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700 }}>Let's Repair</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                    {metrics.letsRepairDonationsCount} stk.
                  </div>
                  <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px' }}>
                    Procentberegnede beløb
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive media style overrides */}
      <style>{`
        @media (max-width: 1024px) {
          .dashboard-left-col {
            grid-column: span 12 !important;
            flex-direction: row !important;
          }
          .dashboard-left-col > div {
            flex: 1;
          }
          .dashboard-main-chart {
            grid-column: span 12 !important;
          }
          .dashboard-bottom-card {
            grid-column: span 12 !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-left-col {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
