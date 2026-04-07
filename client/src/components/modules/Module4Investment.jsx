import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import { useChartColors } from '../../hooks/useDarkMode';
import { computeM4, MILK_KG_PER_LITER } from '../../utils/m4Calculations';
import { getBreedImage } from '../../utils/breedImages';
import ModernIcon from '../icons/ModernIcon';
import '../../styles/Module4.css';

const SCENARIO_KEYS = ['s1', 's2', 's3_c1', 's3_c2', 's3_c3'];
const HORIZON = 5;

const fmt = (n, d = 0) =>
  n == null ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtPct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

const fmtYears = (n) => (n == null ? '—' : `${n.toFixed(1)} años`);

function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="m4-help-tip" onClick={() => setOpen(!open)} title={text}>
      <ModernIcon name="infoCircle" size={14} className="m4-help-icon" />
      {open && <span className="m4-help-bubble">{text}</span>}
    </span>
  );
}

function PedagogicHint({ icon, text, variant = 'info' }) {
  return (
    <p className={`m4-pedagogic-hint m4-pedagogic-hint--${variant}`}>
      {icon && (
        <span className="m4-hint-icon">
          <ModernIcon name={icon} size={16} />
        </span>
      )}
      <span>{text}</span>
    </p>
  );
}

function ProGate({ children, isPro, teaser }) {
  if (isPro) return children;
  return (
    <div className="m4-pro-gate">
      <div className="m4-pro-gate-blur">{children}</div>
      <div className="m4-pro-gate-overlay">
        <span className="m4-pro-badge">PRO</span>
        <p>{teaser || 'Disponible en el plan PRO'}</p>
      </div>
    </div>
  );
}

function InsightText({ payback }) {
  if (payback === null) {
    return <PedagogicHint icon="warning" variant="negative" text="Este modelo no recupera la inversión dentro del horizonte productivo." />;
  }
  if (payback < 2) {
    return <PedagogicHint icon="rocket" variant="positive" text="Recuperación acelerada. Este modelo convierte producción en liquidez con rapidez." />;
  }
  if (payback < 4) {
    return <PedagogicHint icon="chartBar" variant="positive" text="Recuperación saludable. El modelo es rentable y estructuralmente sólido." />;
  }
  if (payback < 6) {
    return <PedagogicHint icon="hourglass" variant="warning" text="Recuperación lenta. Hay rentabilidad, pero el diseño del negocio puede mejorar." />;
  }
  return <PedagogicHint icon="warning" variant="negative" text="Recuperación débil. Este escenario exige rediseño estratégico." />;
}

function scenarioTabLabel(key, t) {
  if (key === 's1') return t('module4ScenarioS1Name');
  if (key === 's2') return t('module4ScenarioS2Name');
  if (key === 's3_c1') return t('module4Channel1Name');
  if (key === 's3_c2') return t('module4Channel2Name');
  if (key === 's3_c3') return t('module4Channel3Name');
  return key;
}

function scenarioTabSubtitle(key, t) {
  if (key === 's3_c1') return t('module4Channel1Line');
  if (key === 's3_c2') return t('module4Channel2Line');
  if (key === 's3_c3') return t('module4Channel3Line');
  return '';
}

function getBreedStrengths(breed, result) {
  const strengths = [];
  if (Number(breed.lifetime_cheese_kg) > 500) strengths.push('Alta capacidad de generar valor mediante transformación quesera.');
  if (result.scenarios[result.bestScenarioKey]?.payback != null && result.scenarios[result.bestScenarioKey].payback < 3)
    strengths.push('Buena velocidad de recuperación de inversión.');
  if (Number(breed.fat_pct) > 4) strengths.push('Alto contenido de grasa, ideal para quesos premium.');
  if (Number(breed.avg_lifetime_lactations) >= 5) strengths.push('Buena longevidad productiva.');
  if (Number(breed.lifetime_milk_kg) > 4000) strengths.push('Buen volumen de producción vitalicia.');
  if (strengths.length === 0) strengths.push('Potencial dentro de sistemas adaptados a su escala de producción.');
  return strengths;
}

