import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import CostCalculatorModal from '../CostCalculatorModal';
import { useChartColors } from '../../hooks/useDarkMode';
import { formatCurrency, formatCurrencyCompact, normalizeCurrency } from '../../utils/currency';

function Module1Production({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;
  const chartColors = useChartColors();
  const preferredCurrency = normalizeCurrency(user?.preferred_currency);
  const formatMoney = (value, options = {}) => formatCurrency(value, preferredCurrency, options);
  const formatMoneyCompact = (value) => formatCurrencyCompact(value, preferredCurrency);

  const [formData, setFormData] = useState({
    daily_production_liters: '',
    production_days: '',
    animals_count: '',
    feed_cost_per_liter: '',
    labor_cost_per_liter: '',
    health_cost_per_liter: '',
    infrastructure_cost_per_liter: '',
    other_costs_per_liter: '',
    milk_price_per_liter: '',
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [viewPeriod, setViewPeriod] = useState('lactation'); // 'daily', 'monthly', 'lactation'
  const [marginViewMode, setMarginViewMode] = useState('dollars'); // 'dollars' or 'percent' for charts

  // Module 4: Cost Calculator Modal State
  const [costCalculatorModal, setCostCalculatorModal] = useState({
    isOpen: false,
    calculatorType: null, // 'feed', 'labor', 'health', 'services', 'rearing'
    targetField: null // which formData field to update
  });

  useEffect(() => {
    const initialize = async () => {
      await loadScenarios();
      if (scenarioId) {
        await loadScenario(scenarioId);
      }
    };
    initialize();
  }, [scenarioId]);

  const loadScenarios = async () => {
    try {
      // Load all scenarios so that production data (Module 1) can be edited
      // for any scenario type (e.g., milk_sale, transformation, etc.).
      // This allows Module 2 (Transformation) to inherit production data
      // from the same scenario.
      const response = await api.get('/scenarios');
      setScenarios(response.data);
      if (scenarioId) {
        const scenario = response.data.find(s => s.id === parseInt(scenarioId));
        setSelectedScenario(scenario);
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const loadScenario = async (id) => {
    try {
      const response = await api.get(`/scenarios/${id}`);
      const scenario = response.data;
      setSelectedScenario(scenario);
      if (scenario.productionData) {
        // Convert numeric values to strings for input fields (empty string if 0 or null)
        const normalizedData = {};
        Object.keys(scenario.productionData).forEach(key => {
          const value = scenario.productionData[key];
          if (value === null || value === undefined || value === '') {
            normalizedData[key] = '';
          } else if (typeof value === 'number') {
            normalizedData[key] = value === 0 ? '' : value.toString();
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) || numValue === 0 ? '' : value;
          } else {
            normalizedData[key] = '';
          }
        });
        setFormData(normalizedData);
      }
      if (scenario.results) {
        // Normalize all numeric values in results to ensure they are numbers
        const normalizedResults = {};
        Object.keys(scenario.results).forEach(key => {
          const value = scenario.results[key];
          if (typeof value === 'number') {
            normalizedResults[key] = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedResults[key] = isNaN(numValue) ? 0 : numValue;
          } else {
            normalizedResults[key] = value;
          }
        });
        setResults(normalizedResults);
        // Show notification that results were auto-loaded
        if (normalizedResults.total_revenue || normalizedResults.gross_margin) {
          // Silently load results - user will see them in the UI
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Allow empty string, keep as string in state
    // Only update if the value is a valid number or empty
    if (value === '' || value === null || value === undefined) {
      setFormData(prev => ({
        ...prev,
        [name]: '',
      }));
      return;
    }

    // Allow valid numeric input (including decimals and negative numbers if needed)
    // Keep as string to allow free typing
    const validNumberPattern = /^-?\d*\.?\d*$/;
    if (validNumberPattern.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleInputFocus = (e) => {
    // Only select all text if field has a value, otherwise allow typing from scratch
    if (e.target.value && e.target.value !== '') {
      e.target.select();
    }
  };

  // Module 4: Open Cost Calculator Modal
  const openCostCalculator = (calculatorType, targetField) => {
    setCostCalculatorModal({
      isOpen: true,
      calculatorType,
      targetField
    });
  };

  // Module 4: Apply Calculated Cost to Form
  const applyCostToForm = (calculatedCost) => {
    if (costCalculatorModal.targetField) {
      setFormData(prev => ({
        ...prev,
        [costCalculatorModal.targetField]: calculatedCost.toFixed(4)
      }));

      setAlertModal({
        isOpen: true,
        message: `${t('costEstimator')}: ${t('estimatedCost')} ${formatMoney(calculatedCost, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${t('perLiter')} ${t('applyToModule1')} âœ“`,
        type: 'success'
      });
    }
  };

  const handleSave = async () => {
    if (!selectedScenario) {
      setAlertModal({
        isOpen: true,
        message: t('pleaseSelectScenario'),
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      // Convert string values to numbers before sending to API
      // Validate and clamp values to prevent overflow (DECIMAL(10,2) max: 99999999.99)
      const MAX_DECIMAL_VALUE = 99999999.99;
      const MIN_DECIMAL_VALUE = -99999999.99;

      const dataToSave = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value === '' || value === null || value === undefined) {
          dataToSave[key] = 0;
        } else {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || !isFinite(numValue)) {
            dataToSave[key] = 0;
          } else {
            // Clamp value to valid DECIMAL(10,2) range
            dataToSave[key] = Math.max(MIN_DECIMAL_VALUE, Math.min(MAX_DECIMAL_VALUE, numValue));
          }
        }
      });

      // For INTEGER fields, ensure they are integers and within valid range
      if (dataToSave.production_days !== undefined) {
        dataToSave.production_days = Math.max(0, Math.min(2147483647, Math.round(dataToSave.production_days)));
      }
      if (dataToSave.animals_count !== undefined) {
        dataToSave.animals_count = Math.max(0, Math.min(2147483647, Math.round(dataToSave.animals_count)));
      }

      await api.post(`/modules/production/${selectedScenario.id}`, dataToSave);
      await loadScenario(selectedScenario.id);
      // Trigger calculation after save
      handleCalculate();
      setAlertModal({
        isOpen: true,
        message: t('dataSavedAndCalculated'),
        type: 'success'
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    // Convert string values to numbers for calculations
    const dailyProduction = parseFloat(formData.daily_production_liters) || 0;
    const productionDays = parseFloat(formData.production_days) || 0;
    const animalsCount = parseFloat(formData.animals_count) || 0;
    const feedCost = parseFloat(formData.feed_cost_per_liter) || 0;
    const laborCost = parseFloat(formData.labor_cost_per_liter) || 0;
    const healthCost = parseFloat(formData.health_cost_per_liter) || 0;
    const infrastructureCost = parseFloat(formData.infrastructure_cost_per_liter) || 0;
    const otherCost = parseFloat(formData.other_costs_per_liter) || 0;
    const milkPrice = parseFloat(formData.milk_price_per_liter) || 0;

    const totalLiters = dailyProduction * productionDays * animalsCount;
    const costPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;
    const totalCosts = costPerLiter * totalLiters;
    const totalRevenue = milkPrice * totalLiters;
    const grossMargin = totalRevenue - totalCosts;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    setResults({
      total_production_liters: totalLiters,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      gross_margin: grossMargin,
      margin_percentage: marginPercentage,
      revenue_per_liter: milkPrice,
      cost_per_liter: costPerLiter,
      // Store base values for period calculations
      daily_production: dailyProduction * animalsCount,
      production_days: productionDays,
    });
  };

  // Calculate values based on selected period
  const getDisplayValues = () => {
    if (!results) return null;

    const dailyProduction = results.daily_production || 0;
    const productionDays = results.production_days || 1;

    switch (viewPeriod) {
      case 'daily':
        return {
          production: dailyProduction,
          revenue: (results.total_revenue / productionDays) || 0,
          costs: (results.total_costs / productionDays) || 0,
          margin: (results.gross_margin / productionDays) || 0,
          label: t('daily')
        };
      case 'monthly':
        const daysInMonth = 30;
        return {
          production: dailyProduction * daysInMonth,
          revenue: (results.total_revenue / productionDays) * daysInMonth || 0,
          costs: (results.total_costs / productionDays) * daysInMonth || 0,
          margin: (results.gross_margin / productionDays) * daysInMonth || 0,
          label: t('monthly')
        };
      case 'lactation':
      default:
        return {
          production: results.total_production_liters,
          revenue: results.total_revenue,
          costs: results.total_costs,
          margin: results.gross_margin,
          label: t('perLactation')
        };
    }
  };

  const chartData = results ? [
    { name: t('income'), value: Number(results.total_revenue) || 0 },
    { name: t('totalCosts'), value: Number(results.total_costs) || 0 },
    { name: t('margin'), value: Number(results.gross_margin) || 0 },
  ].filter(item => !isNaN(item.value)) : [];

  const costBreakdown = formData ? [
    { name: t('feed'), value: Number(formData.feed_cost_per_liter) || 0 },
    { name: t('labor'), value: Number(formData.labor_cost_per_liter) || 0 },
    { name: t('health'), value: Number(formData.health_cost_per_liter) || 0 },
    { name: t('infrastructure'), value: Number(formData.infrastructure_cost_per_liter) || 0 },
    { name: t('other'), value: Number(formData.other_costs_per_liter) || 0 },
  ].filter(item => !isNaN(item.value)) : [];

  const isProUser = ['pro', 'admin'].includes(user?.role);
  const hasAdvancedAnalysis = isProUser || (user?.features || []).includes('advanced_calculations');
  const infoIcon = '\u2139';
  const lockIcon = '\u{1F512}';
  const labelWithHelp = (label, tooltipText, isLocked = false) => (
    <span className="field-label-with-help">
      <span>{label}</span>
      {tooltipText && (
        <span className="term-help-icon" title={tooltipText} aria-label={tooltipText}>
          {infoIcon}
        </span>
      )}
      {isLocked && (
        <span className="lock-indicator" title={t('availableForProUsers')} aria-label={t('availableForProUsers')}>
          {lockIcon}
        </span>
      )}
    </span>
  );

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginTop: '20px' }}>{t('module1Title')}</h1>
        <div style={{
          marginTop: '16px',
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderRadius: '12px',
          borderLeft: '4px solid #2d5016',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: '#1565c0' }}>
            {t('module1Explanation')}
          </p>
        </div>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module1`, { state: { scenarioId: id }, replace: true });
              loadScenario(id);
            }
          }}
          style={{ marginBottom: '20px' }}
        >
          <option value="">{t('selectScenarioPlaceholder')}</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          <div className="card">
            <h2>{t('productionData')}</h2>
            <div className="pedagogy-block">
              <p className="pedagogy-title">{t('dashboardDescription')}</p>
              <ul className="pedagogy-list">
                <li>{`${t('totalProduction')} = ${t('dailyProduction')} x ${t('productionDays')} x ${t('animalsCount')}`}</li>
                <li>{`${t('totalCosts')} = ${t('costPerLiter')} x ${t('totalProduction')}`}</li>
                <li>{`${t('grossMargin')} = ${t('totalRevenue')} - ${t('totalCosts')}`}</li>
              </ul>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{labelWithHelp(t('dailyProduction'), `${t('dailyProduction')} x ${t('animalsCount')} x ${t('productionDays')} = ${t('totalProduction')}`)}</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={formData.daily_production_liters}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('productionDays'), `${t('productionDays')} (${t('perLactation')})`)}</label>
                <input
                  type="number"
                  name="production_days"
                  value={formData.production_days}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('animalsCount'), `${t('animalsCount')} (${t('lactationCycle')})`)}</label>
                <input
                  type="number"
                  name="animals_count"
                  value={formData.animals_count}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('milkPrice'), `${t('milkPrice')} (${t('revenuePerLiter')})`)}</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={formData.milk_price_per_liter}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('totalCosts')} (per liter)</h3>
            {!hasAdvancedAnalysis && (
              <div className="upgrade-info-block">
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  <span className="term-help-icon" aria-hidden="true">{infoIcon}</span>
                  {t('module1BasicAnalysisMessage')}
                </p>
                <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={() => navigate('/profile')}>
                  {t('unlockFullAnalysis')}
                </button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{labelWithHelp(t('feedCost'), `${t('feedCost')} (${t('perLiter')})`)}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="feed_cost_per_liter"
                    value={formData.feed_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => openCostCalculator('feed', 'feed_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className={`form-group ${!hasAdvancedAnalysis ? 'locked-field-group' : ''}`}>
                <label>{labelWithHelp(t('laborCost'), `${t('laborCost')} (${t('perLiter')})`, !hasAdvancedAnalysis)}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="labor_cost_per_liter"
                    value={formData.labor_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    disabled={!hasAdvancedAnalysis}
                    title={!hasAdvancedAnalysis ? t('availableForProUsers') : ''}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => openCostCalculator('labor', 'labor_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                    disabled={!hasAdvancedAnalysis}
                  >
                    {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('healthCost'), `${t('healthCost')} (${t('perLiter')})`)}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="health_cost_per_liter"
                    value={formData.health_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => openCostCalculator('health', 'health_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                  >
                    {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className={`form-group ${!hasAdvancedAnalysis ? 'locked-field-group' : ''}`}>
                <label>{labelWithHelp(t('infrastructureCost'), `${t('infrastructureCost')} (${t('perLiter')})`, !hasAdvancedAnalysis)}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="infrastructure_cost_per_liter"
                    value={formData.infrastructure_cost_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    disabled={!hasAdvancedAnalysis}
                    title={!hasAdvancedAnalysis ? t('availableForProUsers') : ''}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => openCostCalculator('services', 'infrastructure_cost_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                    disabled={!hasAdvancedAnalysis}
                  >
                    {t('estimateCost')}
                  </button>
                </div>
              </div>
              <div className={`form-group ${!hasAdvancedAnalysis ? 'locked-field-group' : ''}`}>
                <label>{labelWithHelp(t('otherCosts'), `${t('otherCosts')} (${t('perLiter')})`, !hasAdvancedAnalysis)}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    name="other_costs_per_liter"
                    value={formData.other_costs_per_liter}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    step="0.01"
                    disabled={!hasAdvancedAnalysis}
                    title={!hasAdvancedAnalysis ? t('availableForProUsers') : ''}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => openCostCalculator('rearing', 'other_costs_per_liter')}
                    style={{ padding: '8px 12px', fontSize: '0.85em', whiteSpace: 'nowrap' }}
                    title={t('estimateCost')}
                    disabled={!hasAdvancedAnalysis}
                  >
                    {t('estimateCost')}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={handleCalculate} style={{ marginRight: '10px' }}>
                {t('calculate')}
              </button>
              <button className="btn btn-secondary" onClick={handleSave} disabled={loading}>
                {loading ? t('saving') : t('saveAndCalculate')}
              </button>
            </div>
          </div>

          {results && (
            <>
              {/* Key Metrics Cards */}
              <div className="metrics-grid">
                <div className={`metric-card ${results.gross_margin >= 0 ? 'success' : 'error'}`}>
                  <div className="metric-label">{t('totalRevenue')}</div>
                  <div className="metric-value numeric-value">
                    {formatMoney(results.total_revenue)}
                  </div>
                </div>
                <div className="metric-card warning">
                  <div className="metric-label">{t('totalCosts')}</div>
                  <div className="metric-value numeric-value">
                    {formatMoney(results.total_costs)}
                  </div>
                </div>
                <div className={`metric-card ${results.gross_margin >= 0 ? 'success' : 'error'}`}>
                  <div className="metric-label">{t('grossMargin')}</div>
                  <div className={`metric-value numeric-value ${results.gross_margin >= 0 ? 'success' : 'error'}`}>
                    {formatMoney(results.gross_margin)}
                  </div>
                  <div className={`metric-change ${results.margin_percentage >= 0 ? 'positive' : 'negative'}`}>
                    {results.margin_percentage >= 0 ? '+' : ''}{results.margin_percentage?.toFixed(2)}%
                  </div>
                </div>
                <div className="metric-card info">
                  <div className="metric-label">{t('totalProduction')}</div>
                  <div className="metric-value numeric-value">
                    {Number(results.total_production_liters || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                  </div>
                </div>
              </div>

              {/* Results Table Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      {t('results')}
                    </h2>
                    <p className="chart-subtitle">{t('dashboardDescription')}</p>
                  </div>
                  <div className="chart-controls">
                    {selectedScenario?.results && (
                      <span className="chart-badge success">{t('autoLoaded')}</span>
                    )}
                    <div className="chart-control-group">
                      <label className="chart-control-label">{t('viewPeriod')}:</label>
                      <select
                        className="chart-control-select"
                        value={viewPeriod}
                        onChange={(e) => setViewPeriod(e.target.value)}
                      >
                        <option value="daily">{t('daily')}</option>
                        <option value="monthly">{t('monthly')}</option>
                        <option value="lactation">{t('perLactation')}</option>
                      </select>
                    </div>
                  </div>
                </div>
                {(() => {
                  const displayValues = getDisplayValues();
                  return (
                    <div className="chart-container">
                      <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="table numeric-table" style={{ minWidth: '400px' }}>
                          <tbody>
                            <tr>
                              <td><strong>{t('totalProduction')}</strong></td>
                              <td>{displayValues.production?.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalRevenue')}</strong></td>
                              <td>{formatMoney(displayValues.revenue)}</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalCosts')}</strong></td>
                              <td>{formatMoney(displayValues.costs)}</td>
                            </tr>
                            <tr>
                              <td><strong>{t('grossMargin')}</strong></td>
                              <td style={{ color: displayValues.margin >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                                {formatMoney(displayValues.margin)}
                              </td>
                            </tr>
                            <tr>
                              <td><strong>{labelWithHelp(t('marginPercentage'), `${t('marginPercentage')} = (${t('grossMargin')} / ${t('totalRevenue')}) x 100`)}</strong></td>
                              <td>{typeof results.margin_percentage === 'number' ? results.margin_percentage.toFixed(2) : '0.00'}%</td>
                            </tr>
                            <tr>
                              <td><strong>{t('revenuePerLiter')}</strong></td>
                              <td>{formatMoney(results.revenue_per_liter)}</td>
                            </tr>
                            <tr>
                              <td><strong>{labelWithHelp(t('costPerLiter'), `${t('costPerLiter')} = ${t('feedCost')} + ${t('laborCost')} + ${t('healthCost')} + ${t('infrastructureCost')} + ${t('otherCosts')}`)}</strong></td>
                              <td>{formatMoney(results.cost_per_liter)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Financial Charts Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      <span className="chart-title-icon">ðŸ“ˆ</span>
                      {t('visualization')}
                    </h2>
                    <p className="chart-subtitle">{t('financialOverview')}</p>
                  </div>
                  <div className="chart-controls">
                    <div className="chart-control-group">
                      <label className="chart-control-label">{t('marginViewMode')}:</label>
                      <select
                        className="chart-control-select"
                        value={marginViewMode}
                        onChange={(e) => setMarginViewMode(e.target.value)}
                      >
                        <option value="dollars">{t('viewInDollars')}</option>
                        <option value="percent">{t('viewInPercent')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="chart-container">
                  <h3 className="chart-section-title">{t('income')} vs {t('totalCosts')} vs {t('grossMargin')}</h3>
                  {chartData.length > 0 ? (() => {
                    const displayChartData = marginViewMode === 'percent' ? chartData.map(item => {
                      const costs = item.name === t('totalCosts') ? Number(item.value) : 0;
                      const margin = item.name === t('margin') ? Number(item.value) : 0;
                      const totalRevenue = results?.total_revenue || 1;
                      return {
                        ...item,
                        value: totalRevenue > 0
                          ? (item.name === t('income') ? 100 : item.name === t('totalCosts') ? (costs / totalRevenue) * 100 : (margin / totalRevenue) * 100)
                          : 0
                      };
                    }) : chartData;

                    // Create enhanced chart data with semantic colors
                    const enhancedChartData = displayChartData.map(item => ({
                      ...item,
                      fill: item.name === t('income') ? chartColors.revenue :
                        item.name === t('totalCosts') ? chartColors.costs :
                          chartColors.margin
                    }));

                    return (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={enhancedChartData} barCategoryGap="20%">
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartColors.revenue} stopOpacity={1} />
                              <stop offset="100%" stopColor={chartColors.revenue} stopOpacity={0.7} />
                            </linearGradient>
                            <linearGradient id="costsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartColors.costs} stopOpacity={1} />
                              <stop offset="100%" stopColor={chartColors.costs} stopOpacity={0.7} />
                            </linearGradient>
                            <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartColors.margin} stopOpacity={1} />
                              <stop offset="100%" stopColor={chartColors.margin} stopOpacity={0.7} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 12, fontWeight: 500 }}
                            axisLine={{ stroke: chartColors.grid }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => marginViewMode === 'percent' ? `${value}%` : formatMoneyCompact(value)}
                          />
                          <Tooltip
                            formatter={(value) =>
                              marginViewMode === 'percent'
                                ? `${Number(value || 0).toFixed(1)}%`
                                : formatMoney(value)
                            }
                            contentStyle={{
                              backgroundColor: chartColors.tooltip.bg,
                              border: `1px solid ${chartColors.tooltip.border}`,
                              borderRadius: '12px',
                              boxShadow: chartColors.tooltip.shadow,
                              padding: '12px 16px'
                            }}
                            labelStyle={{ color: chartColors.text.primary, fontWeight: 600, marginBottom: '4px' }}
                            itemStyle={{ color: chartColors.text.secondary }}
                            cursor={{ fill: chartColors.background.hover }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="roundRect"
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            fill={chartColors.primary}
                          >
                            {enhancedChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <div className="chart-empty">
                      <p className="chart-empty-text">{t('noDataToShow')}</p>
                    </div>
                  )}
                </div>

                <div className="chart-container" style={{ marginTop: '24px' }}>
                  <h3 className="chart-section-title">{t('costBreakdown')}</h3>
                  {costBreakdown.length > 0 && costBreakdown.some(item => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={costBreakdown} barCategoryGap="15%">
                        <defs>
                          <linearGradient id="costBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColors.secondary} stopOpacity={1} />
                            <stop offset="100%" stopColor={chartColors.secondary} stopOpacity={0.7} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke={chartColors.axis.tick}
                          tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                          axisLine={{ stroke: chartColors.grid }}
                          tickLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          stroke={chartColors.axis.tick}
                          tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => formatMoney(value)}
                        />
                        <Tooltip
                          formatter={(value) => `${formatMoney(value, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / L`}
                          contentStyle={{
                            backgroundColor: chartColors.tooltip.bg,
                            border: `1px solid ${chartColors.tooltip.border}`,
                            borderRadius: '12px',
                            boxShadow: chartColors.tooltip.shadow,
                            padding: '12px 16px'
                          }}
                          labelStyle={{ color: chartColors.text.primary, fontWeight: 600, marginBottom: '4px' }}
                          itemStyle={{ color: chartColors.text.secondary }}
                          cursor={{ fill: chartColors.background.hover }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="roundRect"
                        />
                        <Bar
                          dataKey="value"
                          fill="url(#costBarGradient)"
                          radius={[8, 8, 0, 0]}
                        >
                          {costBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">
                      <div className="chart-empty-icon">ðŸ’°</div>
                      <p className="chart-empty-text">{t('noCostDataToShow')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Integrated Dashboard - Comparison View */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      {t('integratedDashboard')}
                    </h2>
                    <p className="chart-subtitle">{t('dashboardDescription')}</p>
                  </div>
                </div>

                <div className="charts-comparison-grid">
                  {/* Income/Costs/Margin Chart */}
                  <div className="chart-container">
                    <h3 className="chart-section-title">{t('financialOverview')}</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value) => formatMoney(value)}
                            contentStyle={{
                              backgroundColor: chartColors.tooltip.bg,
                              border: `1px solid ${chartColors.tooltip.border}`,
                              borderRadius: '12px',
                              boxShadow: chartColors.tooltip.shadow
                            }}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.name === t('income') ? chartColors.revenue :
                                  entry.name === t('totalCosts') ? chartColors.costs :
                                    chartColors.margin}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>

                  {/* Cost Breakdown Chart */}
                  <div className="chart-container">
                    <h3 className="chart-section-title">{t('costBreakdown')}</h3>
                    {costBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={costBreakdown} barCategoryGap="15%">
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 10 }}
                            tickLine={false}
                            interval={0}
                          />
                          <YAxis
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value) => formatMoney(value, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                            contentStyle={{
                              backgroundColor: chartColors.tooltip.bg,
                              border: `1px solid ${chartColors.tooltip.border}`,
                              borderRadius: '12px',
                              boxShadow: chartColors.tooltip.shadow
                            }}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {costBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.type === 'success' ? t('success') : alertModal.type === 'error' ? t('error') : t('information')}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Module 4: Cost Calculator Modal */}
      <CostCalculatorModal
        isOpen={costCalculatorModal.isOpen}
        onClose={() => setCostCalculatorModal({ isOpen: false, calculatorType: null, targetField: null })}
        calculatorType={costCalculatorModal.calculatorType}
        onApply={applyCostToForm}
        currentAnimals={parseFloat(formData.animals_count) || 1}
        currentDailyProduction={parseFloat(formData.daily_production_liters) || 1}
        preferredCurrency={preferredCurrency}
      />
    </div>
  );
}

export default Module1Production;
