import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  LabelList,
} from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import { useChartColors } from '../../hooks/useDarkMode';
import {
  computeM4,
  grossLifetimeRevenueForScenario,
  scenarioRevenueBreakdown,
  MILK_KG_PER_LITER,
} from '../../utils/m4Calculations';
import { getBreedImage } from '../../utils/breedImages';
import ModernIcon from '../icons/ModernIcon';
import '../../styles/Module4.css';

const HORIZON = 5;
const SCENARIO_KEYS = ['s1', 's2', 's3_c1', 's3_c2', 's3_c3'];

const fmt = (n, d = 0) =>
  n == null ? '-' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtPct = (n) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

const fmtYears = (n) => (n == null ? '-' : `${n.toFixed(1)} ${n === 1 ? 'año' : 'años'}`);

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

function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="m4-help-tip" onClick={() => setOpen(!open)} title={text}>
      <ModernIcon name="infoCircle" size={14} className="m4-help-icon" />
      {open && <span className="m4-help-bubble">{text}</span>}
    </span>
  );
}

function scenarioLabel(key, t) {
  if (key === 's1') return t('module4ScenarioS1Name');
  if (key === 's2') return t('module4ScenarioS2Name');
  if (key === 's3_c1') return t('module4Channel1Name');
  if (key === 's3_c2') return t('module4Channel2Name');
  if (key === 's3_c3') return t('module4Channel3Name');
  return key;
}

function scenarioShortHint(key, t) {
  if (key === 's1') return t('module4ScenarioS1Hint');
  if (key === 's2') return t('module4ScenarioS2Hint');
  if (key === 's3_c1') return t('module4Channel1Line');
  if (key === 's3_c2') return t('module4Channel2Line');
  if (key === 's3_c3') return t('module4Channel3Line');
  return '';
}

