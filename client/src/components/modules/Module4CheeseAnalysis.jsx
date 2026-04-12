import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import '../../styles/Module4.css';

const fmt = (n, d = 0) =>
  n == null ? '-' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const TOP3_COLORS = ['#d4a017', '#3b82f6', '#22c55e'];
const NEUTRAL_BAR = '#94a3b8';

export default function Module4CheeseAnalysis() {
  const { t } = useI18n();
  const [breeds, setBreeds] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [breedsResponse, rankingResponse] = await Promise.all([
          api.get('/m4/breeds'),
          api.get('/m4/ranking/cheese'),
        ]);
        const list = (breedsResponse.data.breeds || []).filter((b) => !b.locked);
        setBreeds(list);
        setRanking(rankingResponse.data.ranking || []);
        setIsPro(!!breedsResponse.data.isPro);
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

  const topCheese = ranking[0]?.lifetime_cheese_kg || 0;
  const top3 = ranking.slice(0, 3);

  const chartData = useMemo(() => {
    return ranking.slice(0, 12).map((item, index) => {
      const kg = Number(item.lifetime_cheese_kg) || 0;
      return {
        id: item.id,
        rank: index + 1,
        name: item.name,
        shortName: item.name.length > 22 ? `${item.name.slice(0, 22)}...` : item.name,
        kg,
        pct: topCheese > 0 ? (kg / topCheese) * 100 : 0,
      };
    });
  }, [ranking, topCheese]);

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

  return (
    <div className="container module-compact m4-root">
      <nav className="m4-subnav" aria-label="M4">
        <Link to="/module4" className="m4-subnav-link">
          {t('module4NavInvestment')}
        </Link>
        <span className="m4-subnav-link m4-subnav-link--active">{t('module4NavCheeseAnalysis')}</span>
      </nav>

      <header className="m4-module-header">
        <div className="m4-hero-band">
          <h1 className="m4-title m4-hero-title">{t('module4CheeseAnalysisTitle')}</h1>
          <p className="m4-hero-subtitle">{t('module4CheeseAnalysisSubtitle')}</p>
          {!isPro && <p className="m4-hero-description">{t('module4CheeseFreeHint')}</p>}
        </div>
      </header>

      <section className="card m4-cheese-top3-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="trophy" size={18} className="m4-title-icon" />
          {t('module4CheeseTop3Title')}
          {isPro && <span className="m4-pro-badge m4-pro-badge-inline">PRO</span>}
        </h2>
        <div className="m4-cheese-top3-grid">
          {top3.map((item, idx) => (
            <article key={item.id} className="m4-cheese-top3-item">
              <div className="m4-cheese-top3-rank" style={{ color: TOP3_COLORS[idx] || TOP3_COLORS[2] }}>
                #{idx + 1}
              </div>
              <div className="m4-cheese-top3-name-cell">
                {getBreedImage(item.name, null) && (
                  <img src={getBreedImage(item.name, null)} alt="" className="m4-breed-thumb m4-breed-profile-img--face-left" />
                )}
                <strong>{item.name}</strong>
              </div>
              <div className="m4-cheese-top3-value">{fmt(item.lifetime_cheese_kg, 2)} kg</div>
              <div className="m4-cheese-top3-percent">
                {topCheese > 0 ? `${((Number(item.lifetime_cheese_kg) / Number(topCheese)) * 100).toFixed(1)}%` : '0%'}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card m4-cheese-chart-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="chartBar" size={18} className="m4-title-icon" />
          {t('module4CheeseComparativeBarsTitle')}
        </h2>
        <p className="m4-section-subtitle">{t('module4CheeseComparativeBarsHint')}</p>

        <div className="m4-cheese-bars-wrap">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
              <YAxis type="category" dataKey="shortName" width={170} />
              <Tooltip
                formatter={(value, name, payload) => {
                  if (name === 'pct') return [`${Number(value).toFixed(1)}%`, t('module4CheeseRelativePerformance')];
                  return [`${fmt(value, 2)} kg`, t('module4LifetimeCheeseKg')];
                }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
              />
              <Bar dataKey="pct" radius={[0, 8, 8, 0]}>
                {chartData.map((entry) => {
                  const color = entry.rank <= 3 ? TOP3_COLORS[entry.rank - 1] : NEUTRAL_BAR;
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

        {breedA && breedB && comparison && (
          <div className="m4-compare-grid">
            <div className="m4-compare-col">
              <h3 className="m4-compare-title-with-image">
                {getBreedImage(breedA.name, null) && (
                  <img src={getBreedImage(breedA.name, null)} alt="" className="m4-breed-thumb m4-breed-profile-img--face-left" />
                )}
                <span>{breedA.name}</span>
              </h3>
              <ul className="m4-compare-list">
                <li><span>{t('module4LifetimeCheeseKg')}</span><strong>{fmt(comparison.aKg, 2)} kg</strong></li>
                <li><span>{t('module4CheeseYieldLPerKg')}</span><strong>{fmt(Number(breedA.cheese_yield_liters_per_kg) || 0, 2)}</strong></li>
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
                <li><span>{t('module4LifetimeCheeseKg')}</span><strong>{fmt(comparison.bKg, 2)} kg</strong></li>
                <li><span>{t('module4CheeseYieldLPerKg')}</span><strong>{fmt(Number(breedB.cheese_yield_liters_per_kg) || 0, 2)}</strong></li>
              </ul>
            </div>

            <div className="m4-compare-diff-card">
              <span>{t('module4CheeseDifferenceTitle')}</span>
              <strong>{comparison.diff >= 0 ? '+' : ''}{fmt(comparison.diff, 2)} kg</strong>
              <p>{comparison.pct == null ? '-' : `${comparison.pct >= 0 ? '+' : ''}${comparison.pct.toFixed(1)}%`}</p>
            </div>
          </div>
        )}
      </section>

      <div className="m4-back-wrap">
        <Link to="/module4" className="m4-back-link">
          {'<- '}{t('module4BackToInvestment')}
        </Link>
      </div>
    </div>
  );
}
