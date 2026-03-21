import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { formatCurrency, getCurrencySymbol, normalizeCurrency } from '../utils/currency';

const INITIAL_FEED_DATA = {
  concentrate_kg_per_day: '0',
  concentrate_price_per_kg: '0',
  bag_price: '0',
  bag_weight_kg: '0',
  forage_kg_per_day: '0',
  forage_price_per_kg: '0',
  forage_bale_price: '0',
  forage_bale_weight_kg: '0',
  supplement_kg_per_day: '0',
  supplement_price_per_kg: '0',
  mineral_monthly_cost: '0',
};

const INITIAL_LABOR_DATA = {
  labor_mode: 'hourly',
  hours_per_day_per_worker: '0',
  workers_count: '0',
  wage_per_hour: '0',
  wage_per_day_per_worker: '0',
  monthly_wage_per_worker: '0',
  monthly_total_labor_cost: '0',
};

const INITIAL_HEALTH_DATA = {
  annual_health_cost_per_animal: '0',
  vaccine_cost_annual: '0',
  deworming_cost_annual: '0',
  vet_visits_annual: '0',
};

const INITIAL_SERVICES_DATA = {
  electricity_monthly: '0',
  water_monthly: '0',
  maintenance_monthly: '0',
  transport_monthly: '0',
};

const INITIAL_REARING_DATA = {
  rearing_cost_per_animal: '0',
  productive_years: '0',
  replacement_rate_percent: '0',
};

/**
 * Module 4: Cost Mini-Calculator Modal
 * Integrated into Module 1 for estimating costs when user doesn't know exact values
 * 
 * Features:
 * - 5 sub-calculators: Feed, Labor, Health, Services, Rearing
 * - "Apply to Module 1" button auto-fills the calculated cost
 * - Simple, producer-oriented UI
 */
