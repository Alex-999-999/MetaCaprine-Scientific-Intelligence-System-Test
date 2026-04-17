import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import ModernIcon from '../icons/ModernIcon';
import { getBreedImage } from '../../utils/breedImages';
import { m4Fmt as fmt } from '../../utils/m4Format';
import '../../styles/Module4.css';

const TOP4_COLORS = ['#d4a017', '#3b82f6', '#22c55e', '#8b5cf6'];
const NEUTRAL_BAR = '#94a3b8';
const CHEESE_METRIC_VIEWS = ['yield_l_per_kg', 'lifetime_cheese'];

export default function Module4CheeseAnalysis() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [breeds, setBreeds] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [metricView, setMetricView] = useState('lifetime_cheese');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const breedsResponse = await api.get('/m4/breeds');
        const list = (breedsResponse.data.breeds || []).filter((b) => !b.locked);
        const proAccess = !!breedsResponse.data.isPro;
        setBreeds(list);
        setIsPro(proAccess);

        if (proAccess) {
          const rankingResponse = await api.get('/m4/ranking/cheese');
          setRanking(rankingResponse.data.ranking || []);
        } else {
          setRanking([]);
        }

        if (list.length > 0) {
          setCompareA(list[0].id);
          setCompareB(list.length > 1 ? list[1].id : list[0].id);
        }
      } catch (error) {
        console.error('Error loading M4-B:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byId = useMemo(() => {
    const map = new Map();
    breeds.forEach((b) => map.set(b.id, b));
    return map;
  }, [breeds]);

  const metricMeta = useMemo(() => {
    if (metricView === 'yield_l_per_kg') {
      return {
        label: t('module4MetricYieldLPerKg'),
        unit: 'L/kg',
      };
    }
    return {
      label: t('module4MetricLifetimeCheese'),
      unit: 'kg',
    };
  }, [metricView, t]);

  const metricValue = useMemo(
    () => (item) => {
      if (metricView === 'yield_l_per_kg') {
        return Number(item.cheese_yield_liters_per_kg) || 0;
      }
      return Number(item.lifetime_cheese_kg) || 0;
    },
    [metricView]
  );

  const topMetricValue = useMemo(() => {
    if (!ranking.length) return 0;
    return ranking.reduce((max, item) => Math.max(max, metricValue(item)), 0);
  }, [ranking, metricValue]);

  const topCheese = ranking[0]?.lifetime_cheese_kg || 0;
  const top4 = ranking.slice(0, 4);

  const chartData = useMemo(() => {
    return [...ranking]
      .map((item) => {
        const value = metricValue(item);
        return {
          id: item.id,
          name: item.name,
          shortName: item.name.length > 22 ? `${item.name.slice(0, 22)}...` : item.name,
          value,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        pct: topMetricValue > 0 ? (item.value / topMetricValue) * 100 : 0,
      }));
  }, [ranking, metricValue, topMetricValue]);

  const breedA = compareA != null ? byId.get(compareA) : null;
  const breedB = compareB != null ? byId.get(compareB) : null;

  const comparison = useMemo(() => {
    if (!breedA || !breedB) return null;
    const aKg = Number(breedA.lifetime_cheese_kg) || 0;
    const bKg = Number(breedB.lifetime_cheese_kg) || 0;
    const diff = aKg - bKg;
    const pct = bKg > 0 ? (diff / bKg) * 100 : null;
    return { aKg, bKg, diff, pct };
  }, [breedA, breedB]);

  if (loading) {
    return (
      <div className="container">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="container module-compact m4-root">
        <nav className="m4-subnav" aria-label="M4">
          <Link to="/module4" className="m4-subnav-link">
            {t('module4NavInvestment')}
          </Link>
          <span className="m4-subnav-link m4-subnav-link--active-cheese">{t('module4NavCheeseAnalysis')}</span>
        </nav>

        <header className="m4-module-header">
          <div className="m4-hero-band">
            <h1 className="m4-title m4-hero-title">{t('module4CheeseAnalysisTitle')}</h1>
            <p className="m4-hero-subtitle">{t('module4CheeseAnalysisSubtitle')}</p>
          </div>
        </header>

        <section className="card m4-free-conversion-card">
          <h3>{t('module4CheeseProOnlyTitle')}</h3>
          <p className="m4-free-conversion-main">{t('module4CheeseProOnlyMain')}</p>
          <p className="m4-free-conversion-sub">{t('module4CheeseProOnlySub')}</p>
          <button type="button" className="m4-btn-primary" onClick={() => navigate('/profile')}>
            {t('module4UnlockInvestmentAnalysis')}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="container module-compact m4-root">
      <nav className="m4-subnav" aria-label="M4">
        <Link to="/module4" className="m4-subnav-link">
          {t('module4NavInvestment')}
        </Link>
        <span className="m4-subnav-link m4-subnav-link--active-cheese">{t('module4NavCheeseAnalysis')}</span>
      </nav>

      <header className="m4-module-header">
        <div className="m4-hero-band">
          <h1 className="m4-title m4-hero-title">{t('module4CheeseAnalysisTitle')}</h1>
          <p className="m4-hero-subtitle">{t('module4CheeseAnalysisSubtitle')}</p>
          {!isPro && <p className="m4-hero-description">{t('module4CheeseFreeHint')}</p>}
        </div>
      </header>

      <section className="card m4-cheese-chart-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="chartBar" size={18} className="m4-title-icon" />
          {t('module4CheeseComparativeBarsTitle')}
        </h2>
        <p className="m4-section-subtitle">{t('module4CheeseComparativeBarsHint')}</p>
        <div className="m4-cheese-metric-selector">
          <label className="m4-scale-field">
            {t('module4CheeseMetricSelectorLabel')}
            <select className="m4-breed-select" value={metricView} onChange={(e) => setMetricView(e.target.value)}>
              {CHEESE_METRIC_VIEWS.map((key) => (
                <option key={key} value={key}>
                  {key === 'yield_l_per_kg'
                    ? t('module4MetricYieldLPerKg')
                    : t('module4MetricLifetimeCheese')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="m4-cheese-bars-wrap">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart layout="vertical" data={chartData} barCategoryGap="36%" margin={{ top: 14, right: 28, left: 28, bottom: 14 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${fmt(Number(v), 2)}%`} tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis type="category" dataKey="shortName" width={220} tick={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'pct') return [`${fmt(Number(value), 2)}%`, t('module4CheeseRelativePerformance')];
                  return [`${fmt(value, 2)} ${metricMeta.unit}`, metricMeta.label];
                }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
              />
              <Bar dataKey="pct" name={metricMeta.label} radius={[0, 8, 8, 0]}>
                {chartData.map((entry) => {
                  const color = entry.rank <= 4 ? TOP4_COLORS[entry.rank - 1] : NEUTRAL_BAR;
                  return <Cell key={entry.id} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card m4-compare-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="scale" size={18} className="m4-title-icon" />
          {t('module4CheeseCompareTitle')}
        </h2>
        <p className="m4-section-subtitle">{t('module4CheeseCompareSubtitle')}</p>

        <div className="m4-compare-selects">
          <label className="m4-compare-label">
            {t('module4CompareBreedA')}
            <select className="m4-breed-select" value={compareA ?? ''} onChange={(e) => setCompareA(Number(e.target.value))}>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="m4-compare-label">
            {t('module4CompareBreedB')}
            <select className="m4-breed-select" value={compareB ?? ''} onChange={(e) => setCompareB(Number(e.target.value))}>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {breedA && breedB && comparison && (() => {
          const aMilkLact = Number(breedA.milk_per_lactation_kg) || 0;
          const bMilkLact = Number(breedB.milk_per_lactation_kg) || 0;
          const aYield = Number(breedA.cheese_yield_liters_per_kg) || 0;
          const bYield = Number(breedB.cheese_yield_liters_per_kg) || 0;
          const aCheeseLact = aYield > 0 ? aMilkLact / aYield : 0;
          const bCheeseLact = bYield > 0 ? bMilkLact / bYield : 0;
          return (
            <div className="m4-compare-grid">
              <div className="m4-compare-col">
                <h3 className="m4-compare-title-with-image">
                  {getBreedImage(breedA.name, null) && (
                    <img src={getBreedImage(breedA.name, null)} alt="" className="m4-breed-thumb m4-breed-profile-img--face-left" />
                  )}
                  <span>{breedA.name}</span>
                </h3>
                <ul className="m4-compare-list">
                  <li><span>{t('module4ProductionPerLactationCompare') || t('module4ProductionPerLactation')}</span><strong>{fmt(aMilkLact, 2)} kg</strong></li>
                  <li><span>{t('module4CheesePerLactationCompare') || 'Cheese/lactation'}</span><strong>{fmt(aCheeseLact, 2)} kg</strong></li>
                  <li><span>{t('module4LifetimeCheeseKg')}</span><strong>{fmt(comparison.aKg, 2)} kg</strong></li>
                  <li><span>{t('module4CheeseYieldLPerKg')}</span><strong>{fmt(aYield, 2)}</strong></li>
                </ul>
              </div>

              <div className="m4-compare-col">
                <h3 className="m4-compare-title-with-image">
                  {getBreedImage(breedB.name, null) && (
                    <img src={getBreedImage(breedB.name, null)} alt="" className="m4-breed-thumb m4-breed-profile-img--face-left" />
                  )}
                  <span>{breedB.name}</span>
                </h3>
                <ul className="m4-compare-list">
                  <li><span>{t('module4ProductionPerLactationCompare') || t('module4ProductionPerLactation')}</span><strong>{fmt(bMilkLact, 2)} kg</strong></li>
                  <li><span>{t('module4CheesePerLactationCompare') || 'Cheese/lactation'}</span><strong>{fmt(bCheeseLact, 2)} kg</strong></li>
                  <li><span>{t('module4LifetimeCheeseKg')}</span><strong>{fmt(comparison.bKg, 2)} kg</strong></li>
                  <li><span>{t('module4CheeseYieldLPerKg')}</span><strong>{fmt(bYield, 2)}</strong></li>
                </ul>
              </div>

              <div className="m4-compare-diff-card">
                <span>{t('module4CheeseDifferenceTitle')}</span>
                <strong>{comparison.diff >= 0 ? '+' : ''}{fmt(comparison.diff, 2)} kg</strong>
                <p>{comparison.pct == null ? '-' : `${comparison.pct >= 0 ? '+' : ''}${fmt(comparison.pct, 2)}%`}</p>
              </div>
            </div>
          );
        })()}
      </section>

      <section className="card m4-cheese-top3-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="trophy" size={18} className="m4-title-icon" />
          {t('module4CheeseTop4Title') || t('module4CheeseTop3Title')}
          {isPro && <span className="m4-pro-badge m4-pro-badge-inline">PRO</span>}
        </h2>
        <div className="m4-cheese-top3-grid">
          {top4.map((item, idx) => {
            const yieldL = Number(item.cheese_yield_liters_per_kg) || 0;
            const milkLact = Number(item.milk_per_lactation_kg) || 0;
            const cheeseLact = yieldL > 0 ? milkLact / yieldL : 0;
            return (
              <article key={item.id} className="m4-cheese-top3-item">
                <div className="m4-cheese-top3-rank" style={{ color: TOP4_COLORS[idx] || TOP4_COLORS[3] }}>
                  #{idx + 1}
                </div>
                <div className="m4-cheese-top3-name-cell">
                  {getBreedImage(item.name, null) && (
                    <img src={getBreedImage(item.name, null)} alt="" className="m4-breed-thumb m4-breed-profile-img--face-left" />
                  )}
                  <strong>{item.name}</strong>
                </div>
                <div className="m4-cheese-top3-value">{fmt(item.lifetime_cheese_kg, 2)} kg</div>
                <div className="m4-cheese-top3-detail">{t('module4CheeseYieldLPerKg')}: {fmt(yieldL, 2)}</div>
                <div className="m4-cheese-top3-detail">{t('module4CheesePerLactationLabel') || 'Cheese/lactation'}: {fmt(cheeseLact, 2)} kg</div>
                <div className="m4-cheese-top3-percent">
                  {topCheese > 0 ? `${fmt((Number(item.lifetime_cheese_kg) / Number(topCheese)) * 100, 2)}%` : '0%'}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="m4-back-wrap">
        <Link to="/module4" className="m4-back-link">
          {'<- '}{t('module4BackToInvestment')}
        </Link>
      </div>
    </div>
  );
}
