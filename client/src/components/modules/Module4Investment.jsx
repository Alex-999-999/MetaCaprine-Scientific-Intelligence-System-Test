import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import { useChartColors } from '../../hooks/useDarkMode';
import { computeM4 } from '../../utils/m4Calculations';
import '../../styles/Module4.css';

const SCENARIO_KEYS = ['s1', 's2', 's3_c1', 's3_c2', 's3_c3'];

const fmt = (n, d = 0) =>
  n == null ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtPct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

const fmtYears = (n) => (n == null ? '—' : `${n.toFixed(1)} años`);

function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="m4-help-tip" onClick={() => setOpen(!open)} title={text}>
      <span className="m4-help-icon">ℹ️</span>
      {open && <span className="m4-help-bubble">{text}</span>}
    </span>
  );
}

function PedagogicHint({ icon, text }) {
  return (
    <p className="m4-pedagogic-hint">
      {icon && <span className="m4-hint-icon">{icon}</span>}
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
    return <PedagogicHint icon="⚠️" text="Este modelo no recupera la inversión dentro del horizonte productivo." />;
  }
  if (payback < 2) {
    return <PedagogicHint icon="⚡" text="Recuperación acelerada. Este modelo convierte producción en liquidez con rapidez." />;
  }
  if (payback < 4) {
    return <PedagogicHint icon="📈" text="Recuperación saludable. El modelo es rentable y estructuralmente sólido." />;
  }
  if (payback < 6) {
    return <PedagogicHint icon="⏳" text="Recuperación lenta. Hay rentabilidad, pero el diseño del negocio puede mejorar." />;
  }
  return <PedagogicHint icon="⚠️" text="Recuperación débil. Este escenario exige rediseño estratégico." />;
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

export default function Module4Investment({ user }) {
  const { t } = useI18n();
  const chartColors = useChartColors();

  const [breeds, setBreeds] = useState([]);
  const [selectedBreedId, setSelectedBreedId] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState('s1');
  const [cheeseRanking, setCheeseRanking] = useState([]);
  const [rankingTotal, setRankingTotal] = useState(0);

  useEffect(() => {
    loadBreeds();
    loadCheeseRanking();
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

  const loadCheeseRanking = async () => {
    try {
      const { data } = await api.get('/m4/ranking/cheese');
      setCheeseRanking(data.ranking || []);
      setRankingTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading cheese ranking:', err);
    }
  };

  const breed = useMemo(
    () => breeds.find((b) => b.id === selectedBreedId) || null,
    [breeds, selectedBreedId],
  );

  const result = useMemo(() => (breed && !breed.locked ? computeM4(breed) : null), [breed]);

  const activeKpi = result?.scenarios?.[activeScenario] || null;

  const scenarioLabels = {
    s1: 'Solo Leche',
    s2: 'Leche + Hijas',
    s3_c1: 'Queso + Hijas C1',
    s3_c2: 'Queso + Hijas C2',
    s3_c3: 'Queso + Hijas C3',
  };

  if (loading) {
    return <div className="container"><p>{t('loading')}</p></div>;
  }

  return (
    <div className="container module-compact m4-root">

      {/* ─── 1. Header ───────────────────────────────────────────────── */}
      <header className="m4-header">
        <h1 className="m4-title">La Cabra como Inversión</h1>
        <p className="m4-subtitle">Convierte biología en rentabilidad</p>
        <PedagogicHint text="Este módulo te ayuda a entender cuánto valor económico puede generar una raza y cómo aprovecharla mejor según el sistema." />
      </header>

      {/* ─── 2. Selector de raza ─────────────────────────────────────── */}
      <div className="card m4-selector-card">
        <label className="m4-selector-label" htmlFor="m4-breed-select">Selecciona una raza</label>
        <select
          id="m4-breed-select"
          className="m4-breed-select"
          value={selectedBreedId || ''}
          onChange={(e) => {
            setSelectedBreedId(Number(e.target.value));
            setActiveScenario('s1');
          }}
        >
          {breeds.map((b) => (
            <option key={b.id} value={b.id} disabled={b.locked}>
              {b.name}{b.locked ? ' 🔒' : ''}
            </option>
          ))}
        </select>
        <PedagogicHint text="Selecciona una raza para ver su perfil económico. El objetivo no es comparar por emoción, sino entender dónde expresa mejor su valor." />
      </div>

      {breed && !breed.locked && result && (
        <>
          {/* ─── 3. Calculadora Básica Dopamínica ──────────────────── */}
          <div className="card m4-quick-calc">
            <h2 className="m4-section-title">💰 Estimación rápida — {breed.name}</h2>
            <div className="m4-quick-grid">
              <div className="m4-quick-item">
                <span className="m4-quick-label">Producción por lactancia</span>
                <span className="m4-quick-value">{fmt(breed.milk_per_lactation_kg)} kg</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">Queso vitalicio</span>
                <span className="m4-quick-value">{fmt(breed.lifetime_cheese_kg, 2)} kg</span>
              </div>
              <div className="m4-quick-item">
                <span className="m4-quick-label">Ganancia estimada (mejor esc.)</span>
                <span className="m4-quick-value m4-value-positive">${fmt(result.bestScenarioValue, 2)}</span>
              </div>
            </div>
            <PedagogicHint text="Esta es una lectura rápida para despertar interés. El análisis completo considera costos reales, escenarios y velocidad de recuperación." />
          </div>

          {/* ─── 4. KPI Cards ────────────────────────────────────────── */}
          <div className="m4-kpi-row">
            <div className="m4-kpi-card">
              <div className="m4-kpi-label">CAP <HelpTip text="CAP = costo real de poner a producir esta cabra." /></div>
              <div className="m4-kpi-value">${fmt(result.cap, 2)}</div>
            </div>
            <ProGate isPro={isPro} teaser="ROI disponible en PRO">
              <div className="m4-kpi-card">
                <div className="m4-kpi-label">ROI <HelpTip text="Muestra cuánto dinero genera esta raza en relación con lo invertido." /></div>
                <div className="m4-kpi-value">{fmtPct(activeKpi?.roi)}</div>
              </div>
            </ProGate>
            <ProGate isPro={isPro} teaser="ROI anual en PRO">
              <div className="m4-kpi-card">
                <div className="m4-kpi-label">ROI Anual <HelpTip text="Es el rendimiento promedio por año durante la vida económica analizada." /></div>
                <div className="m4-kpi-value">{fmtPct(activeKpi?.annualROI)}</div>
              </div>
            </ProGate>
            <div className="m4-kpi-card">
              <div className="m4-kpi-label">Payback <HelpTip text="Indica en cuántos años recuperas tu inversión." /></div>
              <div className="m4-kpi-value">{fmtYears(activeKpi?.payback)}</div>
            </div>
          </div>
          <PedagogicHint text="Este es uno de los indicadores más importantes para entender el riesgo." />

          {/* ─── 5. Panel CAP ────────────────────────────────────────── */}
          <div className="card m4-cap-panel">
            <h2 className="m4-section-title">📊 Costo Real del Activo (CAP)</h2>
            <div className="m4-cap-breakdown">
              <div className="m4-cap-row"><span>Adquisición + logística</span><span>${fmt(breed.acquisition_logistics_cost, 2)}</span></div>
              <div className="m4-cap-row"><span>Costo de levante</span><span>${fmt(breed.raising_cost, 2)}</span></div>
              <div className="m4-cap-row"><span>Reposición</span><span>{fmtPct(breed.replacement_pct)}</span></div>
              <div className="m4-cap-row"><span>Mortalidad</span><span>{fmtPct(breed.mortality_pct)}</span></div>
              <div className="m4-cap-row m4-cap-total"><span>CAP total (motor)</span><span>${fmt(result.cap, 2)}</span></div>
              {breed.cap_reference != null && Number(breed.cap_reference) > 0 && (
                <div className="m4-cap-row m4-cap-ref">
                  <span>CAP tabla maestra (referencia)</span>
                  <span>${fmt(breed.cap_reference, 2)}</span>
                </div>
              )}
            </div>
            <PedagogicHint text="No es solo el precio de compra. Incluye levante, mortalidad y reposición." />
            <p className="m4-micro-quote">"No estás evaluando una cabra. Estás evaluando un activo."</p>
          </div>

          {/* ─── 6. Tabs de Escenarios ───────────────────────────────── */}
          <div className="card m4-scenarios-card">
            <h2 className="m4-section-title">🎯 Escenarios de Monetización</h2>
            <PedagogicHint text="Cada escenario representa una forma distinta de monetizar la raza. No todas las razas expresan su valor en el mismo modelo." />
            <div className="m4-scenario-tabs">
              {SCENARIO_KEYS.map((key) => {
                const isLocked = !isPro && key !== 's1';
                return (
                  <button
                    key={key}
                    className={`m4-scenario-tab ${activeScenario === key ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && setActiveScenario(key)}
                    disabled={isLocked}
                  >
                    {scenarioLabels[key]}
                    {isLocked && ' 🔒'}
                  </button>
                );
              })}
            </div>

            {/* ─── 7. KPI dinámicos del escenario ─────────────────── */}
            {activeKpi && (
              <div className="m4-scenario-kpis">
                <div className="m4-scenario-kpi">
                  <span className="m4-scenario-kpi-label">Resultado neto</span>
                  <span className={`m4-scenario-kpi-value ${activeKpi.result >= 0 ? 'm4-value-positive' : 'm4-value-negative'}`}>
                    ${fmt(activeKpi.result, 2)}
                  </span>
                </div>
                <ProGate isPro={isPro} teaser="Detalle en PRO">
                  <div className="m4-scenario-kpi">
                    <span className="m4-scenario-kpi-label">ROI</span>
                    <span className="m4-scenario-kpi-value">{fmtPct(activeKpi.roi)}</span>
                  </div>
                </ProGate>
                <ProGate isPro={isPro} teaser="Detalle en PRO">
                  <div className="m4-scenario-kpi">
                    <span className="m4-scenario-kpi-label">ROI Anual</span>
                    <span className="m4-scenario-kpi-value">{fmtPct(activeKpi.annualROI)}</span>
                  </div>
                </ProGate>
                <div className="m4-scenario-kpi">
                  <span className="m4-scenario-kpi-label">Payback</span>
                  <span className="m4-scenario-kpi-value">{fmtYears(activeKpi.payback)}</span>
                </div>
              </div>
            )}
            <PedagogicHint text="Estos resultados cambian según el modelo elegido. La misma raza puede verse muy distinta si vendes leche o transformas en queso." />
          </div>

          {/* ─── 8. Gráfico Principal — Curva de Recuperación ───── */}
          <div className="card m4-chart-card">
            <h2 className="m4-section-title">📈 Curva de Recuperación de Inversión</h2>
            <PedagogicHint text="La zona roja es dinero no recuperado. La zona verde es valor generado." />
            {activeKpi && (
              <ProGate isPro={isPro || activeScenario === 's1'} teaser="Gráfico interactivo completo en PRO">
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={activeKpi.recoveryCurve} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="m4AreaPositive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.margin} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={chartColors.margin} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="m4AreaNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.costs} stopOpacity={0.05} />
                        <stop offset="95%" stopColor={chartColors.costs} stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis
                      dataKey="year"
                      tickFormatter={(y) => `Año ${y}`}
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
                      formatter={(value) => [`$${fmt(value, 2)}`, 'Valor acumulado']}
                      labelFormatter={(y) => `Año ${y}`}
                      contentStyle={{
                        backgroundColor: chartColors.tooltip.bg,
                        border: `1px solid ${chartColors.tooltip.border}`,
                        borderRadius: '12px',
                        boxShadow: chartColors.tooltip.shadow,
                        padding: '12px 16px',
                      }}
                    />
                    <ReferenceLine y={0} stroke={chartColors.axis.tick} strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartColors.primary}
                      strokeWidth={3}
                      fill="url(#m4AreaPositive)"
                      dot={{ r: 5, fill: chartColors.primary }}
                      activeDot={{ r: 7 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ProGate>
            )}
          </div>

          {/* ─── 9. Insight dinámico ─────────────────────────────── */}
          <div className="card m4-insight-card">
            <InsightText payback={activeKpi?.payback} />
            <p className="m4-micro-quote">"El gráfico te muestra cuándo dejas de perder dinero y comienzas a generar valor."</p>
          </div>

          {/* ─── 10. Ranking de Queso ────────────────────────────── */}
          <div className="card m4-cheese-ranking-card">
            <h2 className="m4-section-title">🧀 Ranking de Rendimiento Quesero</h2>
            <p className="m4-section-subtitle">Referencia comparativa del potencial de queso por raza durante su vida productiva.</p>
            <PedagogicHint text="Este ranking muestra cuánto queso puede producir una raza en su vida productiva. No define por sí solo cuál es la mejor decisión económica." />

            {/* Top 3 */}
            <div className="m4-cheese-podium">
              {cheeseRanking.slice(0, 3).map((r, i) => (
                <div key={r.id} className={`m4-cheese-podium-card rank-${i + 1}`}>
                  <span className="m4-cheese-medal">{['🥇', '🥈', '🥉'][i]}</span>
                  <span className="m4-cheese-name">{r.name}</span>
                  <span className="m4-cheese-kg">{fmt(r.lifetime_cheese_kg, 2)} kg</span>
                  <div className="m4-cheese-bar">
                    <div
                      className="m4-cheese-bar-fill"
                      style={{ width: `${(Number(r.lifetime_cheese_kg) / Number(cheeseRanking[0]?.lifetime_cheese_kg || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining (pro) */}
            {isPro ? (
              <div className="m4-cheese-list">
                {cheeseRanking.slice(3).map((r, i) => (
                  <div key={r.id} className="m4-cheese-list-row">
                    <span className="m4-cheese-rank">#{i + 4}</span>
                    <span className="m4-cheese-name">{r.name}</span>
                    <span className="m4-cheese-kg">{fmt(r.lifetime_cheese_kg, 2)} kg</span>
                    <div className="m4-cheese-bar">
                      <div
                        className="m4-cheese-bar-fill"
                        style={{ width: `${(Number(r.lifetime_cheese_kg) / Number(cheeseRanking[0]?.lifetime_cheese_kg || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="m4-cheese-pro-teaser">
                <p>+{rankingTotal - 3} razas más disponibles en PRO</p>
              </div>
            )}
          </div>

          {/* ─── 11. Perfil Económico por Raza ───────────────────── */}
          <div className="card m4-profile-card">
            <h2 className="m4-section-title">📊 Perfil Económico — {breed.name}</h2>
            <p className="m4-section-subtitle">Evaluación individual del potencial económico de esta raza dentro del sistema.</p>
            <PedagogicHint text="Aquí no se busca decir cuál raza es &quot;mejor&quot;, sino mostrar cómo esta raza puede generar valor cuando se usa correctamente." />

            {/* KPI row */}
            <div className="m4-profile-kpi-row">
              <div className="m4-profile-kpi"><span>Raza</span><strong>{breed.name}</strong></div>
              <div className="m4-profile-kpi"><span>Valor máximo</span><strong>${fmt(result.bestScenarioValue, 2)}</strong></div>
              <div className="m4-profile-kpi"><span>Mejor escenario</span><strong>{scenarioLabels[result.bestScenarioKey]}</strong></div>
              <div className="m4-profile-kpi">
                <span>Payback</span>
                <strong>{fmtYears(result.scenarios[result.bestScenarioKey]?.payback)}</strong>
              </div>
            </div>
            <PedagogicHint text="Estos indicadores resumen cómo esta raza expresa su potencial económico dentro del modelo analizado." />

            {/* Strengths */}
            <div className="m4-profile-section">
              <h3>💪 Fortalezas económicas</h3>
              <ul className="m4-profile-list m4-strengths">
                {getBreedStrengths(breed, result).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            {/* Limitations (PRO) */}
            <ProGate isPro={isPro} teaser="Consideraciones del sistema en PRO">
              <div className="m4-profile-section">
                <h3>⚠️ Consideraciones del sistema</h3>
                <ul className="m4-profile-list m4-limitations">
                  {getBreedLimitations(breed, result).map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            </ProGate>

            {/* Recommendation (PRO) */}
            <ProGate isPro={isPro} teaser="Recomendación estratégica en PRO">
              <div className="m4-profile-section">
                <h3>🎯 Cómo aprovechar esta raza</h3>
                <p className="m4-profile-recommendation">{getBreedRecommendation(breed, result)}</p>
              </div>
            </ProGate>

            <p className="m4-profile-closing">"Cada raza tiene un potencial económico distinto. La clave es saber cómo aprovecharlo."</p>
          </div>

          {/* ─── 12. CTA PRO ─────────────────────────────────────── */}
          {!isPro && (
            <div className="card m4-cta-card">
              <span className="m4-pro-badge">PRO</span>
              <h3>Desbloquea el análisis completo</h3>
              <p>La lectura rápida orienta. El análisis completo te muestra el potencial real del sistema.</p>
              <p className="m4-micro-quote">"Producir no es lo mismo que ganar."</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