function CostCalculatorModal({
  isOpen,
  onClose,
  calculatorType,
  onApply,
  currentAnimals = 0,
  currentDailyProduction = 0,
  preferredCurrency = 'USD',
}) {
  const { t } = useI18n();
  const normalizedCurrency = normalizeCurrency(preferredCurrency);
  const currencySymbol = getCurrencySymbol(normalizedCurrency);
  const formatMoney = (value, options = {}) => formatCurrency(value, normalizedCurrency, options);
  
  // Feed Calculator State
  const [feedData, setFeedData] = useState(INITIAL_FEED_DATA);
  
  // Labor Calculator State
  const [laborData, setLaborData] = useState(INITIAL_LABOR_DATA);
  
  // Health Calculator State
  const [healthData, setHealthData] = useState(INITIAL_HEALTH_DATA);
  
  // Services Calculator State
  const [servicesData, setServicesData] = useState(INITIAL_SERVICES_DATA);
  
  // Rearing Calculator State
  const [rearingData, setRearingData] = useState(INITIAL_REARING_DATA);
  
  const [calculatedCost, setCalculatedCost] = useState(0);

  const resetCalculatorData = () => {
    setFeedData({ ...INITIAL_FEED_DATA });
    setLaborData({ ...INITIAL_LABOR_DATA });
    setHealthData({ ...INITIAL_HEALTH_DATA });
    setServicesData({ ...INITIAL_SERVICES_DATA });
    setRearingData({ ...INITIAL_REARING_DATA });
    setCalculatedCost(0);
  };

  useEffect(() => {
    if (isOpen) {
      // Open calculators with explicit zero values each time.
      resetCalculatorData();
    }
  }, [isOpen, calculatorType]);

  useEffect(() => {
    if (isOpen) {
      calculateCost();
    }
  }, [isOpen, feedData, laborData, healthData, servicesData, rearingData, currentAnimals, currentDailyProduction]);

  const parseNonNegativeNumber = (value) => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  };
  
  const calculateCost = () => {
    const animals = parseNonNegativeNumber(currentAnimals);
    const dailyProd = parseNonNegativeNumber(currentDailyProduction);
    const totalDailyProduction = dailyProd * animals;
    
    let costPerLiter = 0;
    
    switch (calculatorType) {
      case 'feed':
        const concentrateKg = parseNonNegativeNumber(feedData.concentrate_kg_per_day);
        const concentratePrice = parseNonNegativeNumber(feedData.concentrate_price_per_kg);
        const forageKg = parseNonNegativeNumber(feedData.forage_kg_per_day);
        const foragePrice = parseNonNegativeNumber(feedData.forage_price_per_kg);
        const supplementKg = parseNonNegativeNumber(feedData.supplement_kg_per_day);
        const supplementPrice = parseNonNegativeNumber(feedData.supplement_price_per_kg);
        const mineralMonthly = parseNonNegativeNumber(feedData.mineral_monthly_cost);
        
        const dailyFeedCost = (concentrateKg * concentratePrice) + (forageKg * foragePrice) + (supplementKg * supplementPrice);
        const dailyMineralCost = mineralMonthly / 30;
        const totalDailyFeedCost = (dailyFeedCost * animals) + dailyMineralCost;
        
        costPerLiter = totalDailyProduction > 0 ? totalDailyFeedCost / totalDailyProduction : 0;
        break;
        
      case 'labor':
        const workers = parseNonNegativeNumber(laborData.workers_count);
        let dailyLaborCost = 0;

        if (laborData.labor_mode === 'monthly') {
          const monthlyTotal = parseNonNegativeNumber(laborData.monthly_total_labor_cost);
          const monthlyWage = parseNonNegativeNumber(laborData.monthly_wage_per_worker);
          const monthlyLaborCost = monthlyTotal > 0 ? monthlyTotal : (monthlyWage * workers);
          dailyLaborCost = monthlyLaborCost / 30;
        } else if (laborData.labor_mode === 'daily') {
          const wagePerDay = parseNonNegativeNumber(laborData.wage_per_day_per_worker);
          dailyLaborCost = wagePerDay * workers;
        } else {
          const hoursPerDay = parseNonNegativeNumber(laborData.hours_per_day_per_worker);
          const wagePerHour = parseNonNegativeNumber(laborData.wage_per_hour);
          dailyLaborCost = hoursPerDay * wagePerHour * workers;
        }
        
        costPerLiter = totalDailyProduction > 0 ? dailyLaborCost / totalDailyProduction : 0;
        break;
        
      case 'health':
        const annualHealthPerAnimal = parseNonNegativeNumber(healthData.annual_health_cost_per_animal);
        const vaccineCost = parseNonNegativeNumber(healthData.vaccine_cost_annual);
        const dewormingCost = parseNonNegativeNumber(healthData.deworming_cost_annual);
        const vetVisits = parseNonNegativeNumber(healthData.vet_visits_annual);
        
        const totalAnnualHealth = (annualHealthPerAnimal > 0 ? annualHealthPerAnimal : (vaccineCost + dewormingCost + vetVisits)) * animals;
        const dailyHealthCost = totalAnnualHealth / 365;
        
        costPerLiter = totalDailyProduction > 0 ? dailyHealthCost / totalDailyProduction : 0;
        break;
        
      case 'services':
        const electricity = parseNonNegativeNumber(servicesData.electricity_monthly);
        const water = parseNonNegativeNumber(servicesData.water_monthly);
        const maintenance = parseNonNegativeNumber(servicesData.maintenance_monthly);
        const transport = parseNonNegativeNumber(servicesData.transport_monthly);
        
        const totalMonthlyServices = electricity + water + maintenance + transport;
        const dailyServicesCost = totalMonthlyServices / 30;
        
        costPerLiter = totalDailyProduction > 0 ? dailyServicesCost / totalDailyProduction : 0;
        break;
        
      case 'rearing':
        const rearingCostPerAnimal = parseNonNegativeNumber(rearingData.rearing_cost_per_animal);
        const replacementRate = parseNonNegativeNumber(rearingData.replacement_rate_percent);
        
        const annualReplacementAnimals = animals * (replacementRate / 100);
        const annualRearingCost = annualReplacementAnimals * rearingCostPerAnimal;
        const dailyRearingCost = annualRearingCost / 365;
        
        costPerLiter = totalDailyProduction > 0 ? dailyRearingCost / totalDailyProduction : 0;
        break;
        
      default:
        costPerLiter = 0;
    }
    
    setCalculatedCost(costPerLiter);
  };
  
  const handleApply = () => {
    onApply(calculatedCost);
    onClose();
  };

  const sanitizeNumericInput = (value) => {
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    const normalized = String(value).trim().replace(',', '.');
    if (normalized === '') return '';
    if (!/^\d*\.?\d*$/.test(normalized)) return null;

    const [rawIntPart, rawDecimalPart] = normalized.split('.');
    let intPart = rawIntPart || '';
    if (intPart.length > 1) {
      intPart = intPart.replace(/^0+(?=\d)/, '');
    }
    if (intPart === '') {
      intPart = '0';
    }

    if (typeof rawDecimalPart !== 'undefined') {
      return `${intPart}.${rawDecimalPart}`;
    }
    return intPart;
  };

  const getDataTypeByField = (fieldName) => {
    if (Object.prototype.hasOwnProperty.call(INITIAL_FEED_DATA, fieldName)) return 'feed';
    if (Object.prototype.hasOwnProperty.call(INITIAL_LABOR_DATA, fieldName)) return 'labor';
    if (Object.prototype.hasOwnProperty.call(INITIAL_HEALTH_DATA, fieldName)) return 'health';
    if (Object.prototype.hasOwnProperty.call(INITIAL_SERVICES_DATA, fieldName)) return 'services';
    if (Object.prototype.hasOwnProperty.call(INITIAL_REARING_DATA, fieldName)) return 'rearing';
    return null;
  };

  const updateCalculatorField = (dataType, fieldName, fieldValue) => {
    switch (dataType) {
      case 'feed':
        setFeedData((prev) => ({ ...prev, [fieldName]: fieldValue }));
        break;
      case 'labor':
        setLaborData((prev) => ({ ...prev, [fieldName]: fieldValue }));
        break;
      case 'health':
        setHealthData((prev) => ({ ...prev, [fieldName]: fieldValue }));
        break;
      case 'services':
        setServicesData((prev) => ({ ...prev, [fieldName]: fieldValue }));
        break;
      case 'rearing':
        setRearingData((prev) => ({ ...prev, [fieldName]: fieldValue }));
        break;
      default:
        break;
    }
  };
  
  const handleInputChange = (e, dataType) => {
    const { name, value } = e.target;
    const isModeSelector = dataType === 'labor' && name === 'labor_mode';
    const sanitizedValue = isModeSelector ? value : sanitizeNumericInput(value);

    if (sanitizedValue === null) {
      return;
    }

    updateCalculatorField(dataType, name, sanitizedValue);
  };

  const handleNumericFocusCapture = (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'INPUT' || target.type !== 'number' || target.readOnly) {
      return;
    }

    requestAnimationFrame(() => {
      target.select();
    });
  };

  const handleNumericBlurCapture = (e) => {
    const target = e.target;
    if (!target || target.tagName !== 'INPUT' || target.type !== 'number' || target.readOnly) {
      return;
    }

    const fieldName = target.name;
    if (!fieldName) return;
    const dataType = getDataTypeByField(fieldName);
    if (!dataType) return;

    const normalized = sanitizeNumericInput(target.value);
    updateCalculatorField(dataType, fieldName, normalized === null || normalized === '' ? '0' : normalized);
  };

  const bagPrice = parseNonNegativeNumber(feedData.bag_price);
  const bagWeightKg = parseNonNegativeNumber(feedData.bag_weight_kg);
  const computedPricePerKg = bagPrice > 0 && bagWeightKg > 0 ? (bagPrice / bagWeightKg) : 0;
  const forageBalePrice = parseNonNegativeNumber(feedData.forage_bale_price);
  const forageBaleWeightKg = parseNonNegativeNumber(feedData.forage_bale_weight_kg);
  const computedForagePricePerKg = forageBalePrice > 0 && forageBaleWeightKg > 0
    ? (forageBalePrice / forageBaleWeightKg)
    : 0;

  const applyComputedPricePerKg = () => {
    if (computedPricePerKg <= 0) return;
    setFeedData(prev => ({
      ...prev,
      concentrate_price_per_kg: computedPricePerKg.toFixed(4)
    }));
  };

  const applyComputedForagePricePerKg = () => {
    if (computedForagePricePerKg <= 0) return;
    setFeedData(prev => ({
      ...prev,
      forage_price_per_kg: computedForagePricePerKg.toFixed(4)
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>{t('costEstimator')} - {t(`calc${calculatorType.charAt(0).toUpperCase() + calculatorType.slice(1)}`)}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div
          className="modal-body"
          onFocusCapture={handleNumericFocusCapture}
          onBlurCapture={handleNumericBlurCapture}
        >
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '20px', fontSize: '0.95em' }}>
            {t('costEstimatorDescription')}
          </p>
          
          {/* Feed Calculator */}
          {calculatorType === 'feed' && (
            <div>
              <h3>{t('feedCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('feedCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>{t('concentrateKgPerDay')} (kg/animal/day)</label>
                <input
                  type="number"
                  name="concentrate_kg_per_day"
                  value={feedData.concentrate_kg_per_day}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.1"
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>{t('concentratePricePerKg')} ({currencySymbol}/kg)</label>
                <input
                  type="number"
                  name="concentrate_price_per_kg"
                  value={feedData.concentrate_price_per_kg}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('feedConcentratePriceHint')}</p>
              </div>

              <div className="pedagogy-block" style={{ marginBottom: '15px' }}>
                <p className="pedagogy-title">{t('feedBagCalculatorTitle')}</p>
                <p className="input-hint" style={{ marginTop: 0 }}>{t('feedBagCalculatorHint')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('bagPrice')} ({currencySymbol})</label>
                    <input
                      type="number"
                      name="bag_price"
                      value={feedData.bag_price}
                      onChange={(e) => handleInputChange(e, 'feed')}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('bagWeightKg')} (kg)</label>
                    <input
                      type="number"
                      name="bag_weight_kg"
                      value={feedData.bag_weight_kg}
                      onChange={(e) => handleInputChange(e, 'feed')}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('computedPricePerKg')} ({currencySymbol}/kg)</label>
                    <input
                      type="number"
                      value={computedPricePerKg > 0 ? computedPricePerKg.toFixed(4) : '0'}
                      readOnly
                      placeholder="0"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={applyComputedPricePerKg}
                  disabled={computedPricePerKg <= 0}
                >
                  {t('applyComputedPricePerKg')}
                </button>
              </div>
              
              <div className="form-group">
                <label>{t('forageKgPerDay')} (kg/animal/day)</label>
                <input
                  type="number"
                  name="forage_kg_per_day"
                  value={feedData.forage_kg_per_day}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.1"
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>{t('foragePricePerKg')} ({currencySymbol}/kg)</label>
                <input
                  type="number"
                  name="forage_price_per_kg"
                  value={feedData.forage_price_per_kg}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('forageCostHint')}</p>
              </div>

              <div className="pedagogy-block" style={{ marginBottom: '15px' }}>
                <p className="pedagogy-title">{t('forageBaleCalculatorTitle')}</p>
                <p className="input-hint" style={{ marginTop: 0 }}>{t('forageBaleCalculatorHint')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('forageBalePrice')} ({currencySymbol})</label>
                    <input
                      type="number"
                      name="forage_bale_price"
                      value={feedData.forage_bale_price}
                      onChange={(e) => handleInputChange(e, 'feed')}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('forageBaleWeightKg')} (kg)</label>
                    <input
                      type="number"
                      name="forage_bale_weight_kg"
                      value={feedData.forage_bale_weight_kg}
                      onChange={(e) => handleInputChange(e, 'feed')}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>{t('computedPricePerKg')} ({currencySymbol}/kg)</label>
                    <input
                      type="number"
                      value={computedForagePricePerKg > 0 ? computedForagePricePerKg.toFixed(4) : '0'}
                      readOnly
                      placeholder="0"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={applyComputedForagePricePerKg}
                  disabled={computedForagePricePerKg <= 0}
                >
                  {t('applyComputedForagePricePerKg')}
                </button>
              </div>
              
              <div className="form-group">
                <label>{t('supplementKgPerDay')} (kg/animal/day)</label>
                <input
                  type="number"
                  name="supplement_kg_per_day"
                  value={feedData.supplement_kg_per_day}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.1"
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>{t('supplementPricePerKg')} ({currencySymbol}/kg)</label>
                <input
                  type="number"
                  name="supplement_price_per_kg"
                  value={feedData.supplement_price_per_kg}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>{t('mineralMonthlyCost')} ({currencySymbol}/month total herd)</label>
                <input
                  type="number"
                  name="mineral_monthly_cost"
                  value={feedData.mineral_monthly_cost}
                  onChange={(e) => handleInputChange(e, 'feed')}
                  step="0.01"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          
          {/* Labor Calculator */}
          {calculatorType === 'labor' && (
            <div>
              <h3>{t('laborCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('laborCalcDescription')}
              </p>
              
              <div className="form-group">
                <label>{t('laborMode')}</label>
                <select
                  name="labor_mode"
                  value={laborData.labor_mode}
                  onChange={(e) => handleInputChange(e, 'labor')}
                >
                  <option value="hourly">{t('laborModeHourly')}</option>
                  <option value="daily">{t('laborModeDaily')}</option>
                  <option value="monthly">{t('laborModeMonthly')}</option>
                </select>
                <p className="input-hint">
                  {laborData.labor_mode === 'hourly' && t('laborModeHourlyDescription')}
                  {laborData.labor_mode === 'daily' && t('laborModeDailyDescription')}
                  {laborData.labor_mode === 'monthly' && t('laborModeMonthlyDescription')}
                </p>
              </div>
              
              <div className="form-group">
                <label>{t('workersCount')}</label>
                <input
                  type="number"
                  name="workers_count"
                  value={laborData.workers_count}
                  onChange={(e) => handleInputChange(e, 'labor')}
                  step="1"
                  min="0"
                  placeholder="0"
                />
                <p className="input-hint">{t('workersCountHint')}</p>
              </div>
              
              {laborData.labor_mode === 'hourly' && (
                <>
                  <div className="form-group">
                    <label>{t('hoursPerDayPerWorker')}</label>
                    <input
                      type="number"
                      name="hours_per_day_per_worker"
                      value={laborData.hours_per_day_per_worker}
                      onChange={(e) => handleInputChange(e, 'labor')}
                      step="0.5"
                      placeholder="0"
                    />
                    <p className="input-hint">{t('laborHourlyFormulaHint')}</p>
                  </div>
                  
                  <div className="form-group">
                    <label>{t('wagePerHour')} ({currencySymbol}/hour)</label>
                    <input
                      type="number"
                      name="wage_per_hour"
                      value={laborData.wage_per_hour}
                      onChange={(e) => handleInputChange(e, 'labor')}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                </>
              )}

              {laborData.labor_mode === 'daily' && (
                <div className="form-group">
                  <label>{t('wagePerDayPerWorker')} ({currencySymbol}/day)</label>
                  <input
                    type="number"
                    name="wage_per_day_per_worker"
                    value={laborData.wage_per_day_per_worker}
                    onChange={(e) => handleInputChange(e, 'labor')}
                    step="0.01"
                    placeholder="0"
                  />
                  <p className="input-hint">{t('laborDailyFormulaHint')}</p>
                </div>
              )}

              {laborData.labor_mode === 'monthly' && (
                <>
                  <div className="form-group">
                    <label>{t('monthlyTotalLaborCost')} ({currencySymbol}/month)</label>
                    <input
                      type="number"
                      name="monthly_total_labor_cost"
                      value={laborData.monthly_total_labor_cost}
                      onChange={(e) => handleInputChange(e, 'labor')}
                      step="0.01"
                      placeholder="0"
                    />
                    <p className="input-hint">{t('monthlyTotalLaborCostHint')}</p>
                  </div>
                  <p className="optional-label">{t('laborMonthlyOptionalBreakdown')}</p>
                  <div className="form-group">
                    <label>{t('monthlyWagePerWorker')} ({currencySymbol}/month)</label>
                    <input
                      type="number"
                      name="monthly_wage_per_worker"
                      value={laborData.monthly_wage_per_worker}
                      onChange={(e) => handleInputChange(e, 'labor')}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <p className="input-hint">{t('laborMonthlyFormulaHint')}</p>
                  <p className="input-hint">{t('laborMonthlyEducationalNote')}</p>
                </>
              )}
            </div>
          )}
          
          {/* Health Calculator */}
          {calculatorType === 'health' && (
            <div>
              <h3>{t('healthCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('healthCalcDescription')}
              </p>
              <div className="pedagogy-block" style={{ marginBottom: '14px' }}>
                <p className="pedagogy-title">{t('healthPedagogyTitle')}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {t('healthPedagogyIntro')}
                </p>
                <p className="pedagogy-title" style={{ marginTop: '6px' }}>
                  {t('healthPedagogyHowToTitle')}
                </p>
                <ul className="pedagogy-list">
                  <li><strong>{t('annualHealthCostPerAnimal')}:</strong> {t('healthPedagogyHowToAnnual')}</li>
                  <li><strong>{t('orBreakdownByConcept')}:</strong> {t('healthPedagogyHowToBreakdown')}</li>
                </ul>
                <p className="input-hint" style={{ marginTop: 0 }}>
                  {t('healthPedagogyOutcome')}
                </p>
              </div>
              <p className="input-hint" style={{ marginBottom: '12px' }}>
                {t('healthPreventiveCostHint')}
              </p>
              
              <div className="form-group">
                <label>{t('annualHealthCostPerAnimal')} ({currencySymbol}/animal/year)</label>
                <input
                  type="number"
                  name="annual_health_cost_per_animal"
                  value={healthData.annual_health_cost_per_animal}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="0"
                />
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-tertiary)' }}>
                  {t('healthCostHint')}
                </small>
              </div>
              
              <p style={{ fontSize: '0.9em', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px' }}>
                {t('orBreakdownByConcept')}:
              </p>
              
              <div className="form-group">
                <label>{t('vaccineCostAnnual')} ({currencySymbol}/animal/year)</label>
                <input
                  type="number"
                  name="vaccine_cost_annual"
                  value={healthData.vaccine_cost_annual}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('healthVaccineFieldHint')}</p>
              </div>
              
              <div className="form-group">
                <label>{t('dewormingCostAnnual')} ({currencySymbol}/animal/year)</label>
                <input
                  type="number"
                  name="deworming_cost_annual"
                  value={healthData.deworming_cost_annual}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('healthDewormingFieldHint')}</p>
              </div>
              
              <div className="form-group">
                <label>{t('vetVisitsAnnual')} ({currencySymbol}/animal/year)</label>
                <input
                  type="number"
                  name="vet_visits_annual"
                  value={healthData.vet_visits_annual}
                  onChange={(e) => handleInputChange(e, 'health')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('healthVetFieldHint')}</p>
              </div>
            </div>
          )}
          
          {/* Services Calculator */}
          {calculatorType === 'services' && (
            <div>
              <h3>{t('servicesCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('servicesCalcDescription')}
              </p>
              <div className="pedagogy-block" style={{ marginBottom: '14px' }}>
                <p className="pedagogy-title">{t('servicesPedagogyTitle')}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {t('servicesPedagogyIntro')}
                </p>
                <p className="pedagogy-title" style={{ marginTop: '6px' }}>
                  {t('servicesPedagogyHowToTitle')}
                </p>
                <ul className="pedagogy-list">
                  <li><strong>{t('electricityMonthly')}:</strong> {t('servicesPedagogyHowToElectricity')}</li>
                  <li><strong>{t('waterMonthly')}:</strong> {t('servicesPedagogyHowToWater')}</li>
                  <li><strong>{t('maintenanceMonthly')}:</strong> {t('servicesPedagogyHowToMaintenance')}</li>
                  <li><strong>{t('transportMonthly')}:</strong> {t('servicesPedagogyHowToTransport')}</li>
                </ul>
                <p className="input-hint" style={{ marginTop: 0 }}>
                  {t('servicesPedagogyOutcome')}
                </p>
              </div>
              <p className="input-hint" style={{ marginBottom: '12px' }}>
                {t('servicesHiddenCostHint')}
              </p>
              
              <div className="form-group">
                <label>{t('electricityMonthly')} ({currencySymbol}/month)</label>
                <input
                  type="number"
                  name="electricity_monthly"
                  value={servicesData.electricity_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('servicesElectricityFieldHint')}</p>
              </div>
              
              <div className="form-group">
                <label>{t('waterMonthly')} ({currencySymbol}/month)</label>
                <input
                  type="number"
                  name="water_monthly"
                  value={servicesData.water_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('servicesWaterFieldHint')}</p>
              </div>
              
              <div className="form-group">
                <label>{t('maintenanceMonthly')} ({currencySymbol}/month)</label>
                <input
                  type="number"
                  name="maintenance_monthly"
                  value={servicesData.maintenance_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('servicesMaintenanceFieldHint')}</p>
              </div>
              
              <div className="form-group">
                <label>{t('transportMonthly')} ({currencySymbol}/month)</label>
                <input
                  type="number"
                  name="transport_monthly"
                  value={servicesData.transport_monthly}
                  onChange={(e) => handleInputChange(e, 'services')}
                  step="0.01"
                  placeholder="0"
                />
                <p className="input-hint">{t('servicesTransportFieldHint')}</p>
              </div>
            </div>
          )}
          
          {/* Rearing Calculator */}
          {calculatorType === 'rearing' && (
            <div>
              <h3>{t('rearingCostCalculator')}</h3>
              <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', marginBottom: '15px' }}>
                {t('rearingCalcDescription')}
              </p>
              <div className="pedagogy-block" style={{ marginBottom: '14px' }}>
                <p className="pedagogy-title">{t('rearingPedagogyTitle')}</p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {t('rearingPedagogyIntro')}
                </p>
                <p className="pedagogy-title" style={{ marginTop: '6px' }}>
                  {t('rearingPedagogyHowToTitle')}
                </p>
                <ul className="pedagogy-list">
                  <li><strong>{t('rearingCostPerAnimal')}:</strong> {t('rearingPedagogyHowToCost')}</li>
                  <li><strong>{t('productiveYears')}:</strong> {t('rearingPedagogyHowToYears')}</li>
                  <li><strong>{t('replacementRatePercent')}:</strong> {t('rearingPedagogyHowToRate')}</li>
                </ul>
                <p className="input-hint" style={{ marginTop: 0 }}>
                  {t('rearingPedagogyOutcome')}
                </p>
              </div>
              <p className="input-hint" style={{ marginBottom: '12px' }}>
                {t('replacementHiddenCostHint')}
              </p>
              
              <div className="form-group">
                <label>{t('rearingCostPerAnimal')} ({currencySymbol} total per animal to productive age)</label>
                <input
                  type="number"
                  name="rearing_cost_per_animal"
                  value={rearingData.rearing_cost_per_animal}
                  onChange={(e) => handleInputChange(e, 'rearing')}
                  step="0.01"
                  placeholder="0"
                />
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-tertiary)' }}>
                  {t('rearingCostHint')}
                </small>
              </div>
              
              <div className="form-group">
                <label>{t('productiveYears')}</label>
                <input
                  type="number"
                  name="productive_years"
                  value={rearingData.productive_years}
                  onChange={(e) => handleInputChange(e, 'rearing')}
                  step="0.5"
                  placeholder="0"
                />
                <p className="input-hint">{t('productiveYearsStandardHint')}</p>
              </div>
              
              <div className="form-group">
                <label>{t('replacementRatePercent')} (%/year)</label>
                <input
                  type="number"
                  name="replacement_rate_percent"
                  value={rearingData.replacement_rate_percent}
                  onChange={(e) => handleInputChange(e, 'rearing')}
                  step="1"
                  placeholder="0"
                />
                <p className="input-hint">{t('replacementRateStandardHint')}</p>
                <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-tertiary)' }}>
                  {t('replacementRateHint')}
                </small>
              </div>
            </div>
          )}
          
          {/* Calculated Result */}
          <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', border: '1px solid var(--accent-info)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>{t('estimatedCost')}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '2em', fontWeight: 'bold', color: 'var(--accent-info)' }}>
                {formatMoney(calculatedCost, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
              </span>
              <span style={{ color: 'var(--text-tertiary)' }}>{t('perLiter')}</span>
            </div>
            <p style={{ fontSize: '0.9em', color: 'var(--text-tertiary)', margin: 0 }}>
              {t('basedOnCurrentHerdSize')}: {currentAnimals} {t('animals')} x {currentDailyProduction} L/day = {(currentAnimals * currentDailyProduction).toFixed(1)} L/day {t('total')}
            </p>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            {t('applyToModule1')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CostCalculatorModal;