function getBreedLimitations(breed, result) {
  const limitations = [];
  if (Number(breed.acquisition_logistics_cost) + Number(breed.raising_cost) > 400)
    limitations.push('Exige mayor inversión inicial.');
  if (result.bestScenarioKey?.startsWith('s3'))
    limitations.push('Requiere transformación para maximizar valor.');
  if (Number(breed.lifetime_milk_kg) < 1000)
    limitations.push('Volumen de producción limitado comparado con razas especializadas.');
  if (Number(breed.mortality_pct) > 0.10)
    limitations.push('Mayor riesgo por mortalidad en el sistema.');
  if (limitations.length === 0)
    limitations.push('Sin limitaciones significativas dentro del modelo evaluado.');
  return limitations;
}

function getBreedRecommendation(breed, result) {
  const best = result.bestScenarioKey;
  if (best === 's1') return 'Esta raza expresa bien su valor en venta directa de leche. Adecuada para sistemas de alto volumen con comercialización eficiente.';
  if (best === 's2') return 'La combinación de leche y venta de hijas ofrece el mejor equilibrio para esta raza. Buen modelo para operaciones diversificadas.';
  if (best?.startsWith('s3')) return 'Esta raza funciona mejor en sistemas orientados a queso con captura de valor por transformación. No expresa su máximo potencial en venta directa de leche sin estrategia.';
  return 'Evalúe distintos escenarios para determinar el mejor modelo de negocio con esta raza.';
}

const OVERRIDE_FIELDS = [
  { key: 'lifetime_milk_kg', label: 'Leche vitalicia (kg)' },
  { key: 'lifetime_cheese_kg', label: 'Queso vitalicio (kg)' },
  { key: 'cheese_yield_liters_per_kg', label: 'Rend. quesero (L/kg)' },
  { key: 'cap_reference', label: 'CAP tabla maestra ($)' },
  { key: 'acquisition_logistics_cost', label: 'Adquisición + logística' },
  { key: 'raising_cost', label: 'Levante' },
  { key: 'mortality_pct', label: 'Mortalidad (0–1)' },
  { key: 'replacement_pct', label: 'Reposición (0–1)' },
  { key: 'raw_milk_margin_per_liter', label: 'Margen leche ($/L)' },
  { key: 'cheese_margin_c1', label: 'Margen queso canal 1' },
  { key: 'cheese_margin_c2', label: 'Margen queso canal 2' },
  { key: 'cheese_margin_c3', label: 'Margen queso canal 3' },
  { key: 'daughters_per_life', label: 'Hijas / vida' },
  { key: 'female_ratio', label: 'Ratio hembras' },
  { key: 'female_value', label: 'Valor hija' },
];

