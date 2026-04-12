import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
} from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import { useChartColors } from '../../hooks/useDarkMode';
import { computeM4, scenarioRevenueBreakdown } from '../../utils/m4Calculations';
import ModernIcon from '../icons/ModernIcon';
import '../../styles/Module4.css';

const HORIZON = 5;
const SCENARIO_KEYS = ['s1', 's2', 's3_c1', 's3_c2', 's3_c3'];

const OVERRIDE_FIELDS = [
  { key: 'acquisition_logistics_cost', labelKey: 'module4FieldAcquisition' },
  { key: 'raising_cost', labelKey: 'module4FieldRaising' },
  { key: 'replacement_pct', labelKey: 'module4FieldReplacement' },
  { key: 'mortality_pct', labelKey: 'module4FieldMortality' },
  { key: 'lifetime_milk_kg', labelKey: 'module4FieldLifetimeMilk' },
  { key: 'raw_milk_margin_per_liter', labelKey: 'module4FieldMilkMargin' },
  { key: 'lifetime_cheese_kg', labelKey: 'module4FieldLifetimeCheese' },
  { key: 'cheese_margin_c1', labelKey: 'module4FieldCheeseMarginC1' },
  { key: 'cheese_margin_c2', labelKey: 'module4FieldCheeseMarginC2' },
  { key: 'cheese_margin_c3', labelKey: 'module4FieldCheeseMarginC3' },
  { key: 'daughters_per_life', labelKey: 'module4FieldDaughters' },
  { key: 'female_value', labelKey: 'module4FieldDaughterValue' },
];

const fmt = (n, d = 0) =>
  n == null || Number.isNaN(Number(n))
    ? '-'
    : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtMoney = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '-' : `$${fmt(n, d)}`);
