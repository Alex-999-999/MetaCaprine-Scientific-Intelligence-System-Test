import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import { useChartColors } from '../../hooks/useDarkMode';
import { m4Fmt, m4Round } from '../../utils/m4Format';
import ModernIcon from '../icons/ModernIcon';

function Module4Yield({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;
  const chartColors = useChartColors();

  const [productionData, setProductionData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
  });

  const [yieldData, setYieldData] = useState({
    conversion_rate: 0,
    efficiency_percentage: 0,
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [chartViewType, setChartViewType] = useState('bars'); // 'bars', 'pie', 'scale'

  useEffect(() => {
    loadScenarios();
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  }, [scenarioId]);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      const allScenarios = response.data || [];
      setScenarios(allScenarios);
      if (scenarioId) {
        const scenario = allScenarios.find(s => s.id === parseInt(scenarioId, 10));
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
        // Normalize all numeric values to ensure no leading zeros
        const normalizedData = {};
        Object.keys(scenario.productionData).forEach(key => {
          const value = scenario.productionData[key];
          if (typeof value === 'number') {
            normalizedData[key] = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) ? 0 : numValue;
          } else {
            normalizedData[key] = value;
          }
        });
        setProductionData(normalizedData);
      }
      if (scenario.yieldData) {
        setYieldData(scenario.yieldData);
      }
      if (scenario.results) {
        setResults(scenario.results);
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleProductionChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setProductionData(prev => ({
        ...prev,
        [name]: 0,
      }));
      return;
    }
    
    // Get the raw input value as string
    let stringValue = value.toString();
    
    // Remove leading zeros that appear before non-zero digits
    // Pattern: one or more zeros at the start, followed by a digit 1-9 (not 0, not decimal point)
    // This will convert "01234" -> "1234", "056" -> "56", "012" -> "12"
    // But will preserve "0", "0.5", "0.123" (since they have decimal point after the zero)
    if (stringValue.length > 1 && stringValue[0] === '0' && stringValue[1] !== '.' && stringValue[1] !== ',') {
      // Remove all leading zeros
      stringValue = stringValue.replace(/^0+/, '');
      // If we removed everything, set back to '0'
      if (stringValue === '') {
        stringValue = '0';
      }
    }
    
    // Parse the cleaned value to a number
    const numValue = parseFloat(stringValue);
    if (isNaN(numValue)) {
      setProductionData((prev) => ({ ...prev, [name]: 0 }));
      return;
    }
    const nextVal =
      name === 'production_days' || name === 'animals_count' ? Math.round(numValue) : m4Round(numValue, 2);
    setProductionData((prev) => ({ ...prev, [name]: nextVal }));
  };

  const handleInputFocus = (e) => {
    // Always select all text when focused for easy replacement
    e.target.select();
  };

  const handleYieldChange = (e) => {
    const { name, value } = e.target;
    
    // Handle empty string
    if (value === '' || value === null || value === undefined) {
      setYieldData(prev => ({
        ...prev,
        [name]: 0,
      }));
      return;
    }
    
    // Get the raw input value as string
    let stringValue = value.toString();
    
    // Remove leading zeros that appear before non-zero digits
    // Pattern: one or more zeros at the start, followed by a digit 1-9 (not 0, not decimal point)
    // This will convert "01234" -> "1234", "056" -> "56", "012" -> "12"
    // But will preserve "0", "0.5", "0.123" (since they have decimal point after the zero)
    if (stringValue.length > 1 && stringValue[0] === '0' && stringValue[1] !== '.' && stringValue[1] !== ',') {
      // Remove all leading zeros
      stringValue = stringValue.replace(/^0+/, '');
      // If we removed everything, set back to '0'
      if (stringValue === '') {
        stringValue = '0';
      }
    }
    
    // Parse the cleaned value to a number
    const numValue = parseFloat(stringValue);
    const nextVal = isNaN(numValue) ? 0 : m4Round(numValue, 2);
    setYieldData((prev) => ({
      ...prev,
      [name]: nextVal,
    }));
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
      await api.post(`/modules/production/${selectedScenario.id}`, productionData);
      await api.post(`/modules/yield/${selectedScenario.id}`, yieldData);
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
    const dailyProduction = Number(productionData.daily_production_liters) || 0;
    const productionDays = Number(productionData.production_days) || 0;
    const animalsCount = Number(productionData.animals_count) || 0;
    const efficiency = Number(yieldData.efficiency_percentage) || 0;
    const conversionRate = Number(yieldData.conversion_rate) || 0;
    
    const totalLiters = dailyProduction * productionDays * animalsCount;
    const effectiveLiters = totalLiters * (efficiency / 100);
    const convertedProduct = effectiveLiters * conversionRate;
    const wasteLiters = totalLiters - effectiveLiters;

    setResults({
      totalLiters,
      effectiveLiters,
      convertedProduct,
      conversionRate,
      efficiencyPercentage: efficiency,
      wasteLiters,
    });
  };

  const conversionData = results ? [
    { name: t('totalLiters'), value: Number(results.totalLiters || 0) },
    { name: t('effectiveLiters'), value: Number(results.effectiveLiters || 0) },
    { name: t('convertedProduct'), value: Number(results.convertedProduct || 0) },
    { name: t('wasteLiters'), value: Number(results.wasteLiters || 0) },
  ].filter(item => !isNaN(item.value)) : [];

  const efficiencyData = results ? [
    { name: t('efficiencyPercentage'), value: Number(results.efficiencyPercentage || 0) },
    { name: t('conversionRate'), value: Number(results.conversionRate || 0) * 100 },
  ].filter(item => !isNaN(item.value)) : [];

  return (
    <div className="container module-compact">
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginTop: '20px' }}>{t('module4Title')}</h1>
        <div className="pedagogy-block module4-pedagogy-block" style={{ marginTop: '12px' }}>
          <p className="pedagogy-title">{t('module4PedagogyTitle')}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {t('module4PedagogyIntro')}
          </p>
          <ul className="pedagogy-list">
            <li>{t('module4FormulaTotalLiters')}</li>
            <li>{t('module4FormulaEffectiveLiters')}</li>
            <li>{t('module4FormulaConvertedProduct')}</li>
          </ul>
        </div>
      </header>

      <div className="card">
        <h2>{t('selectScenario')}</h2>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module4`, { state: { scenarioId: id }, replace: true });
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
            <h2>{t('baseProductionData')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('dailyProduction')}</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={productionData.daily_production_liters}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
                <p className="input-hint">{t('module4HintDailyProduction')}</p>
              </div>
              <div className="form-group">
                <label>{t('productionDays')}</label>
                <input
                  type="number"
                  name="production_days"
                  value={productionData.production_days}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                />
                <p className="input-hint">{t('module4HintProductionDays')}</p>
              </div>
              <div className="form-group">
                <label>{t('animalsCount')}</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                />
                <p className="input-hint">{t('module4HintAnimalsCount')}</p>
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>{t('yieldData')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{t('conversionRateDescription')}</label>
                <input
                  type="number"
                  name="conversion_rate"
                  value={yieldData.conversion_rate}
                  onChange={handleYieldChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                  placeholder={t('conversionRate')}
                />
                <p className="input-hint">{t('module4HintConversionRate')}</p>
              </div>
              <div className="form-group">
                <label>{t('efficiencyPercentage')}</label>
                <input
                  type="number"
                  name="efficiency_percentage"
                  value={yieldData.efficiency_percentage}
                  onChange={handleYieldChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                  min="0"
                  max="100"
                />
                <p className="input-hint">{t('module4HintEfficiency')}</p>
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
                <div className="metric-card info">
                  <div className="metric-label">{t('totalLiters')}</div>
                  <div className="metric-value">
                    {m4Fmt(Number(results.totalLiters || 0), 2)} L
                  </div>
                </div>
                <div className="metric-card success">
                  <div className="metric-label">{t('effectiveLiters')}</div>
                  <div className="metric-value success">
                    {m4Fmt(Number(results.effectiveLiters || 0), 2)} L
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">{t('convertedProduct')}</div>
                  <div className="metric-value">
                    {m4Fmt(Number(results.convertedProduct || 0), 2)}
                  </div>
                </div>
                <div className={`metric-card ${results.efficiencyPercentage >= 90 ? 'success' : results.efficiencyPercentage >= 70 ? 'warning' : 'error'}`}>
                  <div className="metric-label">{t('efficiencyPercentage')}</div>
                  <div className={`metric-value ${results.efficiencyPercentage >= 90 ? 'success' : results.efficiencyPercentage >= 70 ? '' : 'error'}`}>
                    {m4Fmt(Number(results.efficiencyPercentage || 0), 2)}%
                  </div>
                </div>
              </div>

              <div className="pedagogy-block results-insight-block">
                <p className="pedagogy-title">{t('module4InterpretationTitle')}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {(Number(results.efficiencyPercentage || 0) >= 90)
                    ? t('module4InterpretationHigh')
                    : (Number(results.efficiencyPercentage || 0) >= 70)
                      ? t('module4InterpretationMedium')
                      : t('module4InterpretationLow')}
                </p>
              </div>

              {/* Results Table Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      <span className="chart-title-icon">
                        <ModernIcon name="fileText" size={18} />
                      </span>
                      {t('results')}
                    </h2>
                    <p className="chart-subtitle">{t('yieldResultsSubtitle')}</p>
                  </div>
                </div>
                <div className="chart-container">
                  <table className="table">
                    <tbody>
                      <tr>
                        <td><strong>{t('totalLiters')}</strong></td>
                        <td>{m4Fmt(Number(results.totalLiters || 0), 2)} L</td>
                      </tr>
                      <tr>
                        <td><strong>{t('effectiveLiters')}</strong></td>
                        <td style={{ color: '#16a34a', fontWeight: '600' }}>{m4Fmt(Number(results.effectiveLiters || 0), 2)} L</td>
                      </tr>
                      <tr>
                        <td><strong>{t('convertedProduct')}</strong></td>
                        <td>{m4Fmt(Number(results.convertedProduct || 0), 2)} {t('units')}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('conversionRate')}</strong></td>
                        <td>{m4Fmt(Number(results.conversionRate || 0), 2)}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('efficiencyPercentage')}</strong></td>
                        <td style={{ color: results.efficiencyPercentage >= 90 ? '#16a34a' : results.efficiencyPercentage >= 70 ? '#ca8a04' : '#dc2626', fontWeight: '600' }}>
                          {m4Fmt(Number(results.efficiencyPercentage || 0), 2)}%
                        </td>
                      </tr>
                      <tr>
                        <td><strong>{t('wasteLiters')}</strong></td>
                        <td style={{ color: '#dc2626' }}>{m4Fmt(Number(results.wasteLiters || 0), 2)} L</td>
                      </tr>
                      <tr>
                        <td><strong>{t('wastePercentage')}</strong></td>
                        <td style={{ color: '#dc2626' }}>
                          {Number(results.totalLiters || 0) > 0 ? m4Fmt((Number(results.wasteLiters || 0) / Number(results.totalLiters || 0)) * 100, 2) : m4Fmt(0, 2)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Charts Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      <span className="chart-title-icon">
                        <ModernIcon name="chartBar" size={18} />
                      </span>
                      {t('visualization')}
                    </h2>
                    <p className="chart-subtitle">{t('yieldVisualSubtitle')}</p>
                  </div>
                  <div className="chart-controls">
                    <div className="chart-view-toggle">
                      <button
                        className={`chart-view-btn ${chartViewType === 'bars' ? 'active' : ''}`}
                        onClick={() => setChartViewType('bars')}
                      >
                        {t('chartViewBars')}
                      </button>
                      <button
                        className={`chart-view-btn ${chartViewType === 'pie' ? 'active' : ''}`}
                        onClick={() => setChartViewType('pie')}
                      >
                        {t('chartViewPie')}
                      </button>
                      <button
                        className={`chart-view-btn ${chartViewType === 'scale' ? 'active' : ''}`}
                        onClick={() => setChartViewType('scale')}
                      >
                        {t('chartViewScale')}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="chart-container">
                  <h3 className="chart-section-title">{t('milkToProductConversion')}</h3>
                  {(() => {
                    const utilizationPieData = [
                      { name: t('effectiveLiters'), value: Number(results.effectiveLiters || 0) },
                      { name: t('wasteLiters'), value: Number(results.wasteLiters || 0) },
                    ].filter((item) => item.value > 0);

                    if (chartViewType === 'pie') {
                      return utilizationPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={utilizationPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={118}
                              dataKey="value"
                              paddingAngle={3}
                              label={({ name, percent }) => `${name}: ${m4Fmt(percent * 100, 2)}%`}
                            >
                              {utilizationPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => `${m4Fmt(Number(value || 0), 2)} L`}
                              contentStyle={{
                                backgroundColor: chartColors.tooltip.bg,
                                border: `1px solid ${chartColors.tooltip.border}`,
                                borderRadius: '12px',
                                boxShadow: chartColors.tooltip.shadow,
                                padding: '12px 16px'
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty">
                          <p className="chart-empty-text">{t('noDataToShow')}</p>
                        </div>
                      );
                    }

                    if (chartViewType === 'scale') {
                      return (
                        <ResponsiveContainer width="100%" height={320}>
                          <ComposedChart data={conversionData}>
                            <defs>
                              <linearGradient id="module4ConversionScaleFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                            <XAxis
                              dataKey="name"
                              stroke={chartColors.axis.tick}
                              tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                              tickLine={false}
                            />
                            <YAxis
                              stroke={chartColors.axis.tick}
                              tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value) => m4Fmt(Number(value || 0), 2)}
                              contentStyle={{
                                backgroundColor: chartColors.tooltip.bg,
                                border: `1px solid ${chartColors.tooltip.border}`,
                                borderRadius: '12px',
                                boxShadow: chartColors.tooltip.shadow,
                                padding: '12px 16px'
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                            <Area type="monotone" dataKey="value" fill="url(#module4ConversionScaleFill)" stroke={chartColors.primary} strokeWidth={2} />
                            <Line type="monotone" dataKey="value" stroke={chartColors.primary} strokeWidth={3} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      );
                    }

                    return (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={conversionData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value) => m4Fmt(Number(value || 0), 2)}
                            contentStyle={{
                              backgroundColor: chartColors.tooltip.bg,
                              border: `1px solid ${chartColors.tooltip.border}`,
                              borderRadius: '12px',
                              boxShadow: chartColors.tooltip.shadow,
                              padding: '12px 16px'
                            }}
                            cursor={{ fill: chartColors.background.hover }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {conversionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>

                <div className="chart-container" style={{ marginTop: '24px' }}>
                  <h3 className="chart-section-title">{t('efficiencyAndConversion')}</h3>
                  {(() => {
                    if (chartViewType === 'pie') {
                      const efficiencyPieData = efficiencyData
                        .map((item) => ({
                          name: item.name,
                          value: Math.max(0, Number(item.value || 0)),
                        }))
                        .filter((item) => item.value > 0);

                      return efficiencyPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={efficiencyPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={118}
                              dataKey="value"
                              paddingAngle={3}
                              label={({ name, percent }) => `${name}: ${m4Fmt(percent * 100, 2)}%`}
                            >
                              {efficiencyPieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.value >= 90 ? chartColors.margin : entry.value >= 70 ? chartColors.quaternary : chartColors.costs}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => `${m4Fmt(Number(value || 0), 2)}%`}
                              contentStyle={{
                                backgroundColor: chartColors.tooltip.bg,
                                border: `1px solid ${chartColors.tooltip.border}`,
                                borderRadius: '12px',
                                boxShadow: chartColors.tooltip.shadow,
                                padding: '12px 16px'
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty">
                          <p className="chart-empty-text">{t('noDataToShow')}</p>
                        </div>
                      );
                    }

                    if (chartViewType === 'scale') {
                      return (
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={efficiencyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                            <XAxis
                              dataKey="name"
                              stroke={chartColors.axis.tick}
                              tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                              tickLine={false}
                            />
                            <YAxis
                              stroke={chartColors.axis.tick}
                              tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 100]}
                              tickFormatter={(value) => `${m4Fmt(Number(value), 2)}%`}
                            />
                            <Tooltip
                              formatter={(value) => `${m4Fmt(Number(value || 0), 2)}%`}
                              contentStyle={{
                                backgroundColor: chartColors.tooltip.bg,
                                border: `1px solid ${chartColors.tooltip.border}`,
                                borderRadius: '12px',
                                boxShadow: chartColors.tooltip.shadow,
                                padding: '12px 16px'
                              }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={chartColors.margin}
                              strokeWidth={3}
                              dot={{ r: 5 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    }

                    return (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={efficiencyData} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                          <XAxis
                            dataKey="name"
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                          />
                          <YAxis
                            stroke={chartColors.axis.tick}
                            tick={{ fill: chartColors.text.secondary, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            formatter={(value) => `${m4Fmt(Number(value), 2)}%`}
                            contentStyle={{
                              backgroundColor: chartColors.tooltip.bg,
                              border: `1px solid ${chartColors.tooltip.border}`,
                              borderRadius: '12px',
                              boxShadow: chartColors.tooltip.shadow,
                              padding: '12px 16px'
                            }}
                            cursor={{ fill: chartColors.background.hover }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {efficiencyData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.value >= 90 ? chartColors.margin : entry.value >= 70 ? chartColors.quaternary : chartColors.costs}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
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
    </div>
  );
}

export default Module4Yield;
