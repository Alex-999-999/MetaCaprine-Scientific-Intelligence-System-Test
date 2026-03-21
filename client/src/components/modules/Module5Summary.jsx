import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import { useChartColors } from '../../hooks/useDarkMode';
import { formatCurrency, formatCurrencyCompact, normalizeCurrency } from '../../utils/currency';
import ModernIcon from '../icons/ModernIcon';

function Module5Summary({ user }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const chartColors = useChartColors();
  const preferredCurrency = normalizeCurrency(user?.preferred_currency);
  const formatMoney = (value, options = {}) => formatCurrency(value, preferredCurrency, options);
  const formatMoneyCompact = (value) => formatCurrencyCompact(value, preferredCurrency);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [expandedBreakdown, setExpandedBreakdown] = useState({});

  // Helper function to determine scenario type code/label
  const getScenarioTypeCode = (item) => {
    if (!item.results.transformationMetrics) {
      return 'milk_only';
    }
    const hasTransformation = item.results.transformationMetrics &&
      (item.results.transformationMetrics.productRevenue || 0) > 0;
    if (hasTransformation && item.results.revenue?.totalRevenue > 0) {
      return 'mixed';
    }
    return 'transformation';
  };

  const getScenarioTypeLabel = (item) => {
    const typeCode = getScenarioTypeCode(item);
    if (typeCode === 'milk_only') return t('scenarioTypeMilkOnly');
    if (typeCode === 'mixed') return t('scenarioTypeMixed');
    return t('scenarioTypeTransformation');
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const response = await api.get('/scenarios');
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const handleCompare = async () => {
    if (selectedScenarios.length < 2) {
      setAlertModal({
        isOpen: true,
        message: t('selectAtLeast2'),
        type: 'info'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/scenarios/compare', {
        scenarioIds: selectedScenarios,
      });
      setComparison(response.data);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorComparing'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Sort comparison by different criteria for ranking
  const getRankedByRevenue = () => {
    if (!comparison) return [];
    return [...comparison].sort((a, b) => 
      Number(b.results.totalRevenue || 0) - Number(a.results.totalRevenue || 0)
    );
  };

  const getRankedByMargin = () => {
    if (!comparison) return [];
    return [...comparison].sort((a, b) => 
      Number(b.results.grossMargin || 0) - Number(a.results.grossMargin || 0)
    );
  };

  const getRankedByMarginPercent = () => {
    if (!comparison) return [];
    return [...comparison].sort((a, b) => 
      Number(b.results.marginPercentage || 0) - Number(a.results.marginPercentage || 0)
    );
  };

  const comparisonData = comparison ? comparison.map((item, idx) => {
    const rankedByRevenue = getRankedByRevenue();
    const rankedByMargin = getRankedByMargin();
    const rankedByMarginPercent = getRankedByMarginPercent();
    
    const revenueRank = rankedByRevenue.findIndex(s => s.scenario.id === item.scenario.id) + 1;
    const marginRank = rankedByMargin.findIndex(s => s.scenario.id === item.scenario.id) + 1;
    const marginPercentRank = rankedByMarginPercent.findIndex(s => s.scenario.id === item.scenario.id) + 1;

    return {
      name: item.scenario.name,
      nameWithLabel: `${item.scenario.name} [${getScenarioTypeLabel(item)}]`,
      [t('income')]: Number(item.results.totalRevenue || 0),
      [t('totalCosts')]: Number(item.results.totalCosts || 0),
      [t('margin')]: Number(item.results.grossMargin || 0),
      [t('marginPercentage')]: Number(item.results.marginPercentage || 0),
      revenueRank,
      marginRank,
      marginPercentRank,
      typeCode: getScenarioTypeCode(item),
      typeLabel: getScenarioTypeLabel(item),
    };
  }) : [];

  const revenueData = comparison ? comparison.map(item => ({
    name: `${item.scenario.name} [${getScenarioTypeLabel(item)}]`,
    [t('income')]: Number(item.results.totalRevenue || 0),
  })) : [];

  return (
    <div className="container module-compact">
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginTop: '20px' }}>{t('module5Title')}</h1>
        <div className="pedagogy-block" style={{ marginTop: '12px' }}>
          <p className="pedagogy-title">{t('module5SummaryPedagogyTitle')}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {t('module5SummaryPedagogyIntro')}
          </p>
          <ul className="pedagogy-list">
            <li>{t('module5SummaryRuleRevenue')}</li>
            <li>{t('module5SummaryRuleMargin')}</li>
            <li>{t('module5SummaryRuleDecision')}</li>
          </ul>
        </div>
      </header>

      <div className="card">
        <h2>{t('compareScenarios')}</h2>
        <p style={{ marginBottom: '15px' }}>
          {t('selectMultipleScenarios')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {scenarios.map(scenario => (
            <label
              key={scenario.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 20px',
                background: selectedScenarios.includes(scenario.id) 
                  ? 'linear-gradient(135deg, rgba(45, 80, 22, 0.08) 0%, rgba(74, 124, 42, 0.12) 100%)' 
                  : 'linear-gradient(135deg, #f8faf7 0%, #f5f5f5 100%)',
                borderRadius: '12px',
                cursor: 'pointer',
                border: selectedScenarios.includes(scenario.id) 
                  ? '2px solid #2d5016' 
                  : '2px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: selectedScenarios.includes(scenario.id) 
                  ? '0 4px 12px rgba(45, 80, 22, 0.15)' 
                  : '0 2px 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              <input
                type="checkbox"
                checked={selectedScenarios.includes(scenario.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedScenarios([...selectedScenarios, scenario.id]);
                  } else {
                    setSelectedScenarios(selectedScenarios.filter(id => id !== scenario.id));
                  }
                }}
                style={{ 
                  marginRight: '14px',
                  width: '20px',
                  height: '20px',
                  accentColor: '#2d5016',
                  cursor: 'pointer'
                }}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#1a3d0f', fontSize: '0.95rem' }}>{scenario.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>
                  {t(`moduleTypes.${scenario.type}`) || scenario.type}
                </div>
              </div>
            </label>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={loading || selectedScenarios.length < 2}
        >
          {loading ? t('comparing') : t('compareScenarios')}
        </button>
      </div>

      {comparison && (
        <>
          <div className="card">
            <h2>{t('comparisonResults')}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('scenario')}</th>
                  <th>{t('type')}</th>
                  <th>{t('productionL')}</th>
                  <th>{t('income')}</th>
                  <th>{t('totalCosts')}</th>
                  <th>{t('grossMargin')}</th>
                  <th>{t('marginPercentage')}</th>
                  <th>{t('ranking')}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => {
                  const dataItem = comparisonData[index];
                  const isBestRevenue = dataItem?.revenueRank === 1;
                  const isBestMargin = dataItem?.marginRank === 1;
                  const isBestMarginPercent = dataItem?.marginPercentRank === 1;
                  
                  return (
                    <tr 
                      key={index}
                      style={{
                        backgroundColor: isBestMargin ? '#e8f5e9' : 'transparent'
                      }}
                    >
                      <td><strong>{item.scenario.name}</strong></td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                          backgroundColor: dataItem?.typeCode === 'milk_only' ? '#e3f2fd' :
                                         dataItem?.typeCode === 'transformation' ? '#fff3e0' : '#f3e5f5',
                          color: dataItem?.typeCode === 'milk_only' ? '#1976d2' :
                                dataItem?.typeCode === 'transformation' ? '#e65100' : '#7b1fa2',
                        }}>
                          {dataItem?.typeLabel || getScenarioTypeLabel(item)}
                        </span>
                      </td>
                      <td>{Number(item.results.totalProductionLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>{formatMoney(item.results.totalRevenue)}</td>
                      <td>{formatMoney(item.results.totalCosts)}</td>
                      <td>{formatMoney(item.results.grossMargin)}</td>
                      <td>{Number(item.results.marginPercentage || 0).toFixed(2)}%</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85em' }}>
                          {isBestRevenue && (
                            <span style={{ color: '#1976d2', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <ModernIcon name="trophy" size={14} />
                              {t('bestByRevenue')}
                            </span>
                          )}
                          {isBestMargin && (
                            <span style={{ color: '#2e7d32', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <ModernIcon name="trophy" size={14} />
                              {t('bestByMargin')}
                            </span>
                          )}
                          {isBestMarginPercent && (
                            <span style={{ color: '#7b1fa2', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <ModernIcon name="trophy" size={14} />
                              {t('bestByMarginPercent')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comparative Visualization Chart Card */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">
                  <span className="chart-title-icon">
                    <ModernIcon name="chartBar" size={18} />
                  </span>
                  {t('comparativeVisualization')}
                </h2>
                <p className="chart-subtitle">{t('financialMetricsComparisonSubtitle')}</p>
              </div>
            </div>
            
            <div className="chart-container">
              <h3 className="chart-section-title">{t('incomeCostsAndMargins')}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={comparisonData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    angle={-20} 
                    textAnchor="end" 
                    height={80} 
                    stroke={chartColors.axis.tick}
                    tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke={chartColors.axis.tick}
                    tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatMoneyCompact(value)}
                  />
                  <Tooltip 
                    formatter={(value) => formatMoney(value)}
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
                  <Bar dataKey={t('income')} fill={chartColors.revenue} radius={[6, 6, 0, 0]} />
                  <Bar dataKey={t('totalCosts')} fill={chartColors.costs} radius={[6, 6, 0, 0]} />
                  <Bar dataKey={t('margin')} fill={chartColors.margin} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container" style={{ marginTop: '24px' }}>
              <h3 className="chart-section-title">{t('incomeComparison')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <defs>
                    <linearGradient id="incomeLineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.revenue} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartColors.revenue} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
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
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="line" />
                  <Line 
                    type="monotone" 
                    dataKey={t('income')} 
                    stroke={chartColors.revenue} 
                    strokeWidth={3}
                    dot={{ fill: chartColors.revenue, strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container" style={{ marginTop: '24px' }}>
              <h3 className="chart-section-title">{t('marginsByScenario')}</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={comparisonData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    angle={-20} 
                    textAnchor="end" 
                    height={80} 
                    stroke={chartColors.axis.tick}
                    tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke={chartColors.axis.tick}
                    tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value) => `${Number(value || 0).toFixed(2)}%`}
                    contentStyle={{ 
                      backgroundColor: chartColors.tooltip.bg, 
                      border: `1px solid ${chartColors.tooltip.border}`,
                      borderRadius: '12px',
                      boxShadow: chartColors.tooltip.shadow
                    }}
                    cursor={{ fill: chartColors.background.hover }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                  <Bar dataKey={t('marginPercentage')} fill={chartColors.margin} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Product Mix and Channel Mix Visualization */}
          {comparison && comparison.length > 0 && (
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <h2 className="chart-title">
                    <span className="chart-title-icon">
                      <ModernIcon name="pieChart" size={18} />
                    </span>
                    {t('mixAnalysis')}
                  </h2>
                  <p className="chart-subtitle">{t('productChannelDistributionSubtitle')}</p>
                </div>
              </div>
              
              <div className="charts-comparison-grid">
                {/* Product Mix Visualization */}
                {comparison.some(item => item.results.transformationMetrics?.productsBreakdown) && (
                  <div className="chart-container">
                    <h3 className="chart-section-title">{t('productMixByScenario')}</h3>
                    {comparison.filter(item => item.results.transformationMetrics?.productsBreakdown).map((item, idx) => {
                      const productsData = item.results.transformationMetrics.productsBreakdown.map(p => ({
                        name: p.product_type_custom || p.product_type || t('product'),
                        value: p.distribution_percentage || 0,
                      }));
                      
                      return (
                        <div key={idx} style={{ marginBottom: '24px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: chartColors.text.primary }}>{item.scenario.name}</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={productsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={85}
                                innerRadius={45}
                                fill={chartColors.primary}
                                dataKey="value"
                                paddingAngle={2}
                              >
                                {productsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: chartColors.tooltip.bg, 
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  borderRadius: '12px',
                                  boxShadow: chartColors.tooltip.shadow
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Channel Mix Visualization */}
                {comparison.some(item => item.results.transformationMetrics?.productsBreakdown) && (
                  <div className="chart-container">
                    <h3 className="chart-section-title">{t('channelMixByScenario')}</h3>
                    {comparison.filter(item => item.results.transformationMetrics?.productsBreakdown).map((item, idx) => {
                      let totalKgDirect = 0;
                      let totalKgDistributors = 0;
                      let totalKgThird = 0;
                      let totalKg = 0;
                      
                      item.results.transformationMetrics.productsBreakdown.forEach(product => {
                        if (product.salesChannels && product.productKg) {
                          totalKgDirect += product.salesChannels.direct?.kg || 0;
                          totalKgDistributors += product.salesChannels.distributors?.kg || 0;
                          totalKgThird += product.salesChannels.third?.kg || 0;
                          totalKg += product.productKg;
                        }
                      });
                      
                      const channelsData = [];
                      if (totalKg > 0) {
                        if (totalKgDirect > 0) {
                          channelsData.push({ name: t('salesChannelDirect'), value: (totalKgDirect / totalKg) * 100 });
                        }
                        if (totalKgDistributors > 0) {
                          channelsData.push({ name: t('salesChannelDistributors'), value: (totalKgDistributors / totalKg) * 100 });
                        }
                        if (totalKgThird > 0) {
                          channelsData.push({ name: t('salesChannelThird'), value: (totalKgThird / totalKg) * 100 });
                        }
                      }
                      
                      return (
                        <div key={idx} style={{ marginBottom: '24px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: chartColors.text.primary }}>{item.scenario.name}</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={channelsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={85}
                                innerRadius={45}
                                fill={chartColors.primary}
                                dataKey="value"
                                paddingAngle={2}
                              >
                                {channelsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: chartColors.tooltip.bg, 
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  borderRadius: '12px',
                                  boxShadow: chartColors.tooltip.shadow
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h2>{t('executiveSummary')}</h2>
            {comparison.length > 0 && (
              <div>
                <p><strong>{t('bestScenarioByIncome')}:</strong> {
                  comparison.reduce((best, current) => 
                    Number(current.results.totalRevenue || 0) > Number(best.results.totalRevenue || 0) ? current : best
                  ).scenario.name
                }</p>
                <p><strong>{t('bestScenarioByMargin')}:</strong> {
                  comparison.reduce((best, current) => 
                    Number(current.results.grossMargin || 0) > Number(best.results.grossMargin || 0) ? current : best
                  ).scenario.name
                }</p>
                <p><strong>{t('bestScenarioByMarginPercent')}:</strong> {
                  comparison.reduce((best, current) => 
                    Number(current.results.marginPercentage || 0) > Number(best.results.marginPercentage || 0) ? current : best
                  ).scenario.name
                }</p>
              </div>
            )}
          </div>

          {/* Calculation Breakdown Panel */}
          <div className="card">
            <h2>{t('calculationBreakdown')}</h2>
            {comparison.map((item, idx) => {
              const isExpanded = expandedBreakdown[item.scenario.id];
              const tm = item.results.transformationMetrics;
              
              return (
                <div key={idx} style={{ marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedBreakdown({
                      ...expandedBreakdown,
                      [item.scenario.id]: !isExpanded
                    })}
                  >
                    <h3 style={{ margin: 0 }}>{item.scenario.name} - {getScenarioTypeLabel(item)}</h3>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <ModernIcon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={16} />
                    </span>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                      {tm ? (
                        <>
                          <h4>{t('transformationDetails')}</h4>
                          <table className="table" style={{ fontSize: '0.9em' }}>
                            <tbody>
                              <tr>
                                <td><strong>{t('litersUsedTransformation')}:</strong></td>
                                <td>{Number(tm.totalTransformationLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                              </tr>
                              <tr>
                                <td><strong>{t('totalKgProduced')}:</strong></td>
                                <td>{Number(tm.totalProductKg || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</td>
                              </tr>
                              <tr>
                                <td><strong>{t('averageWeightedPrice')}:</strong></td>
                                <td>{formatMoney(tm.averageWeightedPrice)} / kg</td>
                              </tr>
                              <tr>
                                <td><strong>{t('averageWeightedCost')}:</strong></td>
                                <td>{formatMoney(tm.averageWeightedCost)} / kg</td>
                              </tr>
                              <tr>
                                <td><strong>{t('totalTransformationRevenue')}:</strong></td>
                                <td>{formatMoney(tm.productRevenue)}</td>
                              </tr>
                              <tr>
                                <td><strong>{t('totalTransformationCost')}:</strong></td>
                                <td>{formatMoney((tm.processingCost || 0) + (tm.packagingCost || 0) + (item.results.costs?.totalCosts || 0))}</td>
                              </tr>
                              <tr>
                                <td><strong>{t('totalTransformationMargin')}:</strong></td>
                                <td>{formatMoney(item.results.grossMargin)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <>
                          <h4>{t('directSaleDetails')}</h4>
                          <table className="table" style={{ fontSize: '0.9em' }}>
                            <tbody>
                              <tr>
                                <td><strong>{t('totalLiters')}:</strong></td>
                                <td>{Number(item.results.totalProductionLiters || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                              </tr>
                              <tr>
                                <td><strong>{t('revenuePerLiter')}:</strong></td>
                                <td>{formatMoney(item.results.revenue?.revenuePerLiter)} / L</td>
                              </tr>
                              <tr>
                                <td><strong>{t('costPerLiter')}:</strong></td>
                                <td>{formatMoney(item.results.costs?.costPerLiter)} / L</td>
                              </tr>
                              <tr>
                                <td><strong>{t('totalRevenue')}:</strong></td>
                                <td>{formatMoney(item.results.totalRevenue)}</td>
                              </tr>
                              <tr>
                                <td><strong>{t('totalCosts')}:</strong></td>
                                <td>{formatMoney(item.results.totalCosts)}</td>
                              </tr>
                              <tr>
                                <td><strong>{t('grossMargin')}:</strong></td>
                                <td>{formatMoney(item.results.grossMargin)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

export default Module5Summary;