const compactMoney = (n) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${Math.round(v)}`;
};

const fmtYears = (n, t) => {
  if (n == null || Number.isNaN(Number(n))) return '-';
  const years = Number(n);
  return `${years.toFixed(1)} ${years === 1 ? t('module4YearUnitSingular') : t('module4YearUnitPlural')}`;
};

const scenarioLabel = (key, t) => {
  if (key === 's1') return t('module4ScenarioS1Name');
  if (key === 's2') return t('module4ScenarioS2Name');
  if (key === 's3_c1') return t('module4Channel1Name');
  if (key === 's3_c2') return t('module4Channel2Name');
  if (key === 's3_c3') return t('module4Channel3Name');
  return key;
};

export default function Module4Investment() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const chartColors = useChartColors();

  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [breeds, setBreeds] = useState([]);
  const [selectedBreedId, setSelectedBreedId] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('s1');
  const [scaleMode, setScaleMode] = useState('herd');
  const [herdCount, setHerdCount] = useState(10);
  const [mainChartType, setMainChartType] = useState('line');
  const [secondaryChartType, setSecondaryChartType] = useState('columns');
  const [proOverrides, setProOverrides] = useState({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/m4/breeds');
        const list = (data.breeds || []).filter((b) => !b.locked);
        setBreeds(list);
        setIsPro(!!data.isPro);
        if (list.length > 0) setSelectedBreedId(list[0].id);
      } catch (error) {
        console.error('Error loading M4 breeds:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isPro) {
      setSelectedScenario('s1');
      setMainChartType('line');
      setSecondaryChartType('columns');
      setProOverrides({});
    }
  }, [isPro]);

  const selectedBreed = useMemo(() => breeds.find((b) => b.id === selectedBreedId) || null, [breeds, selectedBreedId]);
  const herdN = Math.min(10000, Math.max(1, Math.round(Number(herdCount) || 1)));
  const scaleUnits = scaleMode === 'goat' ? 1 : herdN;

  const summary = useMemo(() => {
    if (!selectedBreed) return null;
    const milk = Number(selectedBreed.milk_per_lactation_kg) || 0;
    const y = Number(selectedBreed.cheese_yield_liters_per_kg) || 0;
    return {
      milk,
      cheesePerLactation: y > 0 ? milk / y : 0,
      lifetimeCheese: Number(selectedBreed.lifetime_cheese_kg) || 0,
    };
  }, [selectedBreed]);

  const rankingPreview = useMemo(() => {
    const top = [...breeds]
      .map((b) => ({ id: b.id, name: b.name, kg: Number(b.lifetime_cheese_kg) || 0 }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5);
    const topValue = top[0]?.kg || 0;
    return top.map((item, index) => ({ ...item, rank: index + 1, pct: topValue > 0 ? (item.kg / topValue) * 100 : 0 }));
  }, [breeds]);

  const breedForCalc = useMemo(() => (isPro && selectedBreed ? { ...selectedBreed, ...proOverrides } : null), [isPro, selectedBreed, proOverrides]);
  const result = useMemo(() => (breedForCalc ? computeM4(breedForCalc, { useReferenceScenarios: Object.keys(proOverrides).length === 0 }) : null), [breedForCalc, proOverrides]);
  const selectedKpi = result?.scenarios?.[selectedScenario] || null;

  const calculator = useMemo(() => {
    if (!isPro || !result || !selectedKpi) return null;
    const cap = result.cap * scaleUnits;
    const net = selectedKpi.result * scaleUnits;
    const generated = cap + net;
    const annualGenerated = generated / HORIZON;
    const breakEvenYear = annualGenerated > 0 ? cap / annualGenerated : null;
    const recovered = breakEvenYear != null && breakEvenYear <= HORIZON;
    const curve = Array.from({ length: HORIZON + 1 }, (_, year) => {
      const valueGenerated = annualGenerated * year;
      const accumulatedFlow = valueGenerated - cap;
      return {
        year,
        cap,
        valueGenerated,
        accumulatedFlow,
        positiveGain: Math.max(0, accumulatedFlow),
      };
    });
    return { cap, generated, net, payback: selectedKpi.payback, breakEvenYear, recovered, curve };
  }, [isPro, result, selectedKpi, scaleUnits]);

  const profile = useMemo(() => {
    if (!isPro || !result || !breedForCalc) return null;
    const key = result.bestScenarioKey || 's1';
    const best = result.scenarios[key];
    const breakdown = scenarioRevenueBreakdown(breedForCalc, key);
    const milk = (breakdown.milk || 0) * scaleUnits;
    const cheese = (breakdown.cheese || 0) * scaleUnits;
    const daughters = (breakdown.daughters || 0) * scaleUnits;
    const total = milk + cheese + daughters;
    const bars = [
      { key: 'milk', label: t('module4ProfileMilk'), value: milk, pct: total > 0 ? (milk / total) * 100 : 0, className: 'm4-profile-bar--milk' },
      { key: 'cheese', label: t('module4ProfileCheese'), value: cheese, pct: total > 0 ? (cheese / total) * 100 : 0, className: 'm4-profile-bar--cheese' },
      { key: 'daughters', label: t('module4ProfileDaughters'), value: daughters, pct: total > 0 ? (daughters / total) * 100 : 0, className: 'm4-profile-bar--daughters' },
    ];
    const primary = [...bars].sort((a, b) => b.value - a.value)[0];
    return { key, generated: (result.cap + best.result) * scaleUnits, payback: best.payback, bars, primary };
  }, [isPro, result, breedForCalc, scaleUnits, t]);

  const handleOverrideChange = useCallback((field, value) => {
    setProOverrides((prev) => {
      const next = { ...prev };
      if (value === '' || value == null) {
        delete next[field];
        return next;
      }
      const n = Number(value);
      if (Number.isFinite(n)) next[field] = n;
      return next;
    });
  }, []);

  if (loading) return <div className="container"><p>{t('loading')}</p></div>;
  if (!selectedBreed) return <div className="container"><p>{t('noDataToShow')}</p></div>;

  const complementaryColumns = calculator
    ? [
        { name: t('module4CardCap'), value: calculator.cap, color: 'var(--m4-color-cap)' },
        { name: t('module4CardGenerated'), value: calculator.generated, color: 'var(--m4-color-generated)' },
        { name: t('module4CardNet'), value: calculator.net, color: calculator.net >= 0 ? 'var(--m4-color-gain)' : 'var(--m4-color-cap)' },
      ]
    : [];
  const pieData = calculator
    ? [
        { name: t('module4CardCap'), value: Math.max(calculator.cap, 0), color: 'var(--m4-color-cap)' },
        { name: t('module4CardGenerated'), value: Math.max(calculator.generated, 0), color: 'var(--m4-color-generated)' },
      ]
    : [];

  return (
    <div className="container module-compact m4-root m4-predictive-module">
      <nav className="m4-subnav" aria-label="M4">
        <span className="m4-subnav-link m4-subnav-link--active">{t('module4NavInvestment')}</span>
        <Link to="/module4/queso" className="m4-subnav-link">{t('module4NavCheeseAnalysis')}</Link>
      </nav>

      <header className="m4-module-header">
        <div className="m4-hero-band">
          <h1 className="m4-title m4-hero-title">{t('module4InvestmentHeroTitle')}</h1>
          <p className="m4-hero-subtitle">{t('module4InvestmentHeroSubtitle')}</p>
          <p className="m4-hero-description">{t('module4PredictiveLead')}</p>
        </div>
        <div className="m4-explanation-banner m4-explanation-banner--info">
          <p className="m4-explanation-main">{t('module4InvestmentBannerIntro')}</p>
          <p className="m4-explanation-cap"><strong className="m4-cap-term">CAP:</strong> {t('module4CapDefinition')}</p>
        </div>
        <div className="m4-pedagogy-block m4-pedagogy--info"><p className="m4-pedagogy-block-text">{t('module4GlobalAverageDisclaimer')}</p></div>
      </header>

      {!isPro ? (
        <>
          <section className="card m4-free-summary-card">
            <h2 className="m4-section-title">{t('module4BreedSummaryTitle')}</h2>
            <p className="m4-section-subtitle">{t('module4FreeSummaryHint')}</p>
            <label className="m4-scale-field">
              {t('breed')}
              <select className="m4-breed-select" value={selectedBreedId || ''} onChange={(e) => setSelectedBreedId(Number(e.target.value))}>
                {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            {summary && (
              <div className="m4-quick-grid m4-quick-grid--free">
                <div className="m4-quick-item"><span className="m4-quick-label">{t('module4ProductionPerLactation')}</span><span className="m4-quick-value">{fmt(summary.milk, 2)} kg</span></div>
                <div className="m4-quick-item"><span className="m4-quick-label">{t('module4CheesePerLactation')}</span><span className="m4-quick-value">{fmt(summary.cheesePerLactation, 2)} kg</span></div>
                <div className="m4-quick-item"><span className="m4-quick-label">{t('module4LifetimeCheeseKg')}</span><span className="m4-quick-value">{fmt(summary.lifetimeCheese, 2)} kg</span></div>
              </div>
            )}
          </section>

          <section className="card m4-m4b-preview-card">
            <h2 className="m4-section-title">{t('module4M4bPreviewTitle')}</h2>
            <p className="m4-section-subtitle">{t('module4M4bPreviewHint')}</p>
            <div className="m4-m4b-mini-list">
              {rankingPreview.map((row) => (
                <div key={row.id} className="m4-m4b-mini-row">
                  <div className="m4-m4b-mini-head"><span className="m4-m4b-mini-rank">#{row.rank}</span><span className="m4-m4b-mini-name">{row.name}</span><strong>{fmt(row.kg, 2)} kg</strong></div>
                  <div className="m4-m4b-mini-track"><div className="m4-m4b-mini-fill" style={{ width: `${row.pct}%` }} /></div>
                </div>
              ))}
            </div>
            <Link to="/module4/queso" className="m4-btn-primary m4-btn-link">{t('module4NavCheeseAnalysis')}</Link>
          </section>

          <section className="card m4-pro-preview-card">
            <h2 className="m4-section-title">{t('module4PreviewTitle')} <span className="m4-pro-badge m4-pro-badge-inline">PRO</span></h2>
            <p className="m4-section-subtitle">{t('module4PreviewSubtitle')}</p>
            <div className="m4-pro-preview-shell">
              <div className="m4-pro-preview-blur">
                <div className="m4-invest-metrics-grid">
                  <article className="m4-invest-metric-card m4-invest-metric--cap"><span>{t('module4CardCap')}</span><strong>{t('module4PreviewLockedValue')}</strong></article>
                  <article className="m4-invest-metric-card m4-invest-metric--generated"><span>{t('module4CardGenerated')}</span><strong>{t('module4PreviewLockedValue')}</strong></article>
                  <article className="m4-invest-metric-card m4-invest-metric--net"><span>{t('module4CardNet')}</span><strong>{t('module4PreviewLockedValue')}</strong></article>
                  <article className="m4-invest-metric-card m4-invest-metric--payback"><span>{t('module4CardPayback')}</span><strong>{t('module4PreviewLockedYears')}</strong></article>
                </div>
                <div className="m4-pro-chart-skeleton" />
              </div>
              <div className="m4-pro-preview-overlay"><span className="m4-pro-badge">PRO</span><p>{t('module4PreviewOverlayMessage')}</p></div>
            </div>
          </section>

          <section className="card m4-free-conversion-card">
            <h3>{t('module4FreeConversionHeadline')}</h3>
            <p className="m4-free-conversion-main">{t('module4FreeConversionMain')}</p>
            <p className="m4-free-conversion-sub">{t('module4FreeConversionSub')}</p>
            <button type="button" className="m4-btn-primary" onClick={() => navigate('/profile')}>{t('module4UnlockInvestmentAnalysis')}</button>
          </section>
        </>
      ) : (
        <>
          <section className="card m4-investment-calculator">
            <h2 className="m4-section-title">{t('module4InvestmentCalculatorTitle')} <span className="m4-pro-badge m4-pro-badge-inline">PRO</span></h2>
            <div className="m4-scale-grid m4-scale-grid--advanced">
              <label className="m4-scale-field">{t('breed')}
                <select className="m4-breed-select" value={selectedBreedId || ''} onChange={(e) => { setSelectedBreedId(Number(e.target.value)); setProOverrides({}); }}>
                  {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="m4-scale-field">{t('module4ScaleScenario')}
                <select className="m4-breed-select" value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)}>
                  {SCENARIO_KEYS.map((k) => <option key={k} value={k}>{scenarioLabel(k, t)}</option>)}
                </select>
              </label>
              <label className="m4-scale-field">{t('module4ScaleHerdCount')}
                <input type="number" min={1} max={10000} className="m4-input" value={herdN} onChange={(e) => setHerdCount(e.target.value)} />
              </label>
              <label className="m4-scale-field">{t('module4ChartModeTitle')}
                <select className="m4-breed-select" value={scaleMode} onChange={(e) => setScaleMode(e.target.value)}>
                  <option value="goat">{t('module4ChartModeGoat')}</option>
                  <option value="herd">{t('module4ChartModeHerd')}</option>
                </select>
              </label>
              <label className="m4-scale-field">{t('module4MainChartTypeLabel')}
                <select className="m4-breed-select" value={mainChartType} onChange={(e) => setMainChartType(e.target.value)}>
                  <option value="line">{t('module4MainChartTypeLine')}</option>
                  <option value="area">{t('module4MainChartTypeArea')}</option>
                  <option value="bars">{t('module4MainChartTypeBars')}</option>
                </select>
              </label>
              <label className="m4-scale-field">{t('module4SecondaryChartTypeLabel')}
                <select className="m4-breed-select" value={secondaryChartType} onChange={(e) => setSecondaryChartType(e.target.value)}>
                  <option value="columns">{t('module4SecondaryChartTypeColumns')}</option>
                  <option value="pie">{t('module4SecondaryChartTypePie')}</option>
                </select>
              </label>
            </div>

            <div className="m4-pedagogy-block m4-pedagogy--warning"><p className="m4-pedagogy-block-text">{t('module4ReplacementMortalityNote')}</p></div>

            {calculator && (
              <>
                <div className="m4-invest-metrics-grid">
                  <article className="m4-invest-metric-card m4-invest-metric--cap"><span>{t('module4CardCap')}</span><strong>{fmtMoney(calculator.cap, 2)}</strong></article>
                  <article className="m4-invest-metric-card m4-invest-metric--generated"><span>{t('module4CardGenerated')}</span><strong>{fmtMoney(calculator.generated, 2)}</strong></article>
                  <article className="m4-invest-metric-card m4-invest-metric--net"><span>{t('module4CardNet')}</span><strong>{fmtMoney(calculator.net, 2)}</strong></article>
                  <article className="m4-invest-metric-card m4-invest-metric--payback"><span>{t('module4CardPayback')}</span><strong>{fmtYears(calculator.payback, t)}</strong></article>
                </div>

                <div className="m4-invest-chart-wrap">
                  <h3 className="m4-section-subtitle m4-invest-chart-title">{t('module4InvestmentVsGeneratedChartTitle')} <span className="m4-pro-badge m4-pro-badge-inline">PRO</span></h3>
                  <div className="m4-chart-legend m4-chart-legend--functional">
                    <span className="m4-legend-cap">{t('module4LegendCap')}</span>
                    <span className="m4-legend-generated">{t('module4LegendGenerated')}</span>
                    <span className="m4-legend-gain">{t('module4LegendGain')}</span>
                    <span className="m4-legend-breakeven">{t('module4LegendBreakEven')}</span>
                  </div>
                  {mainChartType === 'area' && (
                    <ResponsiveContainer width="100%" height={340}>
                      <AreaChart data={calculator.curve}><CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} /><XAxis dataKey="year" /><YAxis tickFormatter={compactMoney} /><Tooltip formatter={(v) => fmtMoney(v, 2)} />
                        {calculator.recovered && <ReferenceArea x1={calculator.breakEvenYear} x2={HORIZON} fill="var(--m4-color-gain)" fillOpacity={0.1} />}
                        <ReferenceLine y={calculator.cap} stroke="var(--m4-color-cap)" strokeDasharray="5 5" />
                        <Area dataKey="valueGenerated" stroke="var(--m4-color-generated)" fill="var(--m4-color-generated)" fillOpacity={0.12} />
                        <Area dataKey="positiveGain" stroke="var(--m4-color-gain)" fill="var(--m4-color-gain)" fillOpacity={0.18} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                  {mainChartType === 'bars' && (
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={calculator.curve.filter((p) => p.year > 0)}><CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} /><XAxis dataKey="year" /><YAxis tickFormatter={compactMoney} /><Tooltip formatter={(v) => fmtMoney(v, 2)} />
                        <ReferenceLine y={calculator.cap} stroke="var(--m4-color-cap)" strokeDasharray="5 5" />
                        <Bar dataKey="valueGenerated" fill="var(--m4-color-generated)" /><Bar dataKey="accumulatedFlow" fill="var(--m4-color-gain)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {mainChartType === 'line' && (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={calculator.curve}><CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} /><XAxis dataKey="year" /><YAxis tickFormatter={compactMoney} /><Tooltip formatter={(v) => fmtMoney(v, 2)} />
                        {calculator.recovered && <ReferenceArea x1={calculator.breakEvenYear} x2={HORIZON} fill="var(--m4-color-gain)" fillOpacity={0.1} />}
                        <ReferenceLine y={calculator.cap} stroke="var(--m4-color-cap)" strokeDasharray="5 5" />
                        <Line dataKey="valueGenerated" stroke="var(--m4-color-generated)" strokeWidth={3} dot={{ r: 4 }} />
                        <Line dataKey="accumulatedFlow" stroke="var(--m4-color-gain)" strokeWidth={2.5} dot={{ r: 3 }} />
                        {calculator.recovered && <ReferenceDot x={calculator.breakEvenYear} y={calculator.cap} r={6} fill="var(--m4-color-payback)" />}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="m4-recovery-message m4-recovery-message--advanced">
                  {calculator.recovered
                    ? <><p>{t('module4ChartPedagogyRecovered', { year: calculator.breakEvenYear.toFixed(1) })}</p><p>{t('module4ChartPedagogyRecoveredLine2')}</p></>
                    : <><p>{t('module4ChartPedagogyNotRecovered')}</p><p>{t('module4ChartPedagogyNotRecoveredLine2')}</p></>}
                </div>

                <section className="m4-complementary-chart-card">
                  <h3 className="m4-section-title">{t('module4ComplementaryChartTitle')}</h3>
                  <p className="m4-section-subtitle">{t('module4ComplementaryChartHint')}</p>
                  {secondaryChartType === 'columns' ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={complementaryColumns}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                        <XAxis dataKey="name" /><YAxis tickFormatter={compactMoney} /><Tooltip formatter={(v) => fmtMoney(v, 2)} />
                        <Bar dataKey="value">{complementaryColumns.map((c) => <Cell key={c.name} fill={c.color} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={86} innerRadius={44}>{pieData.map((p) => <Cell key={p.name} fill={p.color} />)}</Pie><Tooltip formatter={(v) => fmtMoney(v, 2)} /><Legend /></PieChart>
                    </ResponsiveContainer>
                  )}
                </section>
              </>
            )}
          </section>

          <section className="card m4-profile-card">
            <h2 className="m4-section-title">{t('module4EconomicProfileTitle')}</h2>
            {profile && (
              <>
                <div className="m4-profile-kpi-row m4-profile-kpi-row--strong">
                  <div className="m4-profile-kpi"><span>{t('module4BestScenarioLabel')}</span><strong>{scenarioLabel(profile.key, t)}</strong></div>
                  <div className="m4-profile-kpi"><span>{t('module4CardPayback')}</span><strong>{fmtYears(profile.payback, t)}</strong></div>
                  <div className="m4-profile-kpi"><span>{t('module4CardGenerated')}</span><strong>{fmtMoney(profile.generated, 2)}</strong></div>
                </div>
                <div className="m4-profile-bars m4-profile-bars--strong">
                  {profile.bars.map((bar) => (
                    <div key={bar.key} className="m4-profile-bar-row">
                      <div className="m4-profile-bar-label"><span>{bar.label}</span><strong>{fmtMoney(bar.value, 2)} ({bar.pct.toFixed(1)}%)</strong></div>
                      <div className="m4-profile-bar-track"><div className={`m4-profile-bar-fill ${bar.className}`} style={{ width: `${bar.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
                <p className="m4-profile-insight">{t('module4ProfileInsight', { source: profile.primary?.label || t('module4ProfileMilk') })}</p>
              </>
            )}
          </section>

          <section className="card m4-pro-overrides">
            <h3 className="m4-section-title">{t('module4ProOverridesTitle')} <span className="m4-pro-badge m4-pro-badge-inline">PRO</span></h3>
            <p className="m4-section-subtitle">{t('module4ProOverridesSubtitle')}</p>
            <div className="m4-override-grid">
              {OVERRIDE_FIELDS.map(({ key, labelKey }) => (
                <label key={key} className="m4-override-field">
                  {t(labelKey)}
                  <input type="number" step="any" className="m4-input" value={proOverrides[key] ?? selectedBreed[key] ?? ''} onChange={(e) => handleOverrideChange(key, e.target.value)} />
                </label>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
