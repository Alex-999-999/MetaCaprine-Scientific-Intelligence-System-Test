import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';

const MODULE_LINKS = {
  M1: '/module1',
  M2: '/module2',
  M3: '/module3',
  M4: '/module4',
  M5: '/module5',
  M6: '/module6',
};

const DEFAULT_ADMIN_FORM = {
  title: '',
  subtitle: '',
  summary: '',
  business_impact: '',
  audience: 'ambos',
  content_type: 'video_hook',
  access_level: 'free',
  video_url: '',
  thumbnail_url: '',
  article_url: '',
  duration_seconds: 180,
  related_module: 'none',
  cta_text: '',
  cta_url: '',
  sort_order: 0,
  is_active: true,
};

function coerceRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (!raw) return 'free';
  if (raw === 'pro_user' || raw === 'premium') return 'pro';
  return raw;
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseDuration(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  if (!mins) return `${secs}s`;
  if (!secs) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function Module7StrategicAcademy({ user }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { contentId } = useParams();

  const normalizedRole = coerceRole(user?.role);
  const isAdmin = normalizedRole === 'admin';
  const isEliteRole = normalizedRole === 'elite';
  const isProRole = normalizedRole === 'pro';
  const hasAdvancedFeature = Array.isArray(user?.features) && user.features.includes('advanced_calculations');
  const hasM7Feature = Array.isArray(user?.features) && user.features.includes('module7');
  const hasM7EliteFeature = Array.isArray(user?.features) && user.features.includes('module7_elite');

  const hasProAccess = isAdmin || isEliteRole || isProRole || hasAdvancedFeature || hasM7Feature;
  const hasEliteAccess = isAdmin || isEliteRole || hasM7EliteFeature;
  const isM7AdminRoute = location.pathname.startsWith('/m7/admin');

  const [audience, setAudience] = useState('');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminForm, setAdminForm] = useState(DEFAULT_ADMIN_FORM);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const canAccess = useCallback((accessLevel) => {
    const level = String(accessLevel || 'free').toLowerCase();
    if (level === 'free') return true;
    if (level === 'pro') return hasProAccess;
    if (level === 'elite') return hasEliteAccess;
    return false;
  }, [hasEliteAccess, hasProAccess]);

  const loadContent = useCallback(async () => {
    if (!audience && !isAdmin) {
      setContent([]);
      setSelectedDetail(null);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get('/m7/content', {
        params: {
          audience: audience || undefined,
          include_inactive: isAdmin && includeInactive ? 'true' : undefined,
        },
      });
      setContent(Array.isArray(response.data?.content) ? response.data.content : []);
    } catch (err) {
      console.error('M7 content load error:', err);
      setError(err?.response?.data?.error || t('errorOccurred'));
      setContent([]);
    } finally {
      setLoading(false);
    }
  }, [audience, includeInactive, isAdmin, t]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const onPickAudience = (value) => {
    setAudience(value);
    setSelectedDetail(null);
  };

  const sortedByOrder = useMemo(
    () => [...content].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [content],
  );

  const visibleHookVideos = useMemo(() => {
    const filtered = sortedByOrder.filter(
      (item) => item.content_type === 'video_hook' && item.access_level === 'free' && (item.is_active || isAdmin),
    );
    return filtered.slice(0, 3);
  }, [isAdmin, sortedByOrder]);

  const lockedPreviewCards = useMemo(() => {
    return sortedByOrder.filter((item) => (item.is_active || isAdmin) && !canAccess(item.access_level)).slice(0, 8);
  }, [canAccess, isAdmin, sortedByOrder]);

  const accessibleContent = useMemo(() => {
    if (!hasProAccess) return [];
    return sortedByOrder.filter((item) => (item.is_active || isAdmin) && canAccess(item.access_level));
  }, [canAccess, hasProAccess, isAdmin, sortedByOrder]);

  const diagnosisSignals = useMemo(() => {
    if (audience === 'productor_actual') {
      return [
        { label: t('module7SignalCostLeak'), value: 82, tone: 'amber' },
        { label: t('module7SignalMarginControl'), value: 41, tone: 'blue' },
        { label: t('module7SignalScalingReadiness'), value: 56, tone: 'green' },
      ];
    }
    return [
      { label: t('module7SignalInvestmentClarity'), value: 74, tone: 'blue' },
      { label: t('module7SignalPaybackPotential'), value: 67, tone: 'green' },
      { label: t('module7SignalOperationalRisk'), value: 38, tone: 'amber' },
    ];
  }, [audience, t]);

  const goToUpgrade = () => {
    navigate('/profile');
  };

  const loadContentDetail = async (id) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/m7/content/${id}`);
      setSelectedDetail(response.data?.content || null);
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || t('errorOccurred');
      setError(message);
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCardClick = (item) => {
    if (!canAccess(item.access_level)) {
      goToUpgrade();
      return;
    }
    navigate(`/m7/contenido/${item.id}`);
  };

  const relatedModuleRoute = selectedDetail?.related_module ? MODULE_LINKS[selectedDetail.related_module] : null;

  const resolveCtaTarget = (item) => {
    if (item.cta_url && String(item.cta_url).trim().length > 0) return String(item.cta_url).trim();
    if (item.related_module && MODULE_LINKS[item.related_module]) return MODULE_LINKS[item.related_module];
    return '';
  };

  const updateAdminForm = (key, value) => {
    setAdminForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitAdminForm = async (event) => {
    event.preventDefault();
    try {
      setAdminSaving(true);
      setAdminMessage('');
      await api.post('/m7/content', {
        ...adminForm,
        duration_seconds: Number(adminForm.duration_seconds) || null,
        sort_order: Number(adminForm.sort_order) || 0,
        is_active: toBoolean(adminForm.is_active, true),
      });
      setAdminMessage(t('module7AdminSaved'));
      setAdminForm(DEFAULT_ADMIN_FORM);
      await loadContent();
    } catch (err) {
      setAdminMessage(err?.response?.data?.error || t('errorOccurred'));
    } finally {
      setAdminSaving(false);
    }
  };

  const toggleItemActive = async (item) => {
    try {
      await api.put(`/m7/content/${item.id}`, { is_active: !item.is_active });
      await loadContent();
    } catch (err) {
      setAdminMessage(err?.response?.data?.error || t('errorOccurred'));
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`${t('delete')} "${item.title}"?`)) return;
    try {
      await api.delete(`/m7/content/${item.id}`);
      await loadContent();
    } catch (err) {
      setAdminMessage(err?.response?.data?.error || t('errorOccurred'));
    }
  };

  useEffect(() => {
    if (!contentId) return;
    loadContentDetail(contentId);
  }, [contentId]);

  useEffect(() => {
    if (isM7AdminRoute) {
      setShowAdminPanel(true);
      if (!audience) setAudience('ambos');
    }
  }, [isM7AdminRoute, audience]);

  return (
    <div className="container module-compact module7-root">
      <header className="module7-header">
        <h1>{t('module7Title')}</h1>
        <p className="module7-subtitle">{t('module7Subtitle')}</p>
      </header>

      {!isM7AdminRoute && (
      <section className="card module7-route-card">
        <h2>{t('module7ChoosePathTitle')}</h2>
        <p className="input-hint">{t('module7ChoosePathHint')}</p>
        <div className="module7-audience-grid">
          <button
            type="button"
            className={`module7-audience-btn ${audience === 'productor_actual' ? 'active' : ''}`}
            onClick={() => onPickAudience('productor_actual')}
          >
            <h3>{t('module7RouteProducerTitle')}</h3>
            <p>{t('module7RouteProducerText')}</p>
          </button>
          <button
            type="button"
            className={`module7-audience-btn ${audience === 'nuevo_inversionista' ? 'active' : ''}`}
            onClick={() => onPickAudience('nuevo_inversionista')}
          >
            <h3>{t('module7RouteInvestorTitle')}</h3>
            <p>{t('module7RouteInvestorText')}</p>
          </button>
        </div>
      </section>
      )}

      {!isM7AdminRoute && audience ? (
        <>
          <section className="card module7-diagnosis-card">
            <div className="module7-diagnosis-head">
              <h2>{t('module7MiniDiagnosisTitle')}</h2>
              <span className="badge badge-warning">{t('module7MiniDiagnosisBadge')}</span>
            </div>
            <p className="input-hint">{t('module7MiniDiagnosisHint')}</p>
            <div className="module7-signal-grid">
              {diagnosisSignals.map((signal) => (
                <div key={signal.label} className={`module7-signal module7-signal--${signal.tone}`}>
                  <div className="module7-signal-label">{signal.label}</div>
                  <div className="module7-signal-bar">
                    <span style={{ width: `${signal.value}%` }} />
                  </div>
                  <div className="module7-signal-value">{signal.value}%</div>
                </div>
              ))}
            </div>
          </section>

          <section className="card module7-content-card">
            <div className="module7-content-head">
              <h2>{t('module7HookVideosTitle')}</h2>
              {!hasProAccess && <span className="badge badge-info">{t('module7FreeLayerBadge')}</span>}
            </div>

            {loading && <p>{t('loading')}</p>}
            {!loading && error && <p className="error-message">{error}</p>}

            {!loading && !error && visibleHookVideos.length === 0 && (
              <p className="input-hint">{t('module7NoContent')}</p>
            )}

            {!loading && !error && visibleHookVideos.length > 0 && (
              <div className="module7-grid">
                {visibleHookVideos.map((item) => (
                  <article key={item.id} className="module7-item-card">
                    <div className="module7-item-topline">
                      <span className="module7-item-type">{t('module7TypeVideoHook')}</span>
                      <span className="module7-item-access">{item.access_level}</span>
                    </div>
                    <h3>{item.title}</h3>
                    {item.subtitle && <p className="module7-item-subtitle">{item.subtitle}</p>}
                    {item.business_impact && (
                      <p className="module7-item-impact">
                        <strong>{t('module7BusinessImpactLabel')}</strong> {item.business_impact}
                      </p>
                    )}
                    <div className="module7-item-actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCardClick(item)}>
                        {t('module7ViewContent')}
                      </button>
                      {item.duration_seconds ? <span className="module7-item-duration">{parseDuration(item.duration_seconds)}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card module7-content-card">
            <div className="module7-content-head">
              <h2>{t('module7LockedPreviewTitle')}</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={goToUpgrade}>
                {t('module7UnlockCta')}
              </button>
            </div>
            <p className="input-hint">{t('module7LockedPreviewHint')}</p>
            <div className="module7-grid">
              {lockedPreviewCards.map((item) => (
                <article key={item.id} className="module7-item-card locked">
                  <div className="module7-item-topline">
                    <span className="module7-item-type">{item.content_type}</span>
                    <span className="module7-item-access">{item.access_level}</span>
                  </div>
                  <h3>{item.title}</h3>
                  {item.subtitle && <p className="module7-item-subtitle">{item.subtitle}</p>}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={goToUpgrade}>
                    {t('module7LockedCardButton')}
                  </button>
                </article>
              ))}
              {!lockedPreviewCards.length && <p className="input-hint">{t('module7NoLockedCards')}</p>}
            </div>
          </section>

          {hasProAccess && (
            <section className="card module7-content-card">
              <h2>{t('module7AccessibleContentTitle')}</h2>
              <p className="input-hint">{t('module7AccessibleContentHint')}</p>
              <div className="module7-grid">
                {accessibleContent.map((item) => (
                  <article key={item.id} className="module7-item-card">
                    <div className="module7-item-topline">
                      <span className="module7-item-type">{item.content_type}</span>
                      <span className="module7-item-access">{item.access_level}</span>
                    </div>
                    <h3>{item.title}</h3>
                    {item.subtitle && <p className="module7-item-subtitle">{item.subtitle}</p>}
                    <div className="module7-item-actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCardClick(item)}>
                        {t('module7ViewContent')}
                      </button>
                      {item.duration_seconds ? <span className="module7-item-duration">{parseDuration(item.duration_seconds)}</span> : null}
                    </div>
                  </article>
                ))}
                {!accessibleContent.length && <p className="input-hint">{t('module7NoAccessible')}</p>}
              </div>
            </section>
          )}

          {selectedDetail && (
            <section className="card module7-detail-card">
              {detailLoading && <p>{t('loading')}</p>}
              {!detailLoading && (
                <>
                  <div className="module7-detail-head">
                    <h2>{selectedDetail.title}</h2>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDetail(null)}>
                      {t('close')}
                    </button>
                  </div>
                  {selectedDetail.subtitle && <p className="module7-item-subtitle">{selectedDetail.subtitle}</p>}

                  {selectedDetail.video_url && (
                    <div className="module7-video-frame">
                      <iframe
                        src={selectedDetail.video_url}
                        title={selectedDetail.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  <div className="module7-detail-grid">
                    <article className="module7-detail-block">
                      <h3>{t('module7SummaryTitle')}</h3>
                      <p>{selectedDetail.summary || t('module7NoSummary')}</p>
                    </article>
                    <article className="module7-detail-block">
                      <h3>{t('module7BusinessImpactTitle')}</h3>
                      <p>{selectedDetail.business_impact || t('module7NoImpact')}</p>
                    </article>
                  </div>

                  <div className="module7-detail-actions">
                    {resolveCtaTarget(selectedDetail) ? (
                      <a
                        href={resolveCtaTarget(selectedDetail)}
                        target={String(resolveCtaTarget(selectedDetail)).startsWith('http') ? '_blank' : '_self'}
                        rel="noreferrer"
                        className="btn btn-primary"
                      >
                        {selectedDetail.cta_text || t('module7PrimaryAction')}
                      </a>
                    ) : null}
                    {relatedModuleRoute ? (
                      <button type="button" className="btn btn-secondary" onClick={() => navigate(relatedModuleRoute)}>
                        {t('module7OpenRelatedModule')} {selectedDetail.related_module}
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      ) : null}

      {isM7AdminRoute && !isAdmin && (
        <section className="card module7-admin-card">
          <h2>{t('module7AdminTitle')}</h2>
          <p className="input-hint">{t('module7AdminOnlyMessage')}</p>
        </section>
      )}

      {isAdmin && (
        <section className="card module7-admin-card">
          <div className="module7-admin-head">
            <h2>{t('module7AdminTitle')}</h2>
            <div className="module7-admin-controls">
              <label className="module7-inline-check">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
                <span>{t('module7AdminIncludeInactive')}</span>
              </label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdminPanel((prev) => !prev)}>
                {showAdminPanel ? t('module7AdminHideForm') : t('module7AdminShowForm')}
              </button>
            </div>
          </div>
          <p className="input-hint">{t('module7AdminHint')}</p>

          {showAdminPanel && (
            <form className="module7-admin-form" onSubmit={submitAdminForm}>
              <div className="module7-admin-grid">
                <div className="form-group">
                  <label>{t('module7FieldTitle')}</label>
                  <input value={adminForm.title} onChange={(event) => updateAdminForm('title', event.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldSubtitle')}</label>
                  <input value={adminForm.subtitle} onChange={(event) => updateAdminForm('subtitle', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldAudience')}</label>
                  <select value={adminForm.audience} onChange={(event) => updateAdminForm('audience', event.target.value)}>
                    <option value="ambos">{t('module7AudienceBoth')}</option>
                    <option value="productor_actual">{t('module7AudienceProducer')}</option>
                    <option value="nuevo_inversionista">{t('module7AudienceInvestor')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('module7FieldType')}</label>
                  <select value={adminForm.content_type} onChange={(event) => updateAdminForm('content_type', event.target.value)}>
                    <option value="video_hook">{t('module7TypeVideoHook')}</option>
                    <option value="video_pro">{t('module7TypeVideoPro')}</option>
                    <option value="articulo">{t('module7TypeArticle')}</option>
                    <option value="concepto_libro">{t('module7TypeBookConcept')}</option>
                    <option value="caso_real">{t('module7TypeCase')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('module7FieldAccess')}</label>
                  <select value={adminForm.access_level} onChange={(event) => updateAdminForm('access_level', event.target.value)}>
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="elite">elite</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('module7FieldDuration')}</label>
                  <input
                    type="number"
                    min="0"
                    value={adminForm.duration_seconds}
                    onChange={(event) => updateAdminForm('duration_seconds', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldVideoUrl')}</label>
                  <input value={adminForm.video_url} onChange={(event) => updateAdminForm('video_url', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldThumbnailUrl')}</label>
                  <input value={adminForm.thumbnail_url} onChange={(event) => updateAdminForm('thumbnail_url', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldArticleUrl')}</label>
                  <input value={adminForm.article_url} onChange={(event) => updateAdminForm('article_url', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldRelatedModule')}</label>
                  <select value={adminForm.related_module} onChange={(event) => updateAdminForm('related_module', event.target.value)}>
                    <option value="none">none</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                    <option value="M3">M3</option>
                    <option value="M4">M4</option>
                    <option value="M5">M5</option>
                    <option value="M6">M6</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('module7FieldCtaText')}</label>
                  <input value={adminForm.cta_text} onChange={(event) => updateAdminForm('cta_text', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldCtaUrl')}</label>
                  <input value={adminForm.cta_url} onChange={(event) => updateAdminForm('cta_url', event.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('module7FieldSortOrder')}</label>
                  <input
                    type="number"
                    value={adminForm.sort_order}
                    onChange={(event) => updateAdminForm('sort_order', event.target.value)}
                  />
                </div>
                <div className="form-group module7-inline-check">
                  <label>
                    <input
                      type="checkbox"
                      checked={toBoolean(adminForm.is_active, true)}
                      onChange={(event) => updateAdminForm('is_active', event.target.checked)}
                    />
                    <span>{t('module7FieldIsActive')}</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>{t('module7FieldSummary')}</label>
                <textarea rows="3" value={adminForm.summary} onChange={(event) => updateAdminForm('summary', event.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('module7FieldBusinessImpact')}</label>
                <textarea rows="3" value={adminForm.business_impact} onChange={(event) => updateAdminForm('business_impact', event.target.value)} />
              </div>

              <div className="module7-admin-actions">
                <button type="submit" className="btn btn-primary" disabled={adminSaving}>
                  {adminSaving ? t('saving') : t('module7AdminSaveButton')}
                </button>
                {adminMessage && <span className="module7-admin-message">{adminMessage}</span>}
              </div>
            </form>
          )}

          <div className="module7-admin-list">
            <h3>{t('module7AdminCurrentList')}</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('module7FieldTitle')}</th>
                    <th>{t('module7FieldAudience')}</th>
                    <th>{t('module7FieldType')}</th>
                    <th>{t('module7FieldAccess')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByOrder.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.audience}</td>
                      <td>{item.content_type}</td>
                      <td>{item.access_level}</td>
                      <td>{item.is_active ? t('module7StatusActive') : t('module7StatusInactive')}</td>
                      <td>
                        <div className="module7-admin-row-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleItemActive(item)}>
                            {item.is_active ? t('module7AdminDeactivate') : t('module7AdminActivate')}
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteItem(item)}>
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Module7StrategicAcademy;
