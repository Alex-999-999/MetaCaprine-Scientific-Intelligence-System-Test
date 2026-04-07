import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import ModernIcon from '../icons/ModernIcon';
import { getBreedImage } from '../../utils/breedImages';
import '../../styles/Module4.css';

const fmt = (n, d = 0) =>
  n == null ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * M4-B — Análisis quesero por raza (separado del análisis económico principal).
 */
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
    const m = new Map();
    breeds.forEach((b) => m.set(b.id, b));
    return m;
  }, [breeds]);

  const rankIndex = useMemo(() => {
    const m = new Map();
    ranking.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [ranking]);

  const breedA = compareA != null ? byId.get(compareA) : null;
  const breedB = compareB != null ? byId.get(compareB) : null;

  const renderBreedThumb = (breedName) => {
    const src = getBreedImage(breedName, null);
    if (!src) return null;
    return (
      <img
        src={src}
        alt=""
        className="m4-breed-thumb m4-breed-profile-img--face-left"
      />
    );
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
        <div className="m4-pedagogy-block m4-pedagogy--info">
          <p className="m4-pedagogy-block-text">{t('module4MandatoryDisclaimer')}</p>
        </div>
      </header>

      <div className="m4-pedagogy-block m4-pedagogy--warning">
        <p className="m4-pedagogy-block-text">{t('module4PedagogyBeforeRanking')}</p>
      </div>

      <div className="card m4-cheese-ranking-card">
        <h2 className="m4-section-title m4-title-with-icon">
          <ModernIcon name="trophy" size={18} className="m4-title-icon" />
          {t('module4CheeseRankingTitle')}
        </h2>
        <p className="m4-section-subtitle">{t('module4CheeseRankingExplainer')}</p>

        <div className="m4-cheese-table-wrap">
          <table className="m4-cheese-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('breed')}</th>
                <th>{t('module4LifetimeCheeseKg')}</th>
                <th>{t('module4CheeseYieldLPerKg')}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => {
                const full = byId.get(r.id);
                const yieldVal =
                  r.cheese_yield_liters_per_kg != null
                    ? Number(r.cheese_yield_liters_per_kg)
                    : full != null
                      ? Number(full.cheese_yield_liters_per_kg)
                      : null;
                return (
                  <tr key={r.id}>
                    <td>{rankIndex.get(r.id) ?? '—'}</td>
                    <td>
                      <div className="m4-breed-name-cell">
                        {renderBreedThumb(r.name)}
                        <span>{r.name}</span>
                      </div>
                    </td>
                    <td>{fmt(r.lifetime_cheese_kg, 2)}</td>
                    <td>{yieldVal != null && Number.isFinite(yieldVal) ? fmt(yieldVal, 2) : '—'} L/kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isPro && ranking.length > 3 && (
          <p className="m4-cheese-pro-teaser">{t('module4CheeseRankingProTeaser')}</p>
        )}
      </div>

      <div className="card m4-compare-card">
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
        {breedA && breedB && (
          <div className="m4-compare-grid">
            <div className="m4-compare-col">
              <h3 className="m4-compare-title-with-image">
                {renderBreedThumb(breedA.name)}
                <span>{breedA.name}</span>
              </h3>
              <ul className="m4-compare-list">
                <li>
                  <span>{t('module4LifetimeCheeseKg')}</span> <strong>{fmt(breedA.lifetime_cheese_kg, 2)} kg</strong>
                </li>
                <li>
                  <span>{t('module4CheeseYieldLPerKg')}</span>{' '}
                  <strong>{fmt(Number(breedA.cheese_yield_liters_per_kg) || 0, 2)}</strong>
                </li>
                <li>
                  <span>{t('module4RankPosition')}</span> <strong>#{rankIndex.get(breedA.id) ?? '—'}</strong>
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
                  <span>{t('module4LifetimeCheeseKg')}</span> <strong>{fmt(breedB.lifetime_cheese_kg, 2)} kg</strong>
                </li>
                <li>
                  <span>{t('module4CheeseYieldLPerKg')}</span>{' '}
                  <strong>{fmt(Number(breedB.cheese_yield_liters_per_kg) || 0, 2)}</strong>
                </li>
                <li>
                  <span>{t('module4RankPosition')}</span> <strong>#{rankIndex.get(breedB.id) ?? '—'}</strong>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="m4-back-wrap">
        <Link to="/module4" className="m4-back-link">
          ← {t('module4BackToInvestment')}
        </Link>
      </div>
    </div>
  );
}