export default function Module4Investment() {
  const { t } = useI18n();
  const chartColors = useChartColors();

  const [breeds, setBreeds] = useState([]);
  const [selectedBreedId, setSelectedBreedId] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState('s1');
  const [herdCount, setHerdCount] = useState(10);
  const [chartMode, setChartMode] = useState('herd');
  const [proOverrides, setProOverrides] = useState({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/m4/breeds');
        setBreeds(data.breeds || []);
        setIsPro(!!data.isPro);
        if (data.breeds?.length) {
          setSelectedBreedId(data.breeds[0].id);
        }
      } catch (error) {
        console.error('Error loading M4 breeds:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const breed = useMemo(
    () => breeds.find((b) => b.id === selectedBreedId) || null,
    [breeds, selectedBreedId],
  );

  useEffect(() => {
    if (!isPro && selectedScenario !== 's1') {
      setSelectedScenario('s1');
    }
  }, [isPro, selectedScenario]);

  const breedForCalc = useMemo(() => {
    if (!breed || breed.locked) return null;
    return { ...breed, ...proOverrides };
  }, [breed, proOverrides]);

  const result = useMemo(() => {
    if (!breedForCalc) return null;
    return computeM4(breedForCalc, { useReferenceScenarios: Object.keys(proOverrides).length === 0 });
  }, [breedForCalc, proOverrides]);

  const herdN = Math.min(10000, Math.max(1, Math.round(Number(herdCount) || 1)));
  const scaleUnits = chartMode === 'goat' ? 1 : herdN;

  const selectedKpi = result?.scenarios?.[selectedScenario] || null;

  const calculator = useMemo(() => {
    if (!result || !selectedKpi || !breedForCalc) return null;

    const cap = result.cap * scaleUnits;
    const net = selectedKpi.result * scaleUnits;
    const generated = cap + net;
    const annualGenerated = generated / HORIZON;
    const annualNet = net / HORIZON;
    const roi = cap > 0 ? net / cap : null;
    const payback = selectedKpi.payback;
    const breakEvenYear = annualGenerated > 0 ? cap / annualGenerated : null;
    const recovered = breakEvenYear != null && breakEvenYear <= HORIZON;

    const curve = Array.from({ length: HORIZON + 1 }, (_, year) => {
      const valueGenerated = annualGenerated * year;
      const flow = valueGenerated - cap;
      return {
        year,
        cap,
        valueGenerated,
        accumulatedFlow: flow,
        valueLabel: year === 0 ? '' : `$${fmt(valueGenerated, 0)}`,
      };
    });

    const grossLifetime = grossLifetimeRevenueForScenario(breedForCalc, selectedScenario) * scaleUnits;

    return {
      cap,
      generated,
      net,
      annualGenerated,
      annualNet,
      roi,
      payback,
      breakEvenYear,
      recovered,
      curve,
      grossLifetime,
    };
  }, [result, selectedKpi, selectedScenario, scaleUnits, breedForCalc]);

  const cheesePerLactationKg = useMemo(() => {
    if (!breedForCalc) return 0;
    const milkPerLact = Number(breedForCalc.milk_per_lactation_kg) || 0;
    const yieldLitersPerKg = Number(breedForCalc.cheese_yield_liters_per_kg) || 0;
    if (yieldLitersPerKg <= 0) return 0;
    return milkPerLact / yieldLitersPerKg;
  }, [breedForCalc]);

  const bestScenarioKey = result?.bestScenarioKey || 's1';
  const breedImage = useMemo(() => (breedForCalc ? getBreedImage(breedForCalc.name, null) : null), [breedForCalc]);

  const profileMetrics = useMemo(() => {
    if (!result || !breedForCalc) return null;
    const best = result.scenarios[bestScenarioKey];
    const generated = result.cap + best.result;
    const breakdown = scenarioRevenueBreakdown(breedForCalc, bestScenarioKey);
    const total = breakdown.total || 0;

    const bars = [
      {
        key: 'milk',
        label: t('module4ProfileMilk'),
        value: breakdown.milk,
        pct: total > 0 ? (breakdown.milk / total) * 100 : 0,
        className: 'm4-profile-bar--milk',
      },
      {
        key: 'cheese',
        label: t('module4ProfileCheese'),
        value: breakdown.cheese,
        pct: total > 0 ? (breakdown.cheese / total) * 100 : 0,
        className: 'm4-profile-bar--cheese',
      },
      {
        key: 'daughters',
        label: t('module4ProfileDaughters'),
        value: breakdown.daughters,
        pct: total > 0 ? (breakdown.daughters / total) * 100 : 0,
        className: 'm4-profile-bar--daughters',
      },
    ];

    return {
      generated,
      payback: best.payback,
      bars,
    };
  }, [result, breedForCalc, bestScenarioKey, t]);

  const handleOverrideChange = useCallback((field, value) => {
    setProOverrides((prev) => {
      const next = { ...prev };
      if (value === '' || value == null) {
        delete next[field];
        return next;
      }
      const n = Number(value);
      if (Number.isFinite(n)) {
        next[field] = n;
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="container">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="container module-compact m4-root">
      <nav className="m4-subnav" aria-label="M4">
        <span className="m4-subnav-link m4-subnav-link--active">{t('module4NavInvestment')}</span>
        <Link to="/module4/queso" className="m4-subnav-link">
          {t('module4NavCheeseAnalysis')}
        </Link>
      </nav>

      <header className="m4-module-header">
        <div className="m4-hero-band">
          <h1 className="m4-title m4-hero-title">{t('module4InvestmentHeroTitle')}</h1>
          <p className="m4-hero-subtitle">{t('module4InvestmentHeroSubtitle')}</p>
          <p className="m4-hero-description">{t('module4InvestmentHeroLead')}</p>
        </div>
        <div className="m4-explanation-banner m4-explanation-banner--info">
          <p className="m4-explanation-main">{t('module4InvestmentBannerIntro')}</p>
          <p className="m4-explanation-cap">
            <strong className="m4-cap-term">
              CAP
              <HelpTip text={t('module4CapTooltip')} />
              :
            </strong>{' '}
            {t('module4CapDefinition')}
          </p>
        </div>
      </header>

      {breed && !breed.locked && result && calculator && (
        <>
          <section className="card m4-investment-calculator">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="chartBar" size={18} className="m4-title-icon" />
              {t('module4InvestmentCalculatorTitle')}
            </h2>

            <div className="m4-scale-grid">
              <label className="m4-scale-field">
                {t('breed')}
                <select
                  className="m4-breed-select"
                  value={selectedBreedId || ''}
                  onChange={(e) => {
                    setSelectedBreedId(Number(e.target.value));
                    setProOverrides({});
                  }}
                >
                  {breeds.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.locked}>
                      {b.name}{b.locked ? ' (PRO)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="m4-scale-field">
                {t('module4ScaleScenario')}
                <select
                  className="m4-breed-select"
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                >
                  {SCENARIO_KEYS.map((key) => {
                    const locked = !isPro && key !== 's1';
                    return (
                      <option key={key} value={key} disabled={locked}>
                        {scenarioLabel(key, t)}{locked ? ' (PRO)' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className="m4-field-helper">{scenarioShortHint(selectedScenario, t)}</span>
              </label>

              <label className="m4-scale-field">
                {t('module4ScaleHerdCount')}
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="m4-input"
                  value={herdN}
                  onChange={(e) => setHerdCount(e.target.value)}
                />
              </label>

              <label className="m4-scale-field">
                {t('module4ChartModeTitle')}
                <select className="m4-breed-select" value={chartMode} onChange={(e) => setChartMode(e.target.value)}>
                  <option value="goat">{t('module4ChartModeGoat')}</option>
                  <option value="herd">{t('module4ChartModeHerd')}</option>
                </select>
              </label>
            </div>

            <div className="m4-pedagogy-block m4-pedagogy--warning">
              <p className="m4-pedagogy-block-text">{t('module4ReplacementMortalityNote')}</p>
            </div>

            <div className="m4-invest-metrics-grid">
              <article className="m4-invest-metric-card">
                <span>{t('module4CardCap')}</span>
                <strong>${fmt(calculator.cap, 2)}</strong>
              </article>
              <article className="m4-invest-metric-card">
                <span>{t('module4CardGenerated')}</span>
                <strong>${fmt(calculator.generated, 2)}</strong>
              </article>
              <article className="m4-invest-metric-card">
                <span>{t('module4CardNet')}</span>
                <strong>${fmt(calculator.net, 2)}</strong>
              </article>
              <article className="m4-invest-metric-card">
                <span>{t('module4CardPayback')}</span>
                <strong>{fmtYears(calculator.payback)}</strong>
              </article>
            </div>

            <div className="m4-invest-chart-wrap">
              <h3 className="m4-section-subtitle m4-invest-chart-title">{t('module4InvestmentVsGeneratedChartTitle')}</h3>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={calculator.curve} margin={{ top: 12, right: 20, left: 20, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="year"
                    tickFormatter={(v) => `${t('module4Year')} ${v}`}
                    stroke={chartColors.axis.tick}
                    tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                  />
                  <YAxis
                    stroke={chartColors.axis.tick}
                    tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => `$${fmt(value, 2)}`}
                    labelFormatter={(label) => `${t('module4Year')} ${label}`}
                  />

                  <ReferenceLine
                    y={calculator.cap}
                    stroke="var(--m4-color-cap)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{ value: t('module4CardCap'), position: 'insideTopRight', fill: chartColors.text.secondary, fontSize: 11 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="valueGenerated"
                    name={t('module4CardGenerated')}
                    stroke="var(--m4-color-generated)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList dataKey="valueLabel" position="top" fontSize={10} fill={chartColors.text.secondary} />
                  </Line>

                  <Line
                    type="monotone"
                    dataKey="accumulatedFlow"
                    name={t('module4CardAccumulatedFlow')}
                    stroke="var(--m4-color-flow)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                  {calculator.breakEvenYear != null && calculator.recovered && (
                    <ReferenceDot
                      x={calculator.breakEvenYear}
                      y={calculator.cap}
                      r={6}
                      fill="var(--m4-color-breakeven)"
                      stroke="var(--m4-color-breakeven)"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="m4-recovery-message">
              {calculator.recovered
                ? t('module4RecoveryMessageRecovered', { year: calculator.breakEvenYear.toFixed(1) })
                : t('module4RecoveryMessageNotRecovered')}
            </p>

            {isPro && (
              <div className="card m4-pro-overrides m4-layer-structured">
                <h3 className="m4-section-title">{t('module4ProOverridesTitle')}</h3>
                <p className="m4-section-subtitle">{t('module4ProOverridesSubtitle')}</p>
                <div className="m4-override-grid">
                  {OVERRIDE_FIELDS.map(({ key, labelKey }) => (
                    <label key={key} className="m4-override-field">
                      {t(labelKey)}
                      <input
                        type="number"
                        step="any"
                        className="m4-input"
                        value={proOverrides[key] ?? breed[key] ?? ''}
                        onChange={(e) => handleOverrideChange(key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card m4-quick-calc m4-layer-explore">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="scale" size={18} className="m4-title-icon" />
              {t('module4BreedSummaryTitle')}
            </h2>
            {breedImage && (
              <div className="m4-breed-image-wrap">
                <img src={breedImage} alt="" className="m4-breed-profile-img m4-breed-profile-img--face-left" />
              </div>
            )}
            <div className="m4-quick-grid">
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4ProductionPerLactation')}</span>
                <span className="m4-quick-value">{fmt(breedForCalc.milk_per_lactation_kg, 2)} kg</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4CheesePerLactation')}</span>
                <span className="m4-quick-value">{fmt(cheesePerLactationKg, 2)} kg</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4LifetimeCheeseKg')}</span>
                <span className="m4-quick-value">{fmt(breedForCalc.lifetime_cheese_kg, 2)} kg</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4QuickMeanLabel')}</span>
                <span className="m4-quick-value">${fmt(result.meanScenarioValue, 2)}</span>
                <span className="m4-quick-sub muted">{t('module4MilkKgPerLiterNote', { density: MILK_KG_PER_LITER })}</span>
              </div>
            </div>
          </section>

          <section className="card m4-profile-card m4-layer-structured">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="fileText" size={18} className="m4-title-icon" />
              {t('module4EconomicProfileTitle')}
            </h2>
            {profileMetrics && (
              <>
                <div className="m4-profile-kpi-row">
                  <div className="m4-profile-kpi">
                    <span>{t('module4BestScenarioLabel')}</span>
                    <strong>{scenarioLabel(bestScenarioKey, t)}</strong>
                  </div>
                  <div className="m4-profile-kpi">
                    <span>{t('module4CardPayback')}</span>
                    <strong>{fmtYears(profileMetrics.payback)}</strong>
                  </div>
                  <div className="m4-profile-kpi">
                    <span>{t('module4CardGenerated')}</span>
                    <strong>${fmt(profileMetrics.generated, 2)}</strong>
                  </div>
                </div>

                <div className="m4-profile-bars">
                  {profileMetrics.bars.map((bar) => (
                    <div key={bar.key} className="m4-profile-bar-row">
                      <div className="m4-profile-bar-label">
                        <span>{bar.label}</span>
                        <strong>${fmt(bar.value, 2)} ({bar.pct.toFixed(1)}%)</strong>
                      </div>
                      <div className="m4-profile-bar-track">
                        <div className={`m4-profile-bar-fill ${bar.className}`} style={{ width: `${bar.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card m4-m4b-cta">
            <h3 className="m4-section-title">{t('module4CheeseAnalysisTitle')}</h3>
            <p>{t('module4M4bLinkExplainer')}</p>
            <Link to="/module4/queso" className="m4-btn-primary m4-btn-link">
              {t('module4NavCheeseAnalysis')}{' ->'}
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
