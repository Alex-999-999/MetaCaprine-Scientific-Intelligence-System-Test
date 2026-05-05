import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';
import Modal from './Modal';
import ModernIcon from './icons/ModernIcon';

function Dashboard({ user, onLogout }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioType, setNewScenarioType] = useState('milk_sale');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, scenarioId: null, scenarioName: '' });
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResent, setEmailResent] = useState(false);
  const menuRefs = useRef({});

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setEmailResent(false);
    try {
      await api.post('/auth/resend-verification');
      setEmailResent(true);
      setTimeout(() => setEmailResent(false), 5000);
    } catch (error) {
      alert(error.response?.data?.error || t('failedResendVerificationEmail'));
    } finally {
      setResendingEmail(false);
    }
  };

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async () => {
    if (!newScenarioName.trim()) {
      return;
    }
    try {
      await api.post('/scenarios', {
        name: newScenarioName,
        type: newScenarioType,
      });
      setNewScenarioName('');
      setNewScenarioType('milk_sale');
      setShowCreateForm(false);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || t('errorCreatingScenario'));
    }
  };

  const handleCreateModalClose = () => {
    setShowCreateForm(false);
    setNewScenarioName('');
    setNewScenarioType('milk_sale');
  };

  const handleDuplicateScenario = async (scenarioId) => {
    try {
      await api.post(`/scenarios/${scenarioId}/duplicate`);
      loadScenarios();
    } catch (error) {
      alert(error.response?.data?.error || t('errorDuplicatingScenario'));
    }
  };

  const handleDeleteClick = (scenarioId, scenarioName) => {
    setDeleteModal({ isOpen: true, scenarioId, scenarioName });
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.scenarioId) return;

    try {
      await api.delete(`/scenarios/${deleteModal.scenarioId}`);
      loadScenarios();
      setDeleteModal({ isOpen: false, scenarioId: null, scenarioName: '' });
    } catch (error) {
      alert(error.response?.data?.error || t('errorDeletingScenario'));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, scenarioId: null, scenarioName: '' });
  };

  const normalizeScenarioType = (type) => {
    if (type === 'summary') return 'gestation';
    if (type === 'conversion') return 'yield';
    return type;
  };

  const getModulePath = (type) => {
    const normalizedType = normalizeScenarioType(type);
    const typeMap = {
      milk_sale: '/module1',
      transformation: '/module2',
      lactation: '/module3',
      yield: '/module4',
      gestation: '/module5',
      kid_rearing: '/module6',
    };
    return typeMap[normalizedType] || '/dashboard';
  };

  const getModuleName = (type) => {
    const normalizedType = normalizeScenarioType(type);
    return t(`moduleTypes.${normalizedType}`) || normalizedType;
  };

  const getModuleColor = (type) => {
    const normalizedType = normalizeScenarioType(type);
    const colorMap = {
      milk_sale: 'var(--accent-success)',
      transformation: 'var(--accent-success)',
      lactation: 'var(--accent-warning)',
      yield: 'var(--accent-info)',
      gestation: 'var(--accent-error)',
      kid_rearing: '#8b5cf6',
    };
    return colorMap[normalizedType] || 'var(--text-tertiary)';
  };

  const getModuleIcon = (type) => {
    const normalizedType = normalizeScenarioType(type);
    const iconMap = {
      milk_sale: 'chartBar',
      transformation: 'package',
      lactation: 'heartPulse',
      yield: 'conversionYield',
      gestation: 'calendar',
      kid_rearing: 'leaf',
    };
    return iconMap[normalizedType] || 'fileText';
  };

  // Configurable menu items - easily extendable
  const getMenuItems = (scenario) => {
    return [
      {
        id: 'duplicate',
        label: t('duplicate'),
        icon: 'duplicate',
        action: 'duplicate',
        danger: false
      },
      {
        id: 'delete',
        label: t('delete'),
        icon: 'trash',
        action: 'delete',
        danger: true
      }
    ];
  };

  // Filter scenarios
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || normalizeScenarioType(scenario.type) === filterType;
    return matchesSearch && matchesType;
  });

  // Handle card click
  const handleCardClick = (scenario) => {
    const path = getModulePath(scenario.type);
    navigate(path, { state: { scenarioId: scenario.id } });
  };

  // Handle menu toggle
  const handleMenuToggle = (e, scenarioId) => {
    e.stopPropagation(); // Prevent card click
    setOpenMenuId(openMenuId === scenarioId ? null : scenarioId);
  };

  // Handle menu action
  const handleMenuAction = (e, scenarioId, action) => {
    e.stopPropagation(); // Prevent card click
    setOpenMenuId(null);
    
    if (action === 'duplicate') {
      handleDuplicateScenario(scenarioId);
    } else if (action === 'delete') {
      const scenario = scenarios.find(s => s.id === scenarioId);
      handleDeleteClick(scenarioId, scenario?.name || '');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  return (
    <div className="container">
      {/* Email Verification Warning */}
      {user && !user.email_verified && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(234, 179, 8, 0.1)',
          border: '2px solid var(--accent-warning)',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <ModernIcon name="warning" size={22} />
              <strong style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                {t('verifyEmailTitle')}
              </strong>
            </div>
            <p style={{ 
              margin: 0, 
              color: 'var(--text-secondary)', 
              fontSize: '0.9375rem',
              lineHeight: '1.5'
            }}>
              {t('verifyEmailMessage')}
              {emailResent && (
                <span style={{ 
                  marginTop: '8px', 
                  color: 'var(--accent-success)',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ModernIcon name="checkCircle" size={16} />
                  {t('verifyEmailSent')}
                </span>
              )}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleResendVerification}
            disabled={resendingEmail || emailResent}
            style={{ whiteSpace: 'nowrap' }}
          >
            {resendingEmail ? t('sending') : emailResent ? t('sent') : t('resendEmail')}
          </button>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{t('myScenarios')}</h1>
          <p className="page-subtitle">{scenarios.length} {scenarios.length === 1 ? t('scenarioSingular') : t('scenarios')}</p>
        </div>
        <button
          className="btn btn-primary btn-icon"
          onClick={() => setShowCreateForm(true)}
        >
          <span className="btn-icon-text">+</span>
          {t('newScenario')}
        </button>
      </div>

      {scenarios.length > 0 && (
        <div className="card card-filters">
          <div className="filters-container">
            <div className="search-box">
              <span className="search-icon">
                <ModernIcon name="search" size={18} />
              </span>
              <input
                type="text"
                placeholder={t('searchScenarios')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t('allTypes')}</option>
              <option value="milk_sale">{t('moduleTypes.milk_sale')}</option>
              <option value="transformation">{t('moduleTypes.transformation')}</option>
              <option value="lactation">{t('moduleTypes.lactation')}</option>
              <option value="yield">{t('moduleTypes.yield')}</option>
              <option value="gestation">{t('moduleTypes.gestation')}</option>
              <option value="kid_rearing">{t('moduleTypes.kid_rearing')}</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>{t('loadingScenarios')}</p>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="card card-empty">
          <div className="empty-state">
            <div className="empty-icon">
              <ModernIcon name="fileText" size={52} />
            </div>
            <h3>{scenarios.length === 0 ? t('noScenarios') : t('noResults')}</h3>
            <p>{scenarios.length === 0 ? t('getStarted') : t('tryAdjustingSearch')}</p>
            {scenarios.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                <span className="btn-icon-text">+</span>
                {t('createScenario')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="scenarios-grid">
          {filteredScenarios.map((scenario) => (
            <div 
              key={scenario.id} 
              className="scenario-card clickable-card"
              onClick={() => handleCardClick(scenario)}
            >
              <div className="scenario-header">
                <div className="scenario-icon" style={{ backgroundColor: `${getModuleColor(scenario.type)}20`, color: getModuleColor(scenario.type) }}>
                  <ModernIcon name={getModuleIcon(scenario.type)} size={26} />
                </div>
                <div className="scenario-info">
                  <h3 className="scenario-name">{scenario.name}</h3>
                  <span className="scenario-badge" style={{ backgroundColor: `${getModuleColor(scenario.type)}15`, color: getModuleColor(scenario.type) }}>
                    {getModuleName(scenario.type)}
                  </span>
                </div>
                <div 
                  className="scenario-menu-container"
                  ref={el => menuRefs.current[scenario.id] = el}
                  onClick={(e) => handleMenuToggle(e, scenario.id)}
                >
                  <button className="scenario-menu-button" title={t('moreOptions')}>
                    <span className="menu-dots">
                      <ModernIcon name="moreHorizontal" size={18} />
                    </span>
                  </button>
                  {openMenuId === scenario.id && (
                    <div className="scenario-menu-dropdown">
                      {getMenuItems(scenario).map((item) => (
                        <button
                          key={item.id}
                          className={`menu-item ${item.danger ? 'menu-item-danger' : ''}`}
                          onClick={(e) => handleMenuAction(e, scenario.id, item.action)}
                        >
                          <span className="menu-icon">
                            <ModernIcon name={item.icon} size={16} />
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="scenario-meta">
                <span className="meta-item">
                  <span className="meta-label">
                    <ModernIcon name="calendar" size={14} />
                    {t('created')}:
                  </span>
                  <span className="meta-value">{new Date(scenario.created_at).toLocaleDateString()}</span>
                </span>
                {scenario.updated_at && scenario.updated_at !== scenario.created_at && (
                  <span className="meta-item">
                    <span className="meta-label">
                      <ModernIcon name="refresh" size={14} />
                      {t('updated')}:
                    </span>
                    <span className="meta-value">{new Date(scenario.updated_at).toLocaleDateString()}</span>
                  </span>
                )}
                <span className="meta-item">
                  <span className="meta-label">
                    <ModernIcon name="clipboardCheck" size={14} />
                    {t('status')}:
                  </span>
                  <span className="meta-value" style={{ 
                    color: scenario.updated_at && scenario.updated_at !== scenario.created_at ? 'var(--accent-success)' : 'var(--text-tertiary)',
                    fontWeight: '500'
                  }}>
                    {scenario.updated_at && scenario.updated_at !== scenario.created_at ? t('editableWithData') : t('new')}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Scenario Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={handleCreateModalClose}
        onConfirm={handleCreateScenario}
        confirmDisabled={!newScenarioName.trim()}
        title={t('createScenario')}
        confirmText={t('createScenario')}
        cancelText={t('cancel')}
        type="info"
        showIcon={true}
      >
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          if (newScenarioName.trim()) {
            handleCreateScenario();
          }
        }}>
          <div className="form-group">
            <label>{t('scenarioName')}</label>
            <input
              type="text"
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              required
              placeholder={t('scenarioNamePlaceholder')}
              className="form-input"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t('moduleType')}</label>
            <select 
              value={newScenarioType} 
              onChange={(e) => setNewScenarioType(e.target.value)}
              className="form-select"
            >
              <option value="milk_sale">{t('moduleTypes.milk_sale')}</option>
              <option value="transformation">{t('moduleTypes.transformation')}</option>
              <option value="lactation">{t('moduleTypes.lactation')}</option>
              <option value="yield">{t('moduleTypes.yield')}</option>
              <option value="gestation">{t('moduleTypes.gestation')}</option>
              <option value="kid_rearing">{t('moduleTypes.kid_rearing')}</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={t('deleteScenario')}
        message={
          <>
            <strong>{t('deleteConfirm')}</strong>
            {deleteModal.scenarioName && (
              <span style={{ display: 'block', marginTop: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>
                "{deleteModal.scenarioName}"
              </span>
            )}
            <span style={{ display: 'block', marginTop: '12px', fontSize: '14px', color: 'var(--text-tertiary)' }}>
              {t('deleteConfirmMessage')}
            </span>
          </>
        }
        confirmText={t('delete')}
        cancelText={t('cancel')}
        type="danger"
      />
    </div>
  );
}

export default Dashboard;