export default function Module4Investment() {
  const { t } = useI18n();
  const chartColors = useChartColors();

  const [breeds, setBreeds] = useState([]);
  const [selectedBreedId, setSelectedBreedId] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState('s1');
  const [scaleScenario, setScaleScenario] = useState('s1');
  const [herdCount, setHerdCount] = useState(10);
  const [chartMode, setChartMode] = useState('goat');
  const [proOverrides, setProOverrides] = useState({});

  useEffect(() => {
    loadBreeds();
  }, []);

  const loadBreeds = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/m4/breeds');
      setBreeds(data.breeds || []);
      setIsPro(data.isPro);
      if (data.breeds?.length > 0 && !selectedBreedId) {
        setSelectedBreedId(data.breeds[0].id);
      }
    } catch (err) {
      console.error('Error loading M4 breeds:', err);
    } finally {
      setLoading(false);
    }
  };

  const breed = useMemo(
    () => breeds.find((b) => b.id === selectedBreedId) || null,
    [breeds, selectedBreedId],
  );

  const breedForCalc = useMemo(() => {
    if (!breed || breed.locked) return null;
    return { ...breed, ...proOverrides };
  }, [breed, proOverrides]);

  const result = useMemo(() => (breedForCalc ? computeM4(breedForCalc) : null), [breedForCalc]);

  const activeKpi = result?.scenarios?.[activeScenario] || null;
  const scaleKpi = result?.scenarios?.[scaleScenario] || null;

  const imgSrc = breed && !breed.locked ? getBreedImage(breed.name, null) : null;

  const herdN = Math.min(10000, Math.max(1, Math.round(Number(herdCount) || 1)));

  const scaleMetrics = useMemo(() => {
    if (!result || !scaleKpi) return null;
    const perNet = scaleKpi.result;
    const cap = result.cap;
    const totalNet = perNet * herdN;
    const totalCap = cap * herdN;
    const annual = (perNet / HORIZON) * herdN;
    const roi = totalCap > 0 ? totalNet / totalCap : null;
    const payback = scaleKpi.payback;
    return { totalNet, totalCap, annual, roi, payback };
  }, [result, scaleKpi, herdN]);

  const chartCurveData = useMemo(() => {
    if (!activeKpi || !result) return [];
    const n = chartMode === 'herd' ? herdN : 1;
    const cap = result.cap * n;
    const annualFlow = (activeKpi.result / HORIZON) * n;
    return Array.from({ length: HORIZON + 1 }, (_, year) => ({
      year,
      value: -cap + annualFlow * year,
      pos: Math.max(0, -cap + annualFlow * year),
      neg: Math.min(0, -cap + annualFlow * year),
    }));
  }, [activeKpi, result, chartMode, herdN]);

  const breakEvenYear = useMemo(() => {
    const p = chartCurveData.find((x) => x.value >= 0);
    return p != null ? p.year : null;
  }, [chartCurveData]);

  const handleOverrideChange = useCallback((key, raw) => {
    setProOverrides((prev) => {
      const next = { ...prev };
      if (raw === '' || raw == null) {
        delete next[key];
        return next;
      }
      const n = Number(raw);
      if (Number.isFinite(n)) next[key] = n;
      return next;
    });
  }, []);

  const recalculatePro = async () => {
    if (!breed || !isPro) return;
    try {
      const { data } = await api.post('/m4/calculate', {
        breed_id: breed.id,
        overrides: proOverrides,
      });
      if (data?.result) {
        /* Server truth — merge numeric outputs into local display by keeping overrides */
        console.info('M4 server result OK', data.result);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="container"><p>{t('loading')}</p></div>;
  }

  return (
    <div className="container module-compact m4-root">
      <div className="m4-mandatory-banner" role="note">
        <ModernIcon name="infoCircle" size={18} className="m4-mandatory-icon" />
        <p>{t('module4MandatoryDisclaimer')}</p>
      </div>

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
          <p className="input-hint m4-explanation-hint">{t('module4InvestmentPedagogyHint')}</p>
        </div>
      </header>

      <div className="card m4-selector-card">
        <label className="m4-selector-label" htmlFor="m4-breed-select">{t('breed')}</label>
        <select
          id="m4-breed-select"
          className="m4-breed-select"
          value={selectedBreedId || ''}
          onChange={(e) => {
            setSelectedBreedId(Number(e.target.value));
            setActiveScenario('s1');
            setScaleScenario('s1');
            setProOverrides({});
          }}
        >
          {breeds.map((b) => (
            <option key={b.id} value={b.id} disabled={b.locked}>
              {b.name}{b.locked ? ' (PRO)' : ''}
            </option>
          ))}
        </select>
        <PedagogicHint text="Selecciona una raza para ver su perfil económico. El objetivo no es comparar por emoción, sino entender dónde expresa mejor su valor." />
      </div>

      {breed && !breed.locked && result && (
        <>
          {imgSrc && (
            <div className="m4-breed-image-wrap">
              <img
                src={imgSrc}
                alt=""
                className="m4-breed-profile-img m4-breed-profile-img--face-left"
              />
            </div>
          )}

          <div className="card m4-quick-calc m4-layer-explore">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="scale" size={18} className="m4-title-icon" />
              {t('module4LayerQuickTitle')}
            </h2>
            <div className="m4-quick-grid">
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4ProductionPerLactation')}</span>
                <span className="m4-quick-value">{fmt(breed.milk_per_lactation_kg)} kg</span>
                <span className="m4-quick-sub muted">{t('module4MilkKgPerLiterNote', { density: MILK_KG_PER_LITER })}</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4LifetimeCheeseKg')}</span>
                <span className="m4-quick-value">{fmt(breed.lifetime_cheese_kg, 2)} kg</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">{t('module4QuickMeanLabel')}</span>
                <span className={`m4-quick-value ${result.meanScenarioValue >= 0 ? 'm4-value-positive' : 'm4-value-negative'}`}>
                  ${fmt(result.meanScenarioValue, 2)}
                </span>
                <span className="m4-quick-sub muted">{t('module4QuickMeanSub')}</span>
              </div>
            </div>
            <p className="m4-mandatory-inline">{t('module4QuickEstimateDisclaimer')}</p>
          </div>

          <div className="card m4-scale-card m4-layer-explore">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="chartBar" size={18} className="m4-title-icon" />
              {t('module4ScaleTitle')}
            </h2>
            <div className="m4-scale-grid">
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
                {t('module4ScaleScenario')}
                <select className="m4-breed-select" value={scaleScenario} onChange={(e) => setScaleScenario(e.target.value)}>
                  {SCENARIO_KEYS.map((k) => (
                    <option key={k} value={k}>{scenarioTabLabel(k, t)}</option>
                  ))}
                </select>
              </label>
            </div>
            {scaleMetrics && (
              <div className="m4-scale-results">
                <div><span className="muted">{t('module4ScaleAnnualFlow')}</span> <strong>${fmt(scaleMetrics.annual, 2)}</strong></div>
                <div><span className="muted">{t('module4ScaleTotalNet')}</span> <strong>${fmt(scaleMetrics.totalNet, 2)}</strong></div>
                <div><span className="muted">{t('module4ScaleRoi')}</span> <strong>{fmtPct(scaleMetrics.roi)}</strong></div>
                <div><span className="muted">{t('module4ScalePayback')}</span> <strong>{fmtYears(scaleMetrics.payback)}</strong></div>
                <div><span className="muted">{t('module4ScaleHerdInvestment')}</span> <strong>${fmt(scaleMetrics.totalCap, 2)}</strong></div>
              </div>
            )}
          </div>

          <div className="m4-pedagogy-block m4-pedagogy--amber">
            <p className="m4-pedagogy-block-text">{t('module4PedagogyBeforeScenarios')}</p>
          </div>

          <div className="card m4-cap-panel m4-layer-structured">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="chartBar" size={18} className="m4-title-icon" />
              {t('module4CapPanelTitle')}
            </h2>
            <div className="m4-cap-breakdown">
              <div className="m4-cap-row"><span>Adquisición + logística</span><span>${fmt(breedForCalc.acquisition_logistics_cost, 2)}</span></div>
              <div className="m4-cap-row"><span>Costo de levante</span><span>${fmt(breedForCalc.raising_cost, 2)}</span></div>
              <div className="m4-cap-row"><span>Reposición</span><span>{fmtPct(breedForCalc.replacement_pct)}</span></div>
              <div className="m4-cap-row"><span>Mortalidad</span><span>{fmtPct(breedForCalc.mortality_pct)}</span></div>
              <div className="m4-cap-row m4-cap-total">
                <span>{t('module4CapAppliedLabel')}</span>
                <span>${fmt(result.cap, 2)}</span>
              </div>
              {result.capComputed != null && Math.abs(result.capComputed - result.cap) > 0.005 && (
                <div className="m4-cap-row m4-cap-ref">
                  <span>{t('module4CapComputedLabel')}</span>
                  <span>${fmt(result.capComputed, 2)}</span>
                </div>
              )}
            </div>
            <PedagogicHint text="No es solo el precio de compra. Incluye levante, mortalidad y reposición." />
          </div>

          {isPro && (
            <div className="card m4-pro-overrides m4-layer-structured">
              <h2 className="m4-section-title">{t('module4ProOverridesTitle')}</h2>
              <div className="m4-override-grid">
                {OVERRIDE_FIELDS.map(({ key, label }) => (
                  <label key={key} className="m4-override-field">
                    {label}
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
              <button type="button" className="m4-btn-primary" onClick={recalculatePro}>
                {t('module4ProRecalculate')}
              </button>
            </div>
          )}

          <div className="card m4-scenarios-card m4-layer-structured">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="scale" size={18} className="m4-title-icon" />
              {t('module4ScenariosDetailedTitle')}
            </h2>
            <div className="m4-scenario-tabs m4-scenario-tabs--wrap">
              {SCENARIO_KEYS.map((key) => {
                const isLocked = !isPro && key !== 's1';
                const sub = scenarioTabSubtitle(key, t);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`m4-scenario-tab ${activeScenario === key ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && setActiveScenario(key)}
                    disabled={isLocked}
                    title={sub || undefined}
                  >
                    <span className="m4-scenario-tab-title">{scenarioTabLabel(key, t)}</span>
                    {sub && <span className="m4-scenario-tab-sub">{sub}</span>}
                    {isLocked && ' (PRO)'}
                  </button>
                );
              })}
            </div>

            <div className="m4-pedagogy-block m4-pedagogy--info m4-inline-pedagogy">
              <p>{t('module4PedagogyBeforeResults')}</p>
            </div>

            {activeKpi && (
              <div className="m4-scenario-kpis">
                <div className="m4-scenario-kpi">
                  <span className="m4-scenario-kpi-label">
                    Resultado neto
                    <HelpTip text={t('module4PedagogyBeforeResults')} />
                  </span>
                  <span className={`m4-scenario-kpi-value ${activeKpi.result >= 0 ? 'm4-value-positive' : 'm4-value-negative'}`}>
                    ${fmt(activeKpi.result, 2)}
                  </span>
                </div>
                <ProGate isPro={isPro} teaser="Detalle en PRO">
                  <div className="m4-scenario-kpi">
                    <span className="m4-scenario-kpi-label">
                      ROI
                      <HelpTip text={t('module4RoiDefinitionShort')} />
                    </span>
                    <span className="m4-scenario-kpi-value">{fmtPct(activeKpi.roi)}</span>
                  </div>
                </ProGate>
                <ProGate isPro={isPro} teaser="Detalle en PRO">
                  <div className="m4-scenario-kpi">
                    <span className="m4-scenario-kpi-label">
                      ROI Anual
                      <HelpTip text={t('module4AnnualRoiDefinitionShort')} />
                    </span>
                    <span className="m4-scenario-kpi-value">{fmtPct(activeKpi.annualROI)}</span>
                  </div>
                </ProGate>
                <div className="m4-scenario-kpi">
                  <span className="m4-scenario-kpi-label">
                    Payback
                    <HelpTip text={t('module4PaybackDefinitionShort')} />
                  </span>
                  <span className="m4-scenario-kpi-value">{fmtYears(activeKpi.payback)}</span>
                </div>
                <div className="m4-scenario-kpi">
                  <span className="m4-scenario-kpi-label">
                    {t('module4CheeseYieldLPerKg')}
                    <HelpTip text={t('module4CheeseYieldDefinitionShort')} />
                  </span>
                  <span className="m4-scenario-kpi-value">{fmt(Number(breedForCalc.cheese_yield_liters_per_kg) || 0, 2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="card m4-chart-card m4-layer-structured">
            <div className="m4-chart-toolbar">
              <h2 className="m4-section-title m4-title-with-icon">
                <ModernIcon name="chartBar" size={18} className="m4-title-icon" />
                {t('module4RecoveryChartTitle')}
              </h2>
              <div className="m4-chart-mode-toggle">
                <button type="button" className={chartMode === 'goat' ? 'active' : ''} onClick={() => setChartMode('goat')}>{t('module4ChartModeGoat')}</button>
                <button type="button" className={chartMode === 'herd' ? 'active' : ''} onClick={() => setChartMode('herd')}>{t('module4ChartModeHerd')}</button>
              </div>
            </div>
            <PedagogicHint variant="info" text={t('module4RecoveryChartHint')} />
            {activeKpi && (
              <ProGate isPro={isPro || activeScenario === 's1'} teaser="Gráfico interactivo completo en PRO">
                <div className="m4-chart-legend m4-chart-legend--functional">
                  <span className="m4-legend-cap">CAP {t('module4ChartCapLabel')}: ${fmt(chartMode === 'herd' ? result.cap * herdN : result.cap, 2)}</span>
                  {breakEvenYear != null && (
                    <span className="m4-legend-breakeven">{t('module4ChartBreakeven')}: {t('module4Year')} {breakEvenYear}</span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={chartCurveData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="m4AreaPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--m4-color-positive)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--m4-color-positive)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="m4AreaNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--m4-color-negative)" stopOpacity={0.05} />
                        <stop offset="95%" stopColor="var(--m4-color-negative)" stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="year" tickFormatter={(y) => `${t('module4Year')} ${y}`} stroke={chartColors.axis.tick} tick={{ fill: chartColors.text.secondary, fontSize: 12 }} />
                    <YAxis
                      stroke={chartColors.axis.tick}
                      tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'pos' || name === 'neg') return [null, null];
                        return [`$${fmt(value, 2)}`, t('module4CumulativeNet')];
                      }}
                      labelFormatter={(y) => `${t('module4Year')} ${y}`}
                      contentStyle={{
                        backgroundColor: chartColors.tooltip.bg,
                        border: `1px solid ${chartColors.tooltip.border}`,
                        borderRadius: '12px',
                        padding: '12px 16px',
                      }}
                    />
                    <ReferenceLine
                      y={chartMode === 'herd' ? -result.cap * herdN : -result.cap}
                      stroke="var(--m4-color-info)"
                      strokeDasharray="4 4"
                      label={{ value: 'CAP', position: 'insideTopRight', fill: chartColors.text.secondary, fontSize: 10 }}
                    />
                    <ReferenceLine y={0} stroke={chartColors.axis.tick} strokeWidth={2} strokeDasharray="6 3" label={{ value: t('module4ChartBreakevenLine'), position: 'right', fill: chartColors.text.secondary, fontSize: 11 }} />
                    {breakEvenYear != null && breakEvenYear <= HORIZON && (
                      <ReferenceLine x={breakEvenYear} stroke="var(--m4-color-warning)" strokeDasharray="3 3" />
                    )}
                    <Area type="monotone" dataKey="neg" stroke="none" fill="url(#m4AreaNeg)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="pos" stroke="none" fill="url(#m4AreaPos)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="value" stroke="var(--m4-color-info)" strokeWidth={3} fill="none" dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ProGate>
            )}
          </div>

          <div className="card m4-insight-card">
            <InsightText payback={activeKpi?.payback} />
            <p className="m4-micro-quote">&quot;El gráfico muestra la recuperación acumulada frente al CAP.&quot;</p>
          </div>

          <div className="card m4-profile-card m4-layer-structured">
            <h2 className="m4-section-title m4-title-with-icon">
              <ModernIcon name="fileText" size={18} className="m4-title-icon" />
              {t('module4EconomicProfileTitle')} — {breed.name}
            </h2>
            <p className="m4-section-subtitle">{t('module4EconomicProfileSubtitle')}</p>
            <div className="m4-profile-kpi-row">
              <div className="m4-profile-kpi"><span>{t('breed')}</span><strong>{breed.name}</strong></div>
              <div className="m4-profile-kpi"><span>{t('module4BestScenarioValue')}</span><strong>${fmt(result.bestScenarioValue, 2)}</strong></div>
              <div className="m4-profile-kpi"><span>{t('module4BestScenarioLabel')}</span><strong>{scenarioTabLabel(result.bestScenarioKey, t)}</strong></div>
              <div className="m4-profile-kpi"><span>Payback ({t('module4BestScenarioLabel')})</span><strong>{fmtYears(result.scenarios[result.bestScenarioKey]?.payback)}</strong></div>
            </div>
            <div className="m4-profile-kpi-row m4-profile-kpi-row--secondary">
              <div className="m4-profile-kpi m4-profile-kpi--block">
                <span>{t('module4MeanScenarioLabel')}</span>
                <strong>${fmt(result.meanScenarioValue, 2)}</strong>
                <p className="m4-profile-kpi-note muted">{t('module4MeanScenarioExplainer')}</p>
              </div>
            </div>

            <div className="m4-profile-section">
              <h3 className="m4-title-with-icon"><ModernIcon name="checkCircle" size={16} className="m4-title-icon" />Fortalezas económicas</h3>
              <ul className="m4-profile-list m4-strengths">
                {getBreedStrengths(breed, result).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <ProGate isPro={isPro} teaser="Consideraciones del sistema en PRO">
              <div className="m4-profile-section">
                <h3 className="m4-title-with-icon"><ModernIcon name="warning" size={16} className="m4-title-icon" />Consideraciones del sistema</h3>
                <ul className="m4-profile-list m4-limitations">
                  {getBreedLimitations(breed, result).map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            </ProGate>

            <ProGate isPro={isPro} teaser="Recomendación estratégica en PRO">
              <div className="m4-profile-section">
                <h3 className="m4-title-with-icon"><ModernIcon name="rocket" size={16} className="m4-title-icon" />Cómo aprovechar esta raza</h3>
                <p className="m4-profile-recommendation">{getBreedRecommendation(breed, result)}</p>
              </div>
            </ProGate>
          </div>

          <div className="card m4-m4b-cta">
            <h3 className="m4-section-title">{t('module4CheeseAnalysisTitle')}</h3>
            <p>{t('module4M4bLinkExplainer')}</p>
            <Link to="/module4/queso" className="m4-btn-primary m4-btn-link">
              {t('module4NavCheeseAnalysis')} →
            </Link>
          </div>

          {!isPro && (
            <div className="card m4-cta-card">
              <span className="m4-pro-badge">PRO</span>
              <h3>Desbloquea el análisis completo</h3>
              <p>La lectura rápida orienta. El análisis completo te muestra el potencial real del sistema.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
