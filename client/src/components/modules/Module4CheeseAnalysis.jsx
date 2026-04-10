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

const TOP_COLORS = ['#d4a017', '#16a34a', '#22c55e'];
const BAR_COLORS = {
  top1: '#d4a017',
  top2: '#4ade80',
  top3: '#16a34a',
  default: '#93c5fd',
};

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
        const [br, rk] = await Promise.all([api.get('/m4/breeds'), api.get('/m4/ranking/cheese')]);
        const list = (br.data.breeds || []).filter((b) => !b.locked);
        setBreeds(list);
        setIsPro(!!br.data.isPro);
        setRanking(rk.data.ranking || []);
        if (list.length > 0) {
          setCompareA(list[0].id);
          setCompareB(list.length > 1 ? list[1].id : list[0].id);
        }
      } catch (e) {
        console.error(e);
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
  const topThree = ranking.slice(0, 3);

  const chartData = useMemo(() => {
    return ranking.slice(0, 12).map((r, idx) => {
      const pct = topCheese > 0 ? (Number(r.lifetime_cheese_kg) / Number(topCheese)) * 100 : 0;
      return {
        id: r.id,
        rank: idx + 1,
        name: r.name,
        shortName: r.name.length > 16 ? `${r.name.slice(0, 16)}…` : r.name,
        kg: Number(r.lifetime_cheese_kg) || 0,
        pct,
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

    return {
      aKg,
      bKg,
      diff,
      pct,
    };
  }, [breedA, breedB]);

  const renderBreedThumb = (breedName) => {
    const src = getBreedImage(breedName, null);
    if (!src) return null;
    return <img src={src} alt="" className="m4-breed-thumb m4-breed-profile-img--face-left" />;
  };

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
        </div>
      </header>

      <section className="card m4-cheese-top3-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="trophy" size={18} className="m4-title-icon" />
          {t('module4CheeseTop3Title')}
        </h2>
        <div className="m4-cheese-top3-grid">
          {topThree.map((item, idx) => (
            <article key={item.id} className="m4-cheese-top3-item">
              <div className="m4-cheese-top3-rank" style={{ color: TOP_COLORS[idx] || TOP_COLORS[2] }}>
                #{idx + 1}
              </div>
              <div className="m4-cheese-top3-name-cell">
                {renderBreedThumb(item.name)}
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
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="shortName" angle={-18} textAnchor="end" interval={0} height={72} />
              <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip
                formatter={(value, name, payload) => {
                  if (name === 'pct') return [`${Number(value).toFixed(1)}%`, t('module4CheeseRelativePerformance')];
                  return [`${fmt(value, 2)} kg`, t('module4LifetimeCheeseKg')];
                }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
              />
              <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => {
                  let color = BAR_COLORS.default;
                  if (entry.rank === 1) color = BAR_COLORS.top1;
                  else if (entry.rank === 2) color = BAR_COLORS.top2;
                  else if (entry.rank === 3) color = BAR_COLORS.top3;
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
                {renderBreedThumb(breedA.name)}
                <span>{breedA.name}</span>
              </h3>
              <ul className="m4-compare-list">
                <li>
                  <span>{t('module4LifetimeCheeseKg')}</span>
                  <strong>{fmt(comparison.aKg, 2)} kg</strong>
                </li>
                <li>
                  <span>{t('module4CheeseYieldLPerKg')}</span>
                  <strong>{fmt(Number(breedA.cheese_yield_liters_per_kg) || 0, 2)}</strong>
                </li>
              </ul>
            </div>

            <div className="m4-compare-col">
              <h3 className="m4-compare-title-with-image">
                {renderBreedThumb(breedB.name)}
                <span>{breedB.name}</span>
              </h3>
              <ul className="m4-compare-list">
                <li>
                  <span>{t('module4LifetimeCheeseKg')}</span>
                  <strong>{fmt(comparison.bKg, 2)} kg</strong>
                </li>
                <li>
                  <span>{t('module4CheeseYieldLPerKg')}</span>
                  <strong>{fmt(Number(breedB.cheese_yield_liters_per_kg) || 0, 2)}</strong>
                </li>
              </ul>
            </div>

            <div className="m4-compare-diff-card">
              <span>{t('module4CheeseDifferenceTitle')}</span>
              <strong>{comparison.diff >= 0 ? '+' : ''}{fmt(comparison.diff, 2)} kg</strong>
              <p>
                {comparison.pct == null
                  ? '-'
                  : `${comparison.pct >= 0 ? '+' : ''}${comparison.pct.toFixed(1)}%`}
              </p>
            </div>
          </div>
        )}

        {!isPro && ranking.length > 3 && (
          <p className="m4-cheese-pro-teaser">{t('module4CheeseRankingProTeaser')}</p>
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
