import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { useI18n } from '../../i18n/I18nContext';
import ModernIcon from '../icons/ModernIcon';
import api from '../../utils/api';

const LEVANTE_TYPES = [
  { key: 'maximized', system: 'Intensivo' },
  { key: 'medium', system: 'Semi-intensivo' },
  { key: 'minimal', system: 'Extensivo' },
];

const DEFAULT_SYSTEM_BASE = {
  Intensivo: {
    peso90: 20,
    diasLevante: 90,
    lecheDia: 1.2,
    // CSV does not expose sustituto_dia explicitly; we mirror milk/day as model default.
    sustitutoDia: 1.2,
    concDia: 0.25,
    henoDia: 0.15,
    precioLeche: 1,
    precioSustituto: 1,
    precioConc: 0.65,
    precioHeno: 0.25,
    costoSanitario: 7,
    factorIntensivo: 1,
    factorSemi: 0.8,
    factorExtensivo: 0.6,
  },
  'Semi-intensivo': {
    peso90: 16,
    diasLevante: 90,
    lecheDia: 0.9,
    sustitutoDia: 0.9,
    concDia: 0.18,
    henoDia: 0.1,
    precioLeche: 1,
    precioSustituto: 1,
    precioConc: 0.65,
    precioHeno: 0.25,
    costoSanitario: 6,
    factorIntensivo: 1,
    factorSemi: 0.8,
    factorExtensivo: 0.6,
  },
  Extensivo: {
    peso90: 12,
    diasLevante: 90,
    lecheDia: 0.6,
    sustitutoDia: 0.6,
    concDia: 0.1,
    henoDia: 0.05,
    precioLeche: 1,
    precioSustituto: 1,
    precioConc: 0.65,
    precioHeno: 0.25,
    costoSanitario: 5,
    factorIntensivo: 1,
    factorSemi: 0.8,
    factorExtensivo: 0.6,
  },
};

const DEFAULT_WEANING_SCENARIOS = {
  45: { diasLeche: 45, diasSustituto: 45, diasConcentrado: 40, diasHeno: 30 },
  60: { diasLeche: 60, diasSustituto: 60, diasConcentrado: 45, diasHeno: 30 },
  70: { diasLeche: 70, diasSustituto: 70, diasConcentrado: 55, diasHeno: 40 },
  80: { diasLeche: 80, diasSustituto: 80, diasConcentrado: 60, diasHeno: 50 },
  90: { diasLeche: 90, diasSustituto: 90, diasConcentrado: 70, diasHeno: 60 },
};

const CHART_COLORS = {
  leche: '#3b82f6',
  sustituto: '#0ea5e9',
  conc: '#f59e0b',
  heno: '#10b981',
  sanitario: '#8b5cf6',
  total: '#2563eb',
  compareA: '#2563eb',
  compareB: '#14b8a6',
  compareC: '#f59e0b',
};

const numericInput = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round2 = (value) => Number((Number.isFinite(value) ? value : 0).toFixed(2));

function buildCalculationSnapshot(levanteType, weaningDays, prices, advanced) {
  return {
    levanteType,
    weaningDays: Number(weaningDays),
    prices: {
      leche: numericInput(prices.leche, 0),
      sustituto: numericInput(prices.sustituto, 0),
      conc: numericInput(prices.conc, 0),
      heno: numericInput(prices.heno, 0),
      sanitario: numericInput(prices.sanitario, 0),
    },
    advanced: {
      pesoObjetivo90: numericInput(advanced.pesoObjetivo90, 0),
      ajusteRaza: numericInput(advanced.ajusteRaza, 1),
      ajusteClima: numericInput(advanced.ajusteClima, 1),
      ajusteAlimento: numericInput(advanced.ajusteAlimento, 1),
    },
  };
}

function Module6KidRaising() {
  const { t, language } = useI18n();

  const [levanteType, setLevanteType] = useState('maximized');
  const [weaningDays, setWeaningDays] = useState(60);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [systemBase, setSystemBase] = useState(DEFAULT_SYSTEM_BASE);
  const [weaningScenarios, setWeaningScenarios] = useState(DEFAULT_WEANING_SCENARIOS);

  const [prices, setPrices] = useState({
    leche: 1,
    sustituto: 1,
    conc: 0.65,
    heno: 0.25,
    sanitario: 7,
  });
  const [advanced, setAdvanced] = useState({
    pesoObjetivo90: 20,
    ajusteRaza: 1,
    ajusteClima: 1,
    ajusteAlimento: 1,
  });
  const [calculationSnapshot, setCalculationSnapshot] = useState(() =>
    buildCalculationSnapshot('maximized', 60, {
      leche: 1,
      sustituto: 1,
      conc: 0.65,
      heno: 0.25,
      sanitario: 7,
    }, {
      pesoObjetivo90: 20,
      ajusteRaza: 1,
      ajusteClima: 1,
      ajusteAlimento: 1,
    }),
  );

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      try {
        const response = await api.get('/modules/module6/config');
        const systems = response?.data?.systems;
        const weaning = response?.data?.weaningScenarios;
        if (!mounted) return;

        if (systems && Object.keys(systems).length > 0) {
          setSystemBase(systems);
        }
        if (weaning && Object.keys(weaning).length > 0) {
          setWeaningScenarios(weaning);
          if (!weaning[String(weaningDays)]) {
            const sortedDays = Object.keys(weaning)
              .map((d) => Number(d))
              .filter((d) => Number.isFinite(d))
              .sort((a, b) => a - b);
            if (sortedDays.length > 0) {
              setWeaningDays(sortedDays[0]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch module6 config:', error);
      }
    };
    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const activeSystem = useMemo(() => {
    const entry = LEVANTE_TYPES.find((item) => item.key === levanteType) || LEVANTE_TYPES[0];
    return systemBase[entry.system];
  }, [levanteType, systemBase]);

  useEffect(() => {
    if (!activeSystem) return;
    setPrices({
      leche: activeSystem.precioLeche,
      sustituto: activeSystem.precioSustituto,
      conc: activeSystem.precioConc,
      heno: activeSystem.precioHeno,
      sanitario: activeSystem.costoSanitario,
    });
    setAdvanced((prev) => ({
      ...prev,
      pesoObjetivo90: activeSystem.peso90,
    }));
  }, [activeSystem]);

  const formatNumber = useCallback((value, digits = 2) => (
    new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number.isFinite(value) ? value : 0)
  ), [language]);

  const formatMoney = useCallback((value, digits = 2) => `US$ ${formatNumber(value, digits)}`, [formatNumber]);
  const compactMoney = useCallback((value) => {
    const abs = Math.abs(value || 0);
    if (abs >= 1000) return `${formatNumber(value / 1000, 1)}k`;
    return formatNumber(value, 0);
  }, [formatNumber]);

  const runModel = useCallback((snapshot) => {
    const levanteMeta = LEVANTE_TYPES.find((item) => item.key === snapshot.levanteType) || LEVANTE_TYPES[0];
    const system = systemBase[levanteMeta.system];
    const destete = weaningScenarios[snapshot.weaningDays] || weaningScenarios[60];

    const basePrices = {
      leche: system.precioLeche,
      sustituto: system.precioSustituto,
      conc: system.precioConc,
      heno: system.precioHeno,
      sanitario: system.costoSanitario,
    };

    const lecheTotal = system.lecheDia * destete.diasLeche;
    const sustitutoTotal = system.sustitutoDia * destete.diasSustituto;
    const concTotal = system.concDia * destete.diasConcentrado;
    const henoTotal = system.henoDia * destete.diasHeno;

    const costoLeche = lecheTotal * snapshot.prices.leche;
    const costoSustituto = sustitutoTotal * snapshot.prices.sustituto;
    const costoConc = concTotal * snapshot.prices.conc;
    const costoHeno = henoTotal * snapshot.prices.heno;
    const costoSanitario = snapshot.prices.sanitario;

    const costoTotal = costoLeche + costoSustituto + costoConc + costoHeno + costoSanitario;
    const costoPorDia = costoTotal / Math.max(1, system.diasLevante);

    const factorSistema = snapshot.levanteType === 'maximized'
      ? system.factorIntensivo
      : snapshot.levanteType === 'medium'
        ? system.factorSemi
        : system.factorExtensivo;
    const pesoFinal = Math.max(
      0.0001,
      snapshot.advanced.pesoObjetivo90 * factorSistema
      * snapshot.advanced.ajusteRaza
      * snapshot.advanced.ajusteClima
      * snapshot.advanced.ajusteAlimento,
    );
    const costoPorKg = costoTotal / pesoFinal;

    const costoDiarioSanitario = costoSanitario / Math.max(1, system.diasLevante);
    const cumulativeCost = [];
    let acumulado = 0;
    for (let day = 1; day <= system.diasLevante; day += 1) {
      const dailyCost = (
        (day <= destete.diasLeche ? system.lecheDia * snapshot.prices.leche : 0)
        + (day <= destete.diasSustituto ? system.sustitutoDia * snapshot.prices.sustituto : 0)
        + (day <= destete.diasConcentrado ? system.concDia * snapshot.prices.conc : 0)
        + (day <= destete.diasHeno ? system.henoDia * snapshot.prices.heno : 0)
        + costoDiarioSanitario
      );
      acumulado += dailyCost;
      cumulativeCost.push({ day, acumulado: round2(acumulado) });
    }

    const costDistribution = [
      { name: t('module6MilkLabel'), value: round2(costoLeche), color: CHART_COLORS.leche },
      { name: t('module6MilkReplacerLabel'), value: round2(costoSustituto), color: CHART_COLORS.sustituto },
      { name: t('module6ConcentrateLabel'), value: round2(costoConc), color: CHART_COLORS.conc },
      { name: t('module6HayLabel'), value: round2(costoHeno), color: CHART_COLORS.heno },
      { name: t('module6HealthLabel'), value: round2(costoSanitario), color: CHART_COLORS.sanitario },
    ];

    const baseSnapshot = buildCalculationSnapshot(
      snapshot.levanteType,
      snapshot.weaningDays,
      basePrices,
      {
        pesoObjetivo90: system.peso90,
        ajusteRaza: 1,
        ajusteClima: 1,
        ajusteAlimento: 1,
      },
    );
    const baseCostoLeche = lecheTotal * baseSnapshot.prices.leche;
    const baseCostoSustituto = sustitutoTotal * baseSnapshot.prices.sustituto;
    const baseCostoConc = concTotal * baseSnapshot.prices.conc;
    const baseCostoHeno = henoTotal * baseSnapshot.prices.heno;
    const baseCostoSanitario = baseSnapshot.prices.sanitario;
    const baseCostoTotal = baseCostoLeche + baseCostoSustituto + baseCostoConc + baseCostoHeno + baseCostoSanitario;
    const basePesoFinal = Math.max(0.0001, system.peso90 * factorSistema);
    const baseCostoPorKg = baseCostoTotal / basePesoFinal;

    const compareScenarios = Object.keys(weaningScenarios).map((key) => {
      const scenarioSnapshot = {
        ...snapshot,
        weaningDays: Number(key),
      };
      const scenarioData = runModelInternal(scenarioSnapshot);
      return {
        destete: Number(key),
        costoTotal: round2(scenarioData.costoTotal),
        costoPorKg: round2(scenarioData.costoPorKg),
        pesoFinal: round2(scenarioData.pesoFinal),
      };
    });

    const narrativeBlocks = buildNarrative({
      t,
      snapshot,
      basePrices,
      costoTotal,
      baseCostoTotal,
      pesoFinal,
      basePesoFinal,
      costoPorKg,
      baseCostoPorKg,
    });

    return {
      system: levanteMeta.system,
      destete,
      consumos: {
        lecheTotal: round2(lecheTotal),
        sustitutoTotal: round2(sustitutoTotal),
        concTotal: round2(concTotal),
        henoTotal: round2(henoTotal),
      },
      costos: {
        leche: round2(costoLeche),
        sustituto: round2(costoSustituto),
        conc: round2(costoConc),
        heno: round2(costoHeno),
        sanitario: round2(costoSanitario),
      },
      indicadores: {
        costoTotal: round2(costoTotal),
        costoPorDia: round2(costoPorDia),
        pesoFinal: round2(pesoFinal),
        costoPorKg: round2(costoPorKg),
      },
      baseline: {
        costoTotal: round2(baseCostoTotal),
        pesoFinal: round2(basePesoFinal),
        costoPorKg: round2(baseCostoPorKg),
      },
      cumulativeCost,
      costDistribution,
      compareScenarios,
      narrativeBlocks,
    };
  }, [systemBase, t, weaningScenarios]);

  const runModelInternal = (snapshot) => {
    const levanteMeta = LEVANTE_TYPES.find((item) => item.key === snapshot.levanteType) || LEVANTE_TYPES[0];
    const system = systemBase[levanteMeta.system];
    const destete = weaningScenarios[snapshot.weaningDays] || weaningScenarios[60];

    const lecheTotal = system.lecheDia * destete.diasLeche;
    const sustitutoTotal = system.sustitutoDia * destete.diasSustituto;
    const concTotal = system.concDia * destete.diasConcentrado;
    const henoTotal = system.henoDia * destete.diasHeno;

    const costoLeche = lecheTotal * snapshot.prices.leche;
    const costoSustituto = sustitutoTotal * snapshot.prices.sustituto;
    const costoConc = concTotal * snapshot.prices.conc;
    const costoHeno = henoTotal * snapshot.prices.heno;
    const costoSanitario = snapshot.prices.sanitario;
    const costoTotal = costoLeche + costoSustituto + costoConc + costoHeno + costoSanitario;

    const factorSistema = snapshot.levanteType === 'maximized'
      ? system.factorIntensivo
      : snapshot.levanteType === 'medium'
        ? system.factorSemi
        : system.factorExtensivo;

    const pesoFinal = Math.max(
      0.0001,
      snapshot.advanced.pesoObjetivo90 * factorSistema
      * snapshot.advanced.ajusteRaza
      * snapshot.advanced.ajusteClima
      * snapshot.advanced.ajusteAlimento,
    );

    return {
      costoTotal,
      pesoFinal,
      costoPorKg: costoTotal / pesoFinal,
    };
  };

  const buildNarrative = ({
    t,
    snapshot,
    basePrices,
    costoTotal,
    baseCostoTotal,
    pesoFinal,
    basePesoFinal,
    costoPorKg,
    baseCostoPorKg,
  }) => {
    const levanteText = snapshot.levanteType === 'maximized'
      ? t('module6NarrativeLevanteMaximized')
      : snapshot.levanteType === 'medium'
        ? t('module6NarrativeLevanteMedium')
        : t('module6NarrativeLevanteMinimal');

    const desteteMap = {
      45: t('module6NarrativeWeaning45'),
      60: t('module6NarrativeWeaning60'),
      70: t('module6NarrativeWeaning70'),
      80: t('module6NarrativeWeaning80'),
      90: t('module6NarrativeWeaning90'),
    };
    const weaningText = desteteMap[snapshot.weaningDays] || t('module6NarrativeWeaning60');

    const costSignals = [];
    if (snapshot.prices.leche > basePrices.leche * 1.1) costSignals.push(t('module6NarrativeMilkPriceHigh'));
    if (snapshot.prices.sustituto > basePrices.sustituto * 1.1) costSignals.push(t('module6NarrativeReplacerPriceHigh'));
    if (snapshot.prices.conc > basePrices.conc * 1.1) costSignals.push(t('module6NarrativeConcPriceHigh'));
    if (snapshot.prices.heno > basePrices.heno * 1.1) costSignals.push(t('module6NarrativeHayPriceHigh'));
    const costNarrative = costSignals.length > 0
      ? costSignals.join(' ')
      : t('module6NarrativeCostStable');

    const resultSignals = [];
    if (costoTotal > baseCostoTotal * 1.15) resultSignals.push(t('module6NarrativeResultCostHigh'));
    if (pesoFinal < basePesoFinal * 0.9) resultSignals.push(t('module6NarrativeResultLowWeight'));
    if (costoPorKg > baseCostoPorKg * 1.1) resultSignals.push(t('module6NarrativeResultCostPerKgHigh'));
    const resultsNarrative = resultSignals.length > 0
      ? resultSignals.join(' ')
      : t('module6NarrativeResultBalanced');

    let recommendation = t('module6NarrativeRecommendationBalanced');
    if (snapshot.levanteType === 'maximized' && pesoFinal >= basePesoFinal) {
      recommendation = t('module6NarrativeRecommendationMaximized');
    }
    if (snapshot.levanteType === 'minimal' && pesoFinal < basePesoFinal) {
      recommendation = t('module6NarrativeRecommendationMinimal');
    }

    return {
      levanteText,
      weaningText,
      costNarrative,
      resultsNarrative,
      recommendation,
    };
  };

  const result = useMemo(() => runModel(calculationSnapshot), [calculationSnapshot, runModel]);

  const handleCalculate = useCallback(() => {
    setCalculationSnapshot(buildCalculationSnapshot(levanteType, weaningDays, prices, advanced));
  }, [advanced, levanteType, prices, weaningDays]);

  const handlePriceChange = useCallback((key, value) => {
    setPrices((prev) => ({
      ...prev,
      [key]: clamp(numericInput(value, prev[key]), 0, 999999),
    }));
  }, []);

  const handleAdvancedChange = useCallback((key, value) => {
    setAdvanced((prev) => {
      const parsed = numericInput(value, prev[key]);
      let finalValue = parsed;
      if (key === 'pesoObjetivo90') finalValue = clamp(parsed, 1, 80);
      if (key === 'ajusteRaza' || key === 'ajusteClima' || key === 'ajusteAlimento') {
        finalValue = clamp(parsed, 0.5, 1.5);
      }
      return { ...prev, [key]: finalValue };
    });
  }, []);

  const scenarioComparisonChartData = useMemo(() => (
    result.compareScenarios.map((item) => ({
      name: `${item.destete}d`,
      totalCost: item.costoTotal,
      costPerKg: item.costoPorKg,
      finalWeight: item.pesoFinal,
    }))
  ), [result.compareScenarios]);

  return (
    <div className="container module-compact module6-root">
      <header className="module6-header">
        <h1>{t('module6Title')}</h1>
        <p className="module6-subtitle">{t('module6Subtitle')}</p>
        <div className="pedagogy-block module6-pedagogy">
          <p className="pedagogy-title">{t('module6PedagogyTitle')}</p>
          <p>{t('module6PedagogyIntro')}</p>
          <ul className="pedagogy-list">
            <li>{t('module6PedagogyBullet1')}</li>
            <li>{t('module6PedagogyBullet2')}</li>
            <li>{t('module6PedagogyBullet3')}</li>
          </ul>
        </div>
      </header>

      <section className="card module6-card">
        <h2>{t('module6InputTitle')}</h2>
        <div className="module6-grid">
          <div className="form-group">
            <label>{t('module6LevanteType')}</label>
            <select value={levanteType} onChange={(e) => setLevanteType(e.target.value)}>
              <option value="maximized">{t('module6LevanteMaximized')}</option>
              <option value="medium">{t('module6LevanteMedium')}</option>
              <option value="minimal">{t('module6LevanteMinimal')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('module6WeaningDays')}</label>
            <select value={weaningDays} onChange={(e) => setWeaningDays(Number(e.target.value))}>
              {Object.keys(weaningScenarios).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="module6-section-title">{t('module6EditablePrices')}</h3>
        <div className="module6-grid">
          <div className="form-group">
            <label>{t('module6MilkPrice')}</label>
            <input type="number" step="0.01" min="0" value={prices.leche} onChange={(e) => handlePriceChange('leche', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('module6MilkReplacerPrice')}</label>
            <input type="number" step="0.01" min="0" value={prices.sustituto} onChange={(e) => handlePriceChange('sustituto', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('module6ConcentratePrice')}</label>
            <input type="number" step="0.01" min="0" value={prices.conc} onChange={(e) => handlePriceChange('conc', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('module6HayPrice')}</label>
            <input type="number" step="0.01" min="0" value={prices.heno} onChange={(e) => handlePriceChange('heno', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('module6HealthCost')}</label>
            <input type="number" step="0.01" min="0" value={prices.sanitario} onChange={(e) => handlePriceChange('sanitario', e.target.value)} />
          </div>
        </div>

        <button type="button" className="btn btn-secondary btn-sm module6-advanced-toggle" onClick={() => setShowAdvanced((prev) => !prev)}>
          <ModernIcon name="chevronDown" size={16} />
          {showAdvanced ? t('module6HideAdvanced') : t('module6ShowAdvanced')}
        </button>

        {showAdvanced && (
          <div className="module6-advanced-box">
            <h3 className="module6-section-title">{t('module6AdvancedParams')}</h3>
            <div className="module6-grid">
              <div className="form-group">
                <label>{t('module6TargetWeight90')}</label>
                <input type="number" step="0.1" min="1" value={advanced.pesoObjetivo90} onChange={(e) => handleAdvancedChange('pesoObjetivo90', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('module6BreedAdjustment')}</label>
                <input type="number" step="0.01" min="0.5" max="1.5" value={advanced.ajusteRaza} onChange={(e) => handleAdvancedChange('ajusteRaza', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('module6ClimateAdjustment')}</label>
                <input type="number" step="0.01" min="0.5" max="1.5" value={advanced.ajusteClima} onChange={(e) => handleAdvancedChange('ajusteClima', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('module6FeedQualityAdjustment')}</label>
                <input type="number" step="0.01" min="0.5" max="1.5" value={advanced.ajusteAlimento} onChange={(e) => handleAdvancedChange('ajusteAlimento', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="module6-action-row">
          <button type="button" className="btn btn-primary" onClick={handleCalculate}>
            {t('calculate')}
          </button>
        </div>
      </section>

      <section className="card module6-card">
        <h2>{t('results')}</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">{t('module6TotalCost')}</div>
            <div className="metric-value">{formatMoney(result.indicadores.costoTotal)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">{t('module6FinalWeight')}</div>
            <div className="metric-value">{formatNumber(result.indicadores.pesoFinal, 2)} kg</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">{t('module6CostPerDay')}</div>
            <div className="metric-value">{formatMoney(result.indicadores.costoPorDia)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">{t('module6CostPerKg')}</div>
            <div className="metric-value">{formatMoney(result.indicadores.costoPorKg)}</div>
          </div>
        </div>
      </section>

      <section className="card module6-card">
        <h2>{t('module6ChartsTitle')}</h2>
        <div className="module6-chart-grid">
          <div className="chart-card">
            <h3 className="chart-section-title">{t('module6ChartAccumulated')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.cumulativeCost}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={compactMoney} />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="acumulado" name={t('module6AccumulatedCostLegend')} stroke={CHART_COLORS.total} dot={false} strokeWidth={2.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h3 className="chart-section-title">{t('module6ChartDistribution')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={result.costDistribution} dataKey="value" nameKey="name" outerRadius={100} innerRadius={50}>
                  {result.costDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card module6-chart-full">
            <h3 className="chart-section-title">{t('module6ChartScenarioComparison')}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={scenarioComparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" tickFormatter={compactMoney} />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => {
                  if (name === t('module6TotalCostLegend') || name === t('module6CostPerKgLegend')) return formatMoney(Number(value));
                  return `${formatNumber(Number(value), 2)} kg`;
                }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="totalCost" name={t('module6TotalCostLegend')} fill={CHART_COLORS.compareA} radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="costPerKg" name={t('module6CostPerKgLegend')} fill={CHART_COLORS.compareB} radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="finalWeight" name={t('module6FinalWeightLegend')} fill={CHART_COLORS.compareC} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card module6-card">
        <h2>{t('module6TablesTitle')}</h2>
        <div className="module6-tables-grid">
          <div>
            <h3 className="chart-section-title">{t('module6TotalConsumptionTable')}</h3>
            <table className="module6-table">
              <thead>
                <tr>
                  <th>{t('module6Item')}</th>
                  <th>{t('module6Amount')}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{t('module6MilkLabel')}</td><td>{formatNumber(result.consumos.lecheTotal, 2)} L</td></tr>
                <tr><td>{t('module6MilkReplacerLabel')}</td><td>{formatNumber(result.consumos.sustitutoTotal, 2)} L</td></tr>
                <tr><td>{t('module6ConcentrateLabel')}</td><td>{formatNumber(result.consumos.concTotal, 2)} kg</td></tr>
                <tr><td>{t('module6HayLabel')}</td><td>{formatNumber(result.consumos.henoTotal, 2)} kg</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="chart-section-title">{t('module6CostsByCategoryTable')}</h3>
            <table className="module6-table">
              <thead>
                <tr>
                  <th>{t('module6Item')}</th>
                  <th>{t('module6Amount')}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{t('module6MilkLabel')}</td><td>{formatMoney(result.costos.leche)}</td></tr>
                <tr><td>{t('module6MilkReplacerLabel')}</td><td>{formatMoney(result.costos.sustituto)}</td></tr>
                <tr><td>{t('module6ConcentrateLabel')}</td><td>{formatMoney(result.costos.conc)}</td></tr>
                <tr><td>{t('module6HayLabel')}</td><td>{formatMoney(result.costos.heno)}</td></tr>
                <tr><td>{t('module6HealthLabel')}</td><td>{formatMoney(result.costos.sanitario)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card module6-card">
        <h2>{t('module6NarrativeTitle')}</h2>
        <div className="module6-narrative">
          <p><strong>{t('module6NarrativeLevanteTitle')}</strong> {result.narrativeBlocks.levanteText}</p>
          <p><strong>{t('module6NarrativeWeaningTitle')}</strong> {result.narrativeBlocks.weaningText}</p>
          <p><strong>{t('module6NarrativeCostsTitle')}</strong> {result.narrativeBlocks.costNarrative}</p>
          <p><strong>{t('module6NarrativeResultsTitle')}</strong> {result.narrativeBlocks.resultsNarrative}</p>
          <p className="module6-recommendation"><strong>{t('module6NarrativeRecommendationTitle')}</strong> {result.narrativeBlocks.recommendation}</p>
        </div>
      </section>
    </div>
  );
}

export default Module6KidRaising;
