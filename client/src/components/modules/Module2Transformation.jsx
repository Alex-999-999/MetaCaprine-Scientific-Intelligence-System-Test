import { useState, useEffect, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Area } from 'recharts';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import { useChartColors } from '../../hooks/useDarkMode';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol, normalizeCurrency } from '../../utils/currency';

function Module2Transformation({ user }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const scenarioId = location.state?.scenarioId;
  const chartColors = useChartColors();
  const preferredCurrency = normalizeCurrency(user?.preferred_currency);
  const currencySymbol = getCurrencySymbol(preferredCurrency);
  const formatMoney = (value, options = {}) => formatCurrency(value, preferredCurrency, options);
  const formatMoneyCompact = (value) => formatCurrencyCompact(value, preferredCurrency);

  const [productionData, setProductionData] = useState({
    daily_production_liters: 0,
    production_days: 0,
    animals_count: 0,
    feed_cost_per_liter: 0,
    labor_cost_per_liter: 0,
    health_cost_per_liter: 0,
    infrastructure_cost_per_liter: 0,
    other_costs_per_liter: 0,
    milk_price_per_liter: 0,
  });

  // Product Mix: Support multiple products with distribution percentages
  const [products, setProducts] = useState([
    {
      id: Date.now(), // Temporary ID for React key
      product_type: 'queso_fresco',
      product_type_custom: '',
      distribution_percentage: '100',
      liters_per_kg_product: '',
      processing_cost_per_liter: '',
      processing_cost_per_kg: '',
      processing_cost_unit: 'liter', // 'liter' or 'kg'
      packaging_cost_per_liter: '',
      packaging_cost_per_kg: '',
      packaging_cost_unit: 'kg', // 'liter' or 'kg'
      sales_channel_direct_percentage: '100',
      sales_channel_distributors_percentage: '',
      sales_channel_third_percentage: '',
      direct_sale_price_per_kg: '',
      distributors_price_per_kg: '',
      third_channel_price_per_kg: '',
    }
  ]);

  // Legacy single product state (for backward compatibility during migration)
  const [transformationData, setTransformationData] = useState({
    product_type: 'queso_fresco',
    product_type_custom: '',
    liters_per_kg_product: '',
    processing_cost_per_liter: '',
    packaging_cost_per_kg: '',
    product_price_per_kg: '',
    sales_channel_direct_percentage: '100',
    sales_channel_distributors_percentage: '',
    sales_channel_third_percentage: '',
    direct_sale_price_per_kg: '',
    distributors_price_per_kg: '',
    third_channel_price_per_kg: '',
  });

  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creatingScenario, setCreatingScenario] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [chartViewType, setChartViewType] = useState('grouped'); // 'grouped', 'donut', 'stacked', 'waterfall'
  const [expandedChannels, setExpandedChannels] = useState({}); // Track which channels have expanded product details
  const [marginViewMode, setMarginViewMode] = useState('dollars'); // 'dollars' or 'percent' for charts

  useEffect(() => {
    const initialize = async () => {
      await loadScenarios();
      if (scenarioId) {
        await loadScenario(scenarioId);
      }
    };
    initialize();
  }, [scenarioId]);

  // Auto-calculate when base inputs or product mix change.
  // This keeps Module 2 responsive for direct-entry workflows.
  useEffect(() => {
    const totalLiters =
      (Number(productionData.daily_production_liters) || 0) *
      (Number(productionData.production_days) || 0) *
      (Number(productionData.animals_count) || 0);

    if (selectedScenario && products.length > 0 && totalLiters > 0) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario, products, productionData]);

  const loadScenarios = async () => {
    try {
      // Load all scenarios so Module 2 can consume Module 1 scenarios
      // and also work with standalone transformation scenarios.
      const response = await api.get('/scenarios');
      setScenarios(response.data);
      if (scenarioId) {
        const scenario = response.data.find(s => s.id === parseInt(scenarioId));
        setSelectedScenario(scenario);
      } else if (response.data.length > 0 && !selectedScenario) {
        // Auto-load the first available scenario when entering Module 2
        // without a preselected scenario.
        await loadScenario(response.data[0].id);
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

      // Load production data if available (from Module 1 or previously saved in Module 2)
      if (scenario.productionData) {
        const normalizedData = {
          daily_production_liters: 0,
          production_days: 0,
          animals_count: 0,
          feed_cost_per_liter: 0,
          labor_cost_per_liter: 0,
          health_cost_per_liter: 0,
          infrastructure_cost_per_liter: 0,
          other_costs_per_liter: 0,
          milk_price_per_liter: 0,
        };
        Object.keys(scenario.productionData).forEach(key => {
          const value = scenario.productionData[key];
          if (typeof value === 'number') {
            normalizedData[key] = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value);
            normalizedData[key] = isNaN(numValue) ? 0 : numValue;
          } else if (value !== null && value !== undefined) {
            normalizedData[key] = value;
          }
        });
        setProductionData(normalizedData);
      } else {
        // Allow Module 2 to run independently (no Module 1 required)
        setProductionData({
          daily_production_liters: 0,
          production_days: 0,
          animals_count: 0,
          feed_cost_per_liter: 0,
          labor_cost_per_liter: 0,
          health_cost_per_liter: 0,
          infrastructure_cost_per_liter: 0,
          other_costs_per_liter: 0,
          milk_price_per_liter: 0,
        });
      }

      // Load transformation products (Product Mix) or fall back to legacy single product
      const convertToInputValue = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(num) || num === 0 ? '' : num.toString();
      };

      if (scenario.transformationProducts && scenario.transformationProducts.length > 0) {
        // New Product Mix format
        const loadedProducts = scenario.transformationProducts.map((product, index) => ({
          id: product.id || Date.now() + index,
          product_type: product.product_type || 'queso_fresco',
          product_type_custom: product.product_type_custom || '',
          distribution_percentage: convertToInputValue(product.distribution_percentage) || '',
          liters_per_kg_product: convertToInputValue(product.liters_per_kg_product),
          processing_cost_per_liter: convertToInputValue(product.processing_cost_per_liter),
          processing_cost_per_kg: convertToInputValue(product.processing_cost_per_kg),
          processing_cost_unit: product.processing_cost_unit || 'liter',
          packaging_cost_per_liter: convertToInputValue(product.packaging_cost_per_liter),
          packaging_cost_per_kg: convertToInputValue(product.packaging_cost_per_kg),
          packaging_cost_unit: product.packaging_cost_unit || 'kg',
          sales_channel_direct_percentage: convertToInputValue(product.sales_channel_direct_percentage) || '100',
          sales_channel_distributors_percentage: convertToInputValue(product.sales_channel_distributors_percentage),
          sales_channel_third_percentage: convertToInputValue(product.sales_channel_third_percentage),
          direct_sale_price_per_kg: convertToInputValue(product.direct_sale_price_per_kg),
          distributors_price_per_kg: convertToInputValue(product.distributors_price_per_kg),
          third_channel_price_per_kg: convertToInputValue(product.third_channel_price_per_kg),
        }));
        setProducts(loadedProducts);
      } else if (scenario.transformationData) {
        // Legacy single product format - convert to Product Mix format
        setProducts([{
          id: Date.now(),
          product_type: scenario.transformationData.product_type || 'queso_fresco',
          product_type_custom: scenario.transformationData.product_type_custom || '',
          distribution_percentage: '100',
          liters_per_kg_product: convertToInputValue(scenario.transformationData.liters_per_kg_product),
          processing_cost_per_liter: convertToInputValue(scenario.transformationData.processing_cost_per_liter),
          packaging_cost_per_kg: convertToInputValue(scenario.transformationData.packaging_cost_per_kg),
          sales_channel_direct_percentage: convertToInputValue(scenario.transformationData.sales_channel_direct_percentage) || '100',
          sales_channel_distributors_percentage: convertToInputValue(scenario.transformationData.sales_channel_distributors_percentage),
          sales_channel_third_percentage: convertToInputValue(scenario.transformationData.sales_channel_third_percentage),
          direct_sale_price_per_kg: convertToInputValue(scenario.transformationData.direct_sale_price_per_kg),
          distributors_price_per_kg: convertToInputValue(scenario.transformationData.distributors_price_per_kg),
          third_channel_price_per_kg: convertToInputValue(scenario.transformationData.third_channel_price_per_kg),
        }]);

        // Also set legacy state for backward compatibility
        setTransformationData({
          product_type: scenario.transformationData.product_type || 'queso_fresco',
          product_type_custom: scenario.transformationData.product_type_custom || '',
          liters_per_kg_product: convertToInputValue(scenario.transformationData.liters_per_kg_product),
          processing_cost_per_liter: convertToInputValue(scenario.transformationData.processing_cost_per_liter),
          packaging_cost_per_kg: convertToInputValue(scenario.transformationData.packaging_cost_per_kg),
          product_price_per_kg: convertToInputValue(scenario.transformationData.product_price_per_kg),
          sales_channel_direct_percentage: convertToInputValue(scenario.transformationData.sales_channel_direct_percentage) || '100',
          sales_channel_distributors_percentage: convertToInputValue(scenario.transformationData.sales_channel_distributors_percentage),
          sales_channel_third_percentage: convertToInputValue(scenario.transformationData.sales_channel_third_percentage),
          direct_sale_price_per_kg: convertToInputValue(scenario.transformationData.direct_sale_price_per_kg),
          distributors_price_per_kg: convertToInputValue(scenario.transformationData.distributors_price_per_kg),
          third_channel_price_per_kg: convertToInputValue(scenario.transformationData.third_channel_price_per_kg),
        });
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
        if (normalizedResults.product_revenue || normalizedResults.transformation_margin) {
          // Silently load results - user will see them in the UI
        }
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleProductionChange = (e) => {
    const { name, value } = e.target;
    const parsed = value === '' ? 0 : parseFloat(value);
    setProductionData(prev => ({
      ...prev,
      [name]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleCreateScenario = async () => {
    const defaultName = `${t('moduleTypes.transformation')} ${new Date().toLocaleDateString()}`;
    const scenarioName = window.prompt(
      t('scenarioNamePlaceholder'),
      defaultName
    );

    if (!scenarioName || !scenarioName.trim()) {
      return;
    }

    setCreatingScenario(true);
    try {
      const response = await api.post('/scenarios', {
        name: scenarioName.trim(),
        type: 'transformation',
      });

      const createdScenario = response.data;
      await loadScenarios();
      navigate('/module2', { state: { scenarioId: createdScenario.id }, replace: true });
      await loadScenario(createdScenario.id);
      setAlertModal({
        isOpen: true,
        message: t('scenarioCreated'),
        type: 'success'
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorCreatingScenario'),
        type: 'error'
      });
    } finally {
      setCreatingScenario(false);
    }
  };

  const handleInputFocus = (e) => {
    // Only select all text if field has a value, otherwise allow typing from scratch
    if (e.target.value && e.target.value !== '') {
      e.target.select();
    }
  };

  const handleTransformationChange = (e) => {
    const { name, value } = e.target;

    // Handle string fields (product_type, product_type_custom)
    if (name === 'product_type' || name === 'product_type_custom') {
      setTransformationData(prev => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    // Handle empty string - keep as empty string for free typing
    if (value === '' || value === null || value === undefined) {
      setTransformationData(prev => ({
        ...prev,
        [name]: '',
      }));
      return;
    }

    // Allow valid numeric input (including decimals)
    // Keep as string to allow free typing
    const validNumberPattern = /^-?\d*\.?\d*$/;
    if (!validNumberPattern.test(value)) {
      return; // Ignore invalid input
    }

    // Handle sales channel percentages - ensure they sum to 100
    if (name.includes('_percentage')) {
      const numValue = parseFloat(value) || 0;
      setTransformationData(prev => {
        const updated = { ...prev, [name]: value };

        // Calculate the third percentage to ensure sum is 100
        const directPct = name === 'sales_channel_direct_percentage' ? numValue : parseFloat(prev.sales_channel_direct_percentage) || 0;
        const distPct = name === 'sales_channel_distributors_percentage' ? numValue : parseFloat(prev.sales_channel_distributors_percentage) || 0;
        const thirdPct = name === 'sales_channel_third_percentage' ? numValue : parseFloat(prev.sales_channel_third_percentage) || 0;

        if (name === 'sales_channel_direct_percentage') {
          const remaining = 100 - numValue - distPct;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (name === 'sales_channel_distributors_percentage') {
          const remaining = 100 - directPct - numValue;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (name === 'sales_channel_third_percentage') {
          // If user sets third, adjust direct to maintain sum
          const remaining = 100 - directPct - distPct;
          if (remaining < 0) {
            const adjusted = Math.max(0, directPct + remaining);
            updated.sales_channel_direct_percentage = adjusted.toString();
          }
        }

        return updated;
      });
    } else {
      // Update numeric fields - keep as string
      setTransformationData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Product Mix handlers
  const handleAddProduct = () => {
    setProducts(prev => [...prev, {
      id: Date.now() + Math.random(),
      product_type: 'queso_fresco',
      product_type_custom: '',
      distribution_percentage: '',
      liters_per_kg_product: '',
      processing_cost_per_liter: '',
      processing_cost_per_kg: '',
      processing_cost_unit: 'liter',
      packaging_cost_per_liter: '',
      packaging_cost_per_kg: '',
      packaging_cost_unit: 'kg',
      sales_channel_direct_percentage: '100',
      sales_channel_distributors_percentage: '',
      sales_channel_third_percentage: '',
      direct_sale_price_per_kg: '',
      distributors_price_per_kg: '',
      third_channel_price_per_kg: '',
    }]);
  };

  const handleRemoveProduct = (productId) => {
    if (products.length <= 1) {
      setAlertModal({
        isOpen: true,
        message: t('atLeastOneProductRequired'),
        type: 'info'
      });
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleProductChange = (productId, fieldName, value) => {
    // Handle string fields (product_type, product_type_custom, unit fields) - no validation needed
    if (fieldName === 'product_type' || fieldName === 'product_type_custom' ||
      fieldName === 'processing_cost_unit' || fieldName === 'packaging_cost_unit') {
      setProducts(prev => prev.map(product =>
        product.id === productId ? { ...product, [fieldName]: value } : product
      ));
      return;
    }

    // Handle empty string - keep as empty string for free typing
    if (value === '' || value === null || value === undefined) {
      setProducts(prev => prev.map(product =>
        product.id === productId ? { ...product, [fieldName]: '' } : product
      ));
      return;
    }

    // Allow valid numeric input (including decimals)
    const validNumberPattern = /^-?\d*\.?\d*$/;
    if (!validNumberPattern.test(value)) {
      return; // Ignore invalid input
    }

    setProducts(prev => prev.map(product => {
      if (product.id !== productId) return product;

      const updated = { ...product, [fieldName]: value };

      // Handle sales channel percentages per product - auto-adjust third channel
      if (fieldName.includes('_percentage') && fieldName.startsWith('sales_channel_')) {
        const numValue = parseFloat(value) || 0;
        const directPct = fieldName === 'sales_channel_direct_percentage' ? numValue : parseFloat(product.sales_channel_direct_percentage) || 0;
        const distPct = fieldName === 'sales_channel_distributors_percentage' ? numValue : parseFloat(product.sales_channel_distributors_percentage) || 0;

        if (fieldName === 'sales_channel_direct_percentage') {
          const remaining = 100 - numValue - distPct;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (fieldName === 'sales_channel_distributors_percentage') {
          const remaining = 100 - directPct - numValue;
          updated.sales_channel_third_percentage = remaining >= 0 ? remaining.toString() : '0';
        } else if (fieldName === 'sales_channel_third_percentage') {
          // If user manually sets third, adjust direct to maintain sum
          const remaining = 100 - directPct - distPct;
          if (remaining < 0) {
            const adjusted = Math.max(0, directPct + remaining);
            updated.sales_channel_direct_percentage = adjusted.toString();
          }
        }
      }

      return updated;
    }));
  };

  // Helper function to parse numbers properly (handles 0 correctly)
  const toNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : defaultValue;
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

    const productionPayload = {
      daily_production_liters: toNumber(productionData.daily_production_liters, 0),
      production_days: Math.max(0, Math.round(toNumber(productionData.production_days, 0))),
      animals_count: Math.max(0, Math.round(toNumber(productionData.animals_count, 0))),
      feed_cost_per_liter: toNumber(productionData.feed_cost_per_liter, 0),
      labor_cost_per_liter: toNumber(productionData.labor_cost_per_liter, 0),
      health_cost_per_liter: toNumber(productionData.health_cost_per_liter, 0),
      infrastructure_cost_per_liter: toNumber(productionData.infrastructure_cost_per_liter, 0),
      other_costs_per_liter: toNumber(productionData.other_costs_per_liter, 0),
      milk_price_per_liter: toNumber(productionData.milk_price_per_liter, 0),
    };

    if (
      productionPayload.daily_production_liters <= 0 ||
      productionPayload.production_days <= 0 ||
      productionPayload.animals_count <= 0
    ) {
      setAlertModal({
        isOpen: true,
        message: t('module2ProductionBaseRequired'),
        type: 'info'
      });
      return;
    }

    // Validate distribution percentages sum to 100%
    const totalPercentage = products.reduce((sum, p) => sum + toNumber(p.distribution_percentage, 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setAlertModal({
        isOpen: true,
        message: t('distributionMustSum100').replace('{total}', totalPercentage.toFixed(2)),
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      // Save/update production baseline directly from Module 2
      // so this module can work independently from Module 1.
      await api.post(`/modules/production/${selectedScenario.id}`, productionPayload);

      // Convert products array to numbers before sending to API
      const productsToSave = products.map(product => {
        // Parse sales channel percentages (must handle 0 correctly)
        const directPct = toNumber(product.sales_channel_direct_percentage, 100);
        const distributorsPct = toNumber(product.sales_channel_distributors_percentage, 0);
        const thirdPct = toNumber(product.sales_channel_third_percentage, 0);

        // Validate sales channels sum to 100% for this product
        const salesChannelSum = directPct + distributorsPct + thirdPct;
        if (Math.abs(salesChannelSum - 100) > 0.01) {
          throw new Error(
            `Sales channel percentages for product "${product.product_type || 'product'}" must sum to 100%. Current sum: ${salesChannelSum.toFixed(2)}%`
          );
        }

        return {
          product_type: product.product_type,
          product_type_custom: product.product_type_custom || null,
          distribution_percentage: toNumber(product.distribution_percentage, 0),
          liters_per_kg_product: toNumber(product.liters_per_kg_product, 0),
          processing_cost_per_liter: toNumber(product.processing_cost_per_liter, 0),
          processing_cost_per_kg: toNumber(product.processing_cost_per_kg, 0),
          processing_cost_unit: product.processing_cost_unit || 'liter',
          packaging_cost_per_liter: toNumber(product.packaging_cost_per_liter, 0),
          packaging_cost_per_kg: toNumber(product.packaging_cost_per_kg, 0),
          packaging_cost_unit: product.packaging_cost_unit || 'kg',
          sales_channel_direct_percentage: directPct,
          sales_channel_distributors_percentage: distributorsPct,
          sales_channel_third_percentage: thirdPct,
          direct_sale_price_per_kg: product.direct_sale_price_per_kg ? toNumber(product.direct_sale_price_per_kg, null) : null,
          distributors_price_per_kg: product.distributors_price_per_kg ? toNumber(product.distributors_price_per_kg, null) : null,
          third_channel_price_per_kg: product.third_channel_price_per_kg ? toNumber(product.third_channel_price_per_kg, null) : null,
        };
      });

      // Send as Product Mix format (array of products)
      await api.post(`/modules/transformation/${selectedScenario.id}`, { products: productsToSave });
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
        message: error.message || error.response?.data?.error || t('errorSaving'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    // Calculate total milk production cost per liter (inherited from Module 1)
    const feedCost = Number(productionData.feed_cost_per_liter) || 0;
    const laborCost = Number(productionData.labor_cost_per_liter) || 0;
    const healthCost = Number(productionData.health_cost_per_liter) || 0;
    const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
    const otherCost = Number(productionData.other_costs_per_liter) || 0;
    const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;

    const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);

    // Calculate for Product Mix (multiple products)
    let totalProductRevenue = 0;
    let totalProcessingCost = 0;
    let totalPackagingCost = 0;
    let totalProductKg = 0;

    for (const product of products) {
      const distributionPct = parseFloat(product.distribution_percentage) || 0;
      const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;

      // Unit selection: processing and packaging costs can be per liter or per kg
      const processingCostUnit = product.processing_cost_unit || 'liter';
      const packagingCostUnit = product.packaging_cost_unit || 'kg';
      const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
      const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
      const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
      const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;

      // Calculate liters allocated to this product
      const productLiters = totalLiters * (distributionPct / 100);
      const productKg = productLiters / litersPerKg;

      // Calculate costs based on unit selection
      let productProcessingCost = 0;
      if (processingCostUnit === 'liter') {
        productProcessingCost = processingCostPerLiter * productLiters;
      } else if (processingCostUnit === 'kg') {
        productProcessingCost = processingCostPerKg * productKg;
      }

      let productPackagingCost = 0;
      if (packagingCostUnit === 'liter') {
        productPackagingCost = packagingCostPerLiter * productLiters;
      } else if (packagingCostUnit === 'kg') {
        productPackagingCost = packagingCostPerKg * productKg;
      }

      // Calculate revenue by sales channel for this product
      const directPct = (parseFloat(product.sales_channel_direct_percentage) || 0) / 100;
      const distPct = (parseFloat(product.sales_channel_distributors_percentage) || 0) / 100;
      const thirdPct = (parseFloat(product.sales_channel_third_percentage) || 0) / 100;

      const directPrice = parseFloat(product.direct_sale_price_per_kg) || 0;
      const distPrice = parseFloat(product.distributors_price_per_kg) || 0;
      const thirdPrice = parseFloat(product.third_channel_price_per_kg) || 0;

      const directKg = productKg * directPct;
      const distKg = productKg * distPct;
      const thirdKg = productKg * thirdPct;

      const directRevenue = directPrice * directKg;
      const distRevenue = distPrice * distKg;
      const thirdRevenue = thirdPrice * thirdKg;
      const productRevenue = directRevenue + distRevenue + thirdRevenue;

      totalProductRevenue += productRevenue;
      totalProcessingCost += productProcessingCost;
      totalPackagingCost += productPackagingCost;
      totalProductKg += productKg;
    }

    // Compare with direct milk sale
    const milkRevenue = (productionData.milk_price_per_liter || 0) * totalLiters;
    const milkProductionCost = totalMilkProductionCostPerLiter * totalLiters;
    const milkMargin = milkRevenue - milkProductionCost;
    const transformationMargin = totalProductRevenue - totalProcessingCost - totalPackagingCost - milkProductionCost;

    setResults({
      total_liters: totalLiters || 0,
      total_product_kg: totalProductKg || 0,
      product_revenue: totalProductRevenue || 0,
      processing_cost: totalProcessingCost || 0,
      packaging_cost: totalPackagingCost || 0,
      milk_revenue: milkRevenue || 0,
      milk_margin: milkMargin || 0,
      transformation_margin: transformationMargin || 0,
      better_option: transformationMargin > milkMargin ? 'transform' : 'sell_direct',
    });
  };

  const comparisonData = results ? [
    {
      name: t('rawMilkSale'),
      [t('income')]: Number(results.milk_revenue) || 0,
      [t('totalCosts')]: Number(results.milk_revenue - results.milk_margin) || 0,
      [t('margin')]: Number(results.milk_margin) || 0
    },
    {
      name: t('transformation'),
      [t('income')]: Number(results.product_revenue) || 0,
      [t('totalCosts')]: Number(results.product_revenue - results.transformation_margin) || 0,
      [t('margin')]: Number(results.transformation_margin) || 0
    },
  ].filter(item => !isNaN(item[t('income')]) && !isNaN(item[t('totalCosts')]) && !isNaN(item[t('margin')])) : [];

  const isProUser = ['pro', 'pro_user', 'premium', 'admin'].includes(user?.role);
  const hasModule2Access = isProUser || (user?.features || []).includes('module2');
  const hasProductionBaseline =
    (Number(productionData.daily_production_liters) || 0) > 0 &&
    (Number(productionData.production_days) || 0) > 0 &&
    (Number(productionData.animals_count) || 0) > 0;
  const infoIcon = '\u2139';
  const labelWithHelp = (label, tooltipText) => (
    <span className="field-label-with-help">
      <span>{label}</span>
      {tooltipText && (
        <span className="term-help-icon" title={tooltipText} aria-label={tooltipText}>
          {infoIcon}
        </span>
      )}
    </span>
  );

  if (!hasModule2Access) {
    return (
      <div className="container">
        <div className="card" style={{ border: '2px solid var(--accent-warning)', background: 'var(--bg-secondary)' }}>
          <h2 style={{ marginBottom: '12px' }}>{'\u{1F512}'} {t('module2Title')}</h2>
          <div className="upgrade-info-block" style={{ marginBottom: '14px' }}>
            <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              <span className="term-help-icon" aria-hidden="true">{infoIcon}</span>
              {t('module2BasicSimulationMessage')}
            </p>
            <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={() => navigate('/profile')}>
              {t('unlockFullAnalysis')}
            </button>
          </div>
          <div className="blocked-preview-grid" style={{ marginTop: '14px', marginBottom: '14px' }}>
            <div className="blocked-preview-card">
              <h4>{'\u{1F512}'} {t('productMix')}</h4>
              <p>{t('module2ProductTableNote')}</p>
            </div>
            <div className="blocked-preview-card">
              <h4>{'\u{1F512}'} {t('salesChannels')}</h4>
              <p>{t('salesChannelsNote')}</p>
            </div>
            <div className="blocked-preview-card">
              <h4>{'\u{1F512}'} {t('chartViewType')}</h4>
              <p>{t('module2CompareSubtitle')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginTop: '20px' }}>{t('module2Title')}</h1>
        <div style={{
          marginTop: '16px',
          padding: '18px 24px',
          background: 'var(--bg-tertiary)',
          borderRadius: '12px',
          borderLeft: '4px solid var(--accent-info)',
          boxShadow: '0 2px 8px var(--shadow-color)'
        }}>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
            {t('module2Explanation')}
          </p>
        </div>
      </header>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{t('selectScenario')}</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCreateScenario}
            disabled={creatingScenario}
          >
            {creatingScenario ? (t('creating')) : `+ ${t('createScenario')}`}
          </button>
        </div>
        <select
          value={selectedScenario?.id || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (id) {
              navigate(`/module2`, { state: { scenarioId: id }, replace: true });
              loadScenario(id);
            }
          }}
          style={{ marginBottom: '20px' }}
        >
          <option value="">{t('selectScenarioPlaceholder')}</option>
          {scenarios.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({t(`moduleTypes.${s.type}`) || s.type})
            </option>
          ))}
        </select>
        {scenarios.length === 0 && (
          <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '0.92rem' }}>
            {t('noScenarios')}.
          </p>
        )}
      </div>

      {selectedScenario && (
        <>
          <div className="card">
            <h2>{t('baseProductionData')}</h2>
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              background: hasProductionBaseline ? 'rgba(22, 163, 74, 0.1)' : 'rgba(37, 99, 235, 0.1)',
              borderRadius: '8px',
              border: `1px solid ${hasProductionBaseline ? 'var(--accent-success)' : 'var(--accent-info)'}`
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.9em',
                color: hasProductionBaseline ? 'var(--accent-success)' : 'var(--accent-info)',
                fontWeight: '500'
              }}>
                <strong>{t('note')}:</strong> {hasProductionBaseline ? t('inheritedFromModule1') : t('module2StandaloneMode')}
              </p>
            </div>
            <div className="pedagogy-block" style={{ marginBottom: '18px' }}>
              <p className="pedagogy-title">{t('module2CompareSubtitle')}</p>
              <ul className="pedagogy-list">
                <li>{`${t('totalDistribution')} = 100%`}</li>
                <li>{`${t('totalProductionCost')} = ${t('totalMilkCost')} + ${t('totalProcessingCost')} + ${t('totalPackagingCost')}`}</li>
                <li>{`${t('margin')} = ${t('income')} - ${t('totalCosts')}`}</li>
                <li>{t('module2PedagogyPracticalTip')}</li>
              </ul>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div className="form-group">
                <label>{labelWithHelp(t('dailyProduction'), `${t('dailyProduction')} x ${t('productionDays')} x ${t('animalsCount')}`)}</label>
                <input
                  type="number"
                  name="daily_production_liters"
                  value={productionData.daily_production_liters}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('productionDays'), `${t('productionDays')} (${t('perLactation')})`)}</label>
                <input
                  type="number"
                  name="production_days"
                  value={productionData.production_days}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="1"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('animalsCount'), `${t('animalsCount')} (${t('lactationCycle')})`)}</label>
                <input
                  type="number"
                  name="animals_count"
                  value={productionData.animals_count}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="1"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('milkPriceForComparison'), `${t('milkPriceForComparison')} (${t('rawMilkSale')})`)}</label>
                <input
                  type="number"
                  name="milk_price_per_liter"
                  value={productionData.milk_price_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('feedCost'), `${t('feedCost')} (${t('perLiter')})`)}</label>
                <input
                  type="number"
                  name="feed_cost_per_liter"
                  value={productionData.feed_cost_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('laborCost'), `${t('laborCost')} (${t('perLiter')})`)}</label>
                <input
                  type="number"
                  name="labor_cost_per_liter"
                  value={productionData.labor_cost_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('healthCost'), `${t('healthCost')} (${t('perLiter')})`)}</label>
                <input
                  type="number"
                  name="health_cost_per_liter"
                  value={productionData.health_cost_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('infrastructureCost'), `${t('infrastructureCost')} (${t('perLiter')})`)}</label>
                <input
                  type="number"
                  name="infrastructure_cost_per_liter"
                  value={productionData.infrastructure_cost_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>{labelWithHelp(t('otherCosts'), `${t('otherCosts')} (${t('perLiter')})`)}</label>
                <input
                  type="number"
                  name="other_costs_per_liter"
                  value={productionData.other_costs_per_liter}
                  onChange={handleProductionChange}
                  onFocus={handleInputFocus}
                  step="0.01"
                />
              </div>
            </div>
            <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong>{labelWithHelp(t('milkProductionCostPerLiter'), `${t('feedCost')} + ${t('laborCost')} + ${t('healthCost')} + ${t('infrastructureCost')} + ${t('otherCosts')}`)}:</strong>{' '}
              {(
                (Number(productionData.feed_cost_per_liter) || 0) +
                (Number(productionData.labor_cost_per_liter) || 0) +
                (Number(productionData.health_cost_per_liter) || 0) +
                (Number(productionData.infrastructure_cost_per_liter) || 0) +
                (Number(productionData.other_costs_per_liter) || 0)
              ).toFixed(2)}
            </div>
            <p className="input-hint" style={{ marginTop: '8px' }}>
              {t('module2MilkCostInterpretationHint')}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{t('productMix')}</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddProduct}
                style={{ padding: '8px 16px', fontSize: '0.9em' }}
              >
                + {t('addProduct')}
              </button>
            </div>

            {/* Total Distribution Validation */}
            {(() => {
              const totalDistribution = products.reduce((sum, p) => sum + (parseFloat(p.distribution_percentage) || 0), 0);
              return (
                <div style={{ marginBottom: '20px', padding: '12px', background: totalDistribution === 100 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', borderRadius: '8px', border: `1px solid ${totalDistribution === 100 ? 'var(--accent-success)' : 'var(--accent-error)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ color: totalDistribution === 100 ? 'var(--accent-success)' : 'var(--accent-error)' }}>
                      {t('totalDistribution')}:
                    </strong>
                    <span style={{
                      fontWeight: 'bold',
                      fontSize: '1.1em',
                      color: totalDistribution === 100 ? 'var(--accent-success)' : 'var(--accent-error)'
                    }}>
                      {totalDistribution.toFixed(2)}%
                    </span>
                  </div>
                  {totalDistribution !== 100 && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.85em', color: 'var(--accent-error)' }}>
                      {t('distributionMustSum100').replace('{total}', totalDistribution.toFixed(2))}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Products List */}
            {products.map((product, index) => (
              <div
                key={product.id}
                style={{
                  marginBottom: '30px',
                  padding: '20px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {t('products')} #{index + 1}
                    {product.product_type_custom && (
                      <span style={{ marginLeft: '10px', color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.9em' }}>
                        ({product.product_type_custom})
                      </span>
                    )}
                  </h4>
                  {products.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleRemoveProduct(product.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.85em',
                        background: 'var(--accent-error)',
                        color: 'var(--text-inverse)',
                        border: 'none'
                      }}
                    >
                      {t('removeProduct')}
                    </button>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px'
                }}>
                  <div className="form-group">
                    <label>{t('productType')}</label>
                    <select
                      value={product.product_type}
                      onChange={(e) => handleProductChange(product.id, 'product_type', e.target.value)}
                    >
                      <option value="queso_fresco">{t('productTypes.queso_fresco')}</option>
                      <option value="queso_crema">{t('productTypes.queso_crema')}</option>
                      <option value="queso_semimadurado">{t('productTypes.queso_semimadurado')}</option>
                      <option value="queso_madurado">{t('productTypes.queso_madurado')}</option>
                      <option value="yogurt">{t('productTypes.yogurt')}</option>
                      <option value="otro">{t('productTypes.otro')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{t('distributionPercentage')}</label>
                    <input
                      type="number"
                      value={product.distribution_percentage}
                      onChange={(e) => handleProductChange(product.id, 'distribution_percentage', e.target.value)}
                      onFocus={handleInputFocus}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>

                  {product.product_type === 'otro' && (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>{t('customProductName')}</label>
                      <input
                        type="text"
                        value={product.product_type_custom || ''}
                        onChange={(e) => handleProductChange(product.id, 'product_type_custom', e.target.value)}
                        placeholder={t('enterProductName')}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>{t('litersPerKg')}</label>
                    <input
                      type="number"
                      value={product.liters_per_kg_product}
                      onChange={(e) => handleProductChange(product.id, 'liters_per_kg_product', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                      {t('processingCost')}
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '500' }}>{t('unitLabel')}:</label>
                        <select
                          value={product.processing_cost_unit || 'liter'}
                          onChange={(e) => handleProductChange(product.id, 'processing_cost_unit', e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '2px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            fontWeight: '600',
                            background: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent-success)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        >
                          <option value="liter">{`${currencySymbol}/L (${t('perLiter')})`}</option>
                          <option value="kg">{`${currencySymbol}/kg (${t('perKilogram')})`}</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {`${t('costByUnit')} ${product.processing_cost_unit === 'liter' ? t('perLiter') : t('perKilogram')}:`}
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={product.processing_cost_unit === 'kg' ? product.processing_cost_per_kg : product.processing_cost_per_liter}
                            onChange={(e) => {
                              const field = product.processing_cost_unit === 'kg' ? 'processing_cost_per_kg' : 'processing_cost_per_liter';
                              handleProductChange(product.id, field, e.target.value);
                            }}
                            onFocus={handleInputFocus}
                            step="0.01"
                            placeholder={product.processing_cost_unit === 'liter' ? t('processingCostPlaceholderLiter') : t('processingCostPlaceholderKg')}
                            style={{
                              padding: '8px 45px 8px 12px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '0.95em',
                              width: '100%'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            color: 'var(--text-tertiary)',
                            fontWeight: '600',
                            fontSize: '0.9em',
                            pointerEvents: 'none'
                          }}>
                            {product.processing_cost_unit === 'liter' ? `${currencySymbol}/L` : `${currencySymbol}/kg`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(37, 99, 235, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid var(--accent-info)',
                      fontSize: '0.85em',
                      color: 'var(--accent-info)'
                    }}>
                      <strong>{t('note')}:</strong> {product.processing_cost_unit === 'liter'
                        ? t('processingCostHelpLiter')
                        : t('processingCostHelpKg')}
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                      {t('packagingCost')}
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '500' }}>{t('unitLabel')}:</label>
                        <select
                          value={product.packaging_cost_unit || 'kg'}
                          onChange={(e) => handleProductChange(product.id, 'packaging_cost_unit', e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '2px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            fontWeight: '600',
                            background: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent-success)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        >
                          <option value="liter">{`${currencySymbol}/L (${t('perLiter')})`}</option>
                          <option value="kg">{`${currencySymbol}/kg (${t('perKilogram')})`}</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {`${t('costByUnit')} ${product.packaging_cost_unit === 'liter' ? t('perLiter') : t('perKilogram')}:`}
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={product.packaging_cost_unit === 'liter' ? product.packaging_cost_per_liter : product.packaging_cost_per_kg}
                            onChange={(e) => {
                              const field = product.packaging_cost_unit === 'liter' ? 'packaging_cost_per_liter' : 'packaging_cost_per_kg';
                              handleProductChange(product.id, field, e.target.value);
                            }}
                            onFocus={handleInputFocus}
                            step="0.01"
                            placeholder={product.packaging_cost_unit === 'liter' ? t('packagingCostPlaceholderLiter') : t('packagingCostPlaceholderKg')}
                            style={{
                              padding: '8px 45px 8px 12px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '0.95em',
                              width: '100%'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '12px',
                            color: 'var(--text-tertiary)',
                            fontWeight: '600',
                            fontSize: '0.9em',
                            pointerEvents: 'none'
                          }}>
                            {product.packaging_cost_unit === 'liter' ? `${currencySymbol}/L` : `${currencySymbol}/kg`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(22, 163, 74, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid var(--accent-success)',
                      fontSize: '0.85em',
                      color: 'var(--accent-success)'
                    }}>
                      <strong>{t('note')}:</strong> {product.packaging_cost_unit === 'liter'
                        ? t('packagingCostHelpLiter')
                        : t('packagingCostHelpKg')}
                    </div>
                  </div>
                </div>

                {/* Sales Channels for this product */}
                <h4 style={{ marginTop: '25px', marginBottom: '15px', fontSize: '1em', color: 'var(--text-secondary)' }}>
                  {t('salesChannels')}
                </h4>
                <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px', border: '1px solid var(--accent-warning)', fontSize: '0.9em' }}>
                  <strong>{t('note')}:</strong> {t('salesChannelsNote')}
                </div>
                {(() => {
                  const totalChannelPct = parseFloat(product.sales_channel_direct_percentage || 0) +
                    parseFloat(product.sales_channel_distributors_percentage || 0) +
                    parseFloat(product.sales_channel_third_percentage || 0);
                  return (
                    <div style={{ marginBottom: '15px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong>{t('total')}:</strong>
                        <span style={{
                          fontWeight: 'bold',
                          color: totalChannelPct === 100 ? 'green' : 'red'
                        }}>
                          {totalChannelPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px'
                }}>
                  <div className="form-group">
                    <label>{t('directSalePercentage')}</label>
                    <input
                      type="number"
                      value={product.sales_channel_direct_percentage}
                      onChange={(e) => handleProductChange(product.id, 'sales_channel_direct_percentage', e.target.value)}
                      onFocus={handleInputFocus}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('directSalePrice')}</label>
                    <input
                      type="number"
                      value={product.direct_sale_price_per_kg}
                      onChange={(e) => handleProductChange(product.id, 'direct_sale_price_per_kg', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('distributorsPercentage')}</label>
                    <input
                      type="number"
                      value={product.sales_channel_distributors_percentage}
                      onChange={(e) => handleProductChange(product.id, 'sales_channel_distributors_percentage', e.target.value)}
                      onFocus={handleInputFocus}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('distributorsPrice')}</label>
                    <input
                      type="number"
                      value={product.distributors_price_per_kg}
                      onChange={(e) => handleProductChange(product.id, 'distributors_price_per_kg', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('thirdChannelPercentage')}</label>
                    <input
                      type="number"
                      value={product.sales_channel_third_percentage}
                      onChange={(e) => handleProductChange(product.id, 'sales_channel_third_percentage', e.target.value)}
                      onFocus={handleInputFocus}
                      min="0"
                      max="100"
                      step="0.01"
                      readOnly
                      style={{ background: 'var(--bg-tertiary)' }}
                    />
                    <small style={{ color: 'var(--text-tertiary)', fontSize: '0.85em', display: 'block', marginTop: '5px' }}>{t('autoCalculated')}</small>
                  </div>
                  <div className="form-group">
                    <label>{t('thirdChannelPrice')}</label>
                    <input
                      type="number"
                      value={product.third_channel_price_per_kg}
                      onChange={(e) => handleProductChange(product.id, 'third_channel_price_per_kg', e.target.value)}
                      onFocus={handleInputFocus}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}

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
              {/* Results loaded indicator */}
              {selectedScenario?.results && (
                <div className="card" style={{ background: 'rgba(22, 163, 74, 0.1)', border: '1px solid var(--accent-success)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-success)' }}>
                    <strong>{t('autoLoadedResults')}</strong>
                  </div>
                </div>
              )}

              {/* Cost Breakdown Section */}
              <div className="card">
                <h2>{t('productionCostBreakdown')}</h2>
                {(() => {
                  const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);

                  // Calculate total milk production cost per liter (sum of all costs from Module 1)
                  const feedCost = Number(productionData.feed_cost_per_liter) || 0;
                  const laborCost = Number(productionData.labor_cost_per_liter) || 0;
                  const healthCost = Number(productionData.health_cost_per_liter) || 0;
                  const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
                  const otherCost = Number(productionData.other_costs_per_liter) || 0;
                  const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;

                  // Calculate aggregated totals across all products
                  let totalProductKg = 0;
                  let totalProductLiters = 0;
                  let totalProcessingCost = 0;
                  let totalPackagingCost = 0;
                  let totalMilkCost = 0;

                  const productBreakdowns = products.map(product => {
                    const distributionPct = parseFloat(product.distribution_percentage) || 0;
                    const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;

                    const processingCostUnit = product.processing_cost_unit || 'liter';
                    const packagingCostUnit = product.packaging_cost_unit || 'kg';
                    const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
                    const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
                    const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
                    const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;

                    const productLiters = totalLiters * (distributionPct / 100);
                    const productKg = productLiters / litersPerKg;

                    let productProcessingCost = 0;
                    if (processingCostUnit === 'liter') {
                      productProcessingCost = processingCostPerLiter * productLiters;
                    } else if (processingCostUnit === 'kg') {
                      productProcessingCost = processingCostPerKg * productKg;
                    }

                    let productPackagingCost = 0;
                    if (packagingCostUnit === 'liter') {
                      productPackagingCost = packagingCostPerLiter * productLiters;
                    } else if (packagingCostUnit === 'kg') {
                      productPackagingCost = packagingCostPerKg * productKg;
                    }

                    const productMilkCost = totalMilkProductionCostPerLiter * productLiters;
                    const totalProductCost = productMilkCost + productProcessingCost + productPackagingCost;
                    const costPerKg = productKg > 0 ? totalProductCost / productKg : 0;

                    totalProductKg += productKg;
                    totalProductLiters += productLiters;
                    totalProcessingCost += productProcessingCost;
                    totalPackagingCost += productPackagingCost;
                    totalMilkCost += productMilkCost;

                    return {
                      product,
                      productLiters,
                      productKg,
                      productMilkCost,
                      productProcessingCost,
                      productPackagingCost,
                      totalProductCost,
                      costPerKg,
                    };
                  });

                  const totalCosts = totalMilkCost + totalProcessingCost + totalPackagingCost;
                  const averageCostPerKg = totalProductKg > 0 ? totalCosts / totalProductKg : 0;

                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.1em', marginBottom: '15px' }}>{t('consolidatedSummary')}</h3>
                      <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="table numeric-table" style={{ minWidth: '400px' }}>
                          <tbody>
                            <tr>
                              <td><strong>{t('milkProductionCostPerLiter')}</strong></td>
                              <td>{formatMoney(totalMilkProductionCostPerLiter)} ({t('inheritedFromModule1')})</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalLitersTransformed')}</strong></td>
                              <td>{totalProductLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalKgProduced')}</strong></td>
                              <td>{totalProductKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalMilkCost')}</strong></td>
                              <td>{formatMoney(totalMilkCost)}</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalProcessingCost')}</strong></td>
                              <td>{formatMoney(totalProcessingCost)}</td>
                            </tr>
                            <tr>
                              <td><strong>{t('totalPackagingCost')}</strong></td>
                              <td>{formatMoney(totalPackagingCost)}</td>
                            </tr>
                            <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                              <td><strong>{t('totalProductionCost')}</strong></td>
                              <td><strong>{formatMoney(totalCosts)}</strong></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {products.length > 1 && (
                        <div>
                          <h3 style={{ fontSize: '1.1em', marginTop: '25px', marginBottom: '15px' }}>{t('costPerKgByProduct')}</h3>
                          <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table className="table numeric-table" style={{ minWidth: '700px' }}>
                              <thead>
                                <tr>
                                  <th>{t('product')}</th>
                                  <th>{t('productTableLiters')}</th>
                                  <th>{t('productTableKg')}</th>
                                  <th>{t('productTableMilkCost')}</th>
                                  <th>{t('productTableProcCost')}</th>
                                  <th>{t('productTablePackCost')}</th>
                                  <th>{t('productTableTotal')}</th>
                                  <th>{t('productTableCostPerKg')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productBreakdowns.map((bd, idx) => (
                                  <tr key={idx}>
                                    <td>{bd.product.product_type_custom || t(`productTypes.${bd.product.product_type}`) || bd.product.product_type}</td>
                                    <td>{bd.productLiters.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</td>
                                    <td>{bd.productKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</td>
                                    <td>{formatMoney(bd.productMilkCost)}</td>
                                    <td>{formatMoney(bd.productProcessingCost)}</td>
                                    <td>{formatMoney(bd.productPackagingCost)}</td>
                                    <td>{formatMoney(bd.totalProductCost)}</td>
                                    <td><strong>{formatMoney(bd.costPerKg)}</strong></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ marginTop: '15px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.9em' }}>
                            <strong>{t('weightedAverageCostPerKg')}</strong>: {formatMoney(averageCostPerKg)} / kg
                            <br />
                            <small style={{ color: 'var(--text-secondary)' }}>{t('note')}: {t('weightedAverageCostPerKg')}</small>
                          </div>
                        </div>
                      )}
                      {products.length === 1 && (
                        <div style={{ marginTop: '15px', padding: '12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '0.9em' }}>
                          <strong>{t('weightedAverageCostPerKg')}</strong>: {formatMoney(averageCostPerKg)} / kg
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Channel Margins Section */}
              <div className="card">
                <h2>{t('channelMargins')}</h2>
                {(() => {
                  const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);

                  // Calculate total milk production cost per liter (inherited from Module 1)
                  const feedCost = Number(productionData.feed_cost_per_liter) || 0;
                  const laborCost = Number(productionData.labor_cost_per_liter) || 0;
                  const healthCost = Number(productionData.health_cost_per_liter) || 0;
                  const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
                  const otherCost = Number(productionData.other_costs_per_liter) || 0;
                  const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;

                  // Aggregate channel data across all products
                  const channelData = {
                    direct: { kg: 0, revenue: 0, percentage: 0 },
                    distributors: { kg: 0, revenue: 0, percentage: 0 },
                    third: { kg: 0, revenue: 0, percentage: 0 },
                  };

                  let totalProductKg = 0;
                  let totalCosts = 0;

                  products.forEach(product => {
                    const distributionPct = parseFloat(product.distribution_percentage) || 0;
                    const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;

                    const processingCostUnit = product.processing_cost_unit || 'liter';
                    const packagingCostUnit = product.packaging_cost_unit || 'kg';
                    const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
                    const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
                    const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
                    const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;

                    const productLiters = totalLiters * (distributionPct / 100);
                    const productKg = productLiters / litersPerKg;

                    let productProcessingCost = 0;
                    if (processingCostUnit === 'liter') {
                      productProcessingCost = processingCostPerLiter * productLiters;
                    } else if (processingCostUnit === 'kg') {
                      productProcessingCost = processingCostPerKg * productKg;
                    }

                    let productPackagingCost = 0;
                    if (packagingCostUnit === 'liter') {
                      productPackagingCost = packagingCostPerLiter * productLiters;
                    } else if (packagingCostUnit === 'kg') {
                      productPackagingCost = packagingCostPerKg * productKg;
                    }

                    const productMilkCost = totalMilkProductionCostPerLiter * productLiters;
                    const productTotalCost = productMilkCost + productProcessingCost + productPackagingCost;

                    totalProductKg += productKg;
                    totalCosts += productTotalCost;

                    // Distribute product across channels
                    const directPct = parseFloat(product.sales_channel_direct_percentage) || 0;
                    const distPct = parseFloat(product.sales_channel_distributors_percentage) || 0;
                    const thirdPct = parseFloat(product.sales_channel_third_percentage) || 0;

                    const directKg = productKg * (directPct / 100);
                    const distKg = productKg * (distPct / 100);
                    const thirdKg = productKg * (thirdPct / 100);

                    const directPrice = parseFloat(product.direct_sale_price_per_kg) || 0;
                    const distPrice = parseFloat(product.distributors_price_per_kg) || 0;
                    const thirdPrice = parseFloat(product.third_channel_price_per_kg) || 0;

                    channelData.direct.kg += directKg;
                    channelData.direct.revenue += directPrice * directKg;
                    channelData.distributors.kg += distKg;
                    channelData.distributors.revenue += distPrice * distKg;
                    channelData.third.kg += thirdKg;
                    channelData.third.revenue += thirdPrice * thirdKg;
                  });

                  // Calculate weighted average prices and percentages
                  channelData.direct.percentage = totalProductKg > 0 ? (channelData.direct.kg / totalProductKg) * 100 : 0;
                  channelData.distributors.percentage = totalProductKg > 0 ? (channelData.distributors.kg / totalProductKg) * 100 : 0;
                  channelData.third.percentage = totalProductKg > 0 ? (channelData.third.kg / totalProductKg) * 100 : 0;

                  const averageCostPerKg = totalProductKg > 0 ? totalCosts / totalProductKg : 0;

                  // Calculate product details per channel
                  const getProductDetailsPerChannel = (channelKey) => {
                    return products.map(product => {
                      const distributionPct = parseFloat(product.distribution_percentage) || 0;
                      const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                      const productLiters = totalLiters * (distributionPct / 100);
                      const productKg = productLiters / litersPerKg;

                      const processingCostUnit = product.processing_cost_unit || 'liter';
                      const packagingCostUnit = product.packaging_cost_unit || 'kg';
                      const processingCostPerLiter = parseFloat(product.processing_cost_per_liter) || 0;
                      const processingCostPerKg = parseFloat(product.processing_cost_per_kg) || 0;
                      const packagingCostPerLiter = parseFloat(product.packaging_cost_per_liter) || 0;
                      const packagingCostPerKg = parseFloat(product.packaging_cost_per_kg) || 0;

                      let productProcessingCost = 0;
                      if (processingCostUnit === 'liter') {
                        productProcessingCost = processingCostPerLiter * productLiters;
                      } else if (processingCostUnit === 'kg') {
                        productProcessingCost = processingCostPerKg * productKg;
                      }

                      let productPackagingCost = 0;
                      if (packagingCostUnit === 'liter') {
                        productPackagingCost = packagingCostPerLiter * productLiters;
                      } else if (packagingCostUnit === 'kg') {
                        productPackagingCost = packagingCostPerKg * productKg;
                      }

                      const productMilkCost = totalMilkProductionCostPerLiter * productLiters;
                      const productTotalCost = productMilkCost + productProcessingCost + productPackagingCost;
                      const productCostPerKg = productKg > 0 ? productTotalCost / productKg : 0;

                      const directPct = parseFloat(product.sales_channel_direct_percentage) || 0;
                      const distPct = parseFloat(product.sales_channel_distributors_percentage) || 0;
                      const thirdPct = parseFloat(product.sales_channel_third_percentage) || 0;

                      let channelKg = 0;
                      let channelPrice = 0;

                      if (channelKey === 'direct') {
                        channelKg = productKg * (directPct / 100);
                        channelPrice = parseFloat(product.direct_sale_price_per_kg) || 0;
                      } else if (channelKey === 'distributors') {
                        channelKg = productKg * (distPct / 100);
                        channelPrice = parseFloat(product.distributors_price_per_kg) || 0;
                      } else if (channelKey === 'third') {
                        channelKg = productKg * (thirdPct / 100);
                        channelPrice = parseFloat(product.third_channel_price_per_kg) || 0;
                      }

                      const unitMargin = channelPrice - productCostPerKg;
                      const unitMarginPercent = channelPrice > 0 ? (unitMargin / channelPrice) * 100 : 0;
                      const totalRevenue = channelPrice * channelKg;
                      const totalCost = productCostPerKg * channelKg;
                      const totalMarginDollars = totalRevenue - totalCost;

                      return {
                        productName: product.product_type_custom || t(`productTypes.${product.product_type}`) || product.product_type,
                        kg: channelKg,
                        price: channelPrice,
                        unitCost: productCostPerKg,
                        unitMargin,
                        unitMarginPercent,
                        totalRevenue,
                        totalMarginDollars,
                      };
                    }).filter(detail => detail.kg > 0); // Only show products that have kg in this channel
                  };

                  const channels = [
                    {
                      key: 'direct',
                      name: t('salesChannelDirect'),
                      percentage: channelData.direct.percentage,
                      price: channelData.direct.kg > 0 ? channelData.direct.revenue / channelData.direct.kg : 0,
                      kg: channelData.direct.kg,
                      revenue: channelData.direct.revenue,
                    },
                    {
                      key: 'distributors',
                      name: t('salesChannelDistributors'),
                      percentage: channelData.distributors.percentage,
                      price: channelData.distributors.kg > 0 ? channelData.distributors.revenue / channelData.distributors.kg : 0,
                      kg: channelData.distributors.kg,
                      revenue: channelData.distributors.revenue,
                    },
                    {
                      key: 'third',
                      name: t('salesChannelThird'),
                      percentage: channelData.third.percentage,
                      price: channelData.third.kg > 0 ? channelData.third.revenue / channelData.third.kg : 0,
                      kg: channelData.third.kg,
                      revenue: channelData.third.revenue,
                    }
                  ];

                  return (
                    <>
                      <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '6px', border: '1px solid var(--accent-info)', fontSize: '0.9em' }}>
                        <strong>{t('note')}:</strong> {t('module2ProductTableNote')}
                      </div>
                      <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table className="table numeric-table" style={{ minWidth: '800px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '30px' }}></th>
                              <th>{t('concept')}</th>
                              <th>% {t('salesChannels')}</th>
                              <th>{t('kgL')}</th>
                              <th>{t('salesPrice')}</th>
                              <th style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>{t('costAverage')}</th>
                              <th>{t('marginPerKg')}</th>
                              <th>{t('marginPercent')}</th>
                              <th>{t('totalIncome')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {channels.map((channel, idx) => {
                              const margin = channel.price - averageCostPerKg;
                              const marginPercent = channel.price > 0 ? (margin / channel.price) * 100 : 0;
                              const totalMargin = channel.revenue - (averageCostPerKg * channel.kg);
                              const isExpanded = expandedChannels[channel.key] ?? true; // Auto-expand by default
                              const productDetails = getProductDetailsPerChannel(channel.key);

                              return (
                                <Fragment key={idx}>
                                  <tr style={{
                                    opacity: channel.percentage === 0 ? 0.5 : 1,
                                    background: 'var(--bg-tertiary)',
                                    fontWeight: 'normal'
                                  }}>
                                    <td style={{ cursor: 'pointer', textAlign: 'center' }}>
                                      {productDetails.length > 0 && (
                                        <button
                                          onClick={() => setExpandedChannels(prev => ({
                                            ...prev,
                                            [channel.key]: !prev[channel.key]
                                          }))}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '1.2em',
                                            cursor: 'pointer',
                                            padding: '0 5px'
                                          }}
                                        >
                                          {isExpanded ? 'â–¼' : 'â–¶'}
                                        </button>
                                      )}
                                    </td>
                                    <td><strong>{channel.name}</strong></td>
                                    <td>{channel.percentage.toFixed(1)}%</td>
                                    <td>{channel.kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    <td
                                      colSpan="5"
                                      style={{
                                        fontStyle: 'italic',
                                        color: 'var(--text-secondary)',
                                        cursor: productDetails.length > 0 ? 'pointer' : 'default',
                                        textDecoration: productDetails.length > 0 ? 'underline' : 'none'
                                      }}
                                      onClick={productDetails.length > 0 ? () => setExpandedChannels(prev => ({
                                        ...prev,
                                        [channel.key]: !prev[channel.key]
                                      })) : undefined}
                                      onMouseEnter={(e) => {
                                        if (productDetails.length > 0) {
                                          e.target.style.color = 'var(--accent-primary)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (productDetails.length > 0) {
                                          e.target.style.color = 'var(--text-secondary)';
                                        }
                                      }}
                                    >
                                      {productDetails.length > 1 ? t('clickToSeeProductDetails') : t('seeProductDetailsBelow')}
                                    </td>
                                  </tr>
                                  {isExpanded && productDetails.length > 0 && productDetails.map((detail, detailIdx) => (
                                    <tr key={`${idx}-${detailIdx}`} style={{
                                      borderBottom: detailIdx === productDetails.length - 1 ? 'none' : '1px solid var(--border-color)',
                                      background: 'var(--bg-secondary)'
                                    }}>
                                      <td></td>
                                      <td style={{ paddingLeft: '30px' }}>{detail.productName}</td>
                                      <td>-</td>
                                      <td>{detail.kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                      <td style={{ fontWeight: 'bold' }}>{formatMoney(detail.price)}</td>
                                      <td style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>{formatMoney(detail.unitCost)}</td>
                                      <td style={{
                                        color: detail.unitMargin >= 0 ? 'green' : 'red',
                                        fontWeight: 'bold',
                                        fontSize: '1.05em'
                                      }}>
                                        {formatMoney(detail.unitMargin)}
                                      </td>
                                      <td style={{
                                        color: detail.unitMarginPercent >= 0 ? 'green' : 'red',
                                        fontWeight: 'bold',
                                        fontSize: '1.05em'
                                      }}>
                                        {detail.unitMarginPercent.toFixed(1)}%
                                      </td>
                                      <td>{formatMoney(detail.totalRevenue)}</td>
                                    </tr>
                                  ))}
                                  {/* Weighted Average Summary Row (Secondary) */}
                                  {isExpanded && productDetails.length > 1 && (
                                    <tr style={{
                                      background: 'var(--bg-tertiary)',
                                      borderTop: '1px dashed var(--border-color)',
                                      fontStyle: 'italic',
                                      fontSize: '0.95em'
                                    }}>
                                      <td></td>
                                      <td style={{ paddingLeft: '30px', color: 'var(--text-secondary)' }}>
                                        <small>{t('weightedAverageMix')}</small>
                                      </td>
                                      <td>-</td>
                                      <td><small>{channel.kg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</small></td>
                                      <td style={{ color: 'var(--text-secondary)' }}>
                                        <small>{formatMoney(channel.price > 0 ? channel.price : 0)}</small>
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)' }}>
                                        <small>{formatMoney(averageCostPerKg)}</small>
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)' }}>
                                        <small>{formatMoney(margin)}</small>
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)' }}>
                                        <small>{marginPercent.toFixed(1)}%</small>
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)' }}>
                                        <small>{formatMoney(channel.revenue)}</small>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                            <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold', background: '#f5f5f5' }}>
                              <td colSpan="2"><strong>{t('total')}</strong></td>
                              <td>100%</td>
                              <td>{totalProductKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td colSpan="4" style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9em' }}>
                                {t('totalAcrossAllChannels')}
                              </td>
                              <td>{formatMoney((channels[0].revenue + channels[1].revenue + channels[2].revenue))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="card">
                <h2>{t('comparison')}</h2>
                <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.95em', fontWeight: 'bold', color: 'var(--accent-warning)' }}>
                    {t('note')}: {t('whatAreWeComparing')}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    <li><strong>{t('rawMilkSaleModule1')}</strong> {t('directSaleExplanation')}</li>
                    <li><strong>{t('transformationModule2')}</strong> {t('transformationExplanation')}</li>
                    <li><strong>{t('importantNote')}:</strong> {t('salesChannelsNote')}</li>
                    <li><strong>{t('assumptions')}:</strong> {t('assumptionsExplanation')}</li>
                    <li><strong>{t('costsIncluded')}:</strong> {t('costsIncludedExplanation')}</li>
                  </ul>
                </div>
                <div className="table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table className="table numeric-table" style={{ minWidth: '500px' }}>
                    <thead>
                      <tr>
                        <th>{t('concept')}</th>
                        <th>{t('rawMilkSale')}</th>
                        <th>{t('transformation')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>{t('income')}</strong></td>
                        <td>{formatMoney(results.milk_revenue)}</td>
                        <td>{formatMoney(results.product_revenue)}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('margin')}</strong></td>
                        <td>{formatMoney(results.milk_margin)}</td>
                        <td>{formatMoney(results.transformation_margin)}</td>
                      </tr>
                      <tr>
                        <td><strong>{t('difference')}</strong></td>
                        <td colSpan="2">
                          {formatMoney(Math.abs(results.transformation_margin - results.milk_margin))}
                          {' '}({['transform', 'transformation', 'transformacion', 'transformación'].includes(results.better_option) ? t('betterTransform') : t('betterSellDirect')})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Visualization Chart Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h2 className="chart-title">
                      {t('visualization')}
                    </h2>
                    <p className="chart-subtitle">{t('module2CompareSubtitle')}</p>
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
                    <div className="chart-view-toggle">
                      <button
                        className={`chart-view-btn ${chartViewType === 'grouped' ? 'active' : ''}`}
                        onClick={() => setChartViewType('grouped')}
                      >
                        Bar
                      </button>
                      <button
                        className={`chart-view-btn ${chartViewType === 'donut' ? 'active' : ''}`}
                        onClick={() => setChartViewType('donut')}
                      >
                        Donut
                      </button>
                      <button
                        className={`chart-view-btn ${chartViewType === 'stacked' ? 'active' : ''}`}
                        onClick={() => setChartViewType('stacked')}
                      >
                        Stack
                      </button>
                      <button
                        className={`chart-view-btn ${chartViewType === 'waterfall' ? 'active' : ''}`}
                        onClick={() => setChartViewType('waterfall')}
                      >
                        Flow
                      </button>
                    </div>
                  </div>
                </div>

                <div className="chart-container">
                  {comparisonData.length > 0 ? (
                    <>
                      {chartViewType === 'grouped' && (() => {
                        const chartData = marginViewMode === 'percent' ? comparisonData.map(item => {
                          const income = Number(item[t('income')]) || 0;
                          const costs = Number(item[t('totalCosts')]) || 0;
                          const margin = Number(item[t('margin')]) || 0;
                          return {
                            name: item.name,
                            [t('income')]: income > 0 ? ((margin / income) * 100) : 0,
                            [t('totalCosts')]: income > 0 ? ((costs / income) * 100) : 0,
                            [t('margin')]: income > 0 ? ((margin / income) * 100) : 0,
                          };
                        }) : comparisonData;

                        return (
                          <ResponsiveContainer width="100%" height={340}>
                            <BarChart data={chartData} barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                              <XAxis
                                dataKey="name"
                                stroke={chartColors.axis.tick}
                                tick={{ fill: chartColors.text.secondary, fontSize: 12, fontWeight: 500 }}
                                tickLine={false}
                              />
                              <YAxis
                                stroke={chartColors.axis.tick}
                                tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
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
                                cursor={{ fill: chartColors.background.hover }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                              <Bar dataKey={t('income')} fill={chartColors.revenue} radius={[6, 6, 0, 0]} />
                              <Bar dataKey={t('totalCosts')} fill={chartColors.costs} radius={[6, 6, 0, 0]} />
                              <Bar dataKey={t('margin')} fill={chartColors.margin} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                      {chartViewType === 'donut' && (() => {
                        const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
                        const channelData = {
                          direct: { kg: 0, revenue: 0 },
                          distributors: { kg: 0, revenue: 0 },
                          third: { kg: 0, revenue: 0 },
                        };
                        let totalProductKg = 0;
                        products.forEach(product => {
                          const distributionPct = parseFloat(product.distribution_percentage) || 0;
                          const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                          const productLiters = totalLiters * (distributionPct / 100);
                          const productKg = productLiters / litersPerKg;
                          totalProductKg += productKg;
                          const directPct = parseFloat(product.sales_channel_direct_percentage) || 0;
                          const distPct = parseFloat(product.sales_channel_distributors_percentage) || 0;
                          const thirdPct = parseFloat(product.sales_channel_third_percentage) || 0;
                          channelData.direct.kg += productKg * (directPct / 100);
                          channelData.distributors.kg += productKg * (distPct / 100);
                          channelData.third.kg += productKg * (thirdPct / 100);
                        });
                        const donutData = [
                          { name: t('salesChannelDirect'), value: totalProductKg > 0 ? (channelData.direct.kg / totalProductKg) * 100 : 0 },
                          { name: t('salesChannelDistributors'), value: totalProductKg > 0 ? (channelData.distributors.kg / totalProductKg) * 100 : 0 },
                          { name: t('salesChannelThird'), value: totalProductKg > 0 ? (channelData.third.kg / totalProductKg) * 100 : 0 },
                        ].filter(item => item.value > 0);
                        return (
                          <ResponsiveContainer width="100%" height={340}>
                            <PieChart>
                              <Pie
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={110}
                                innerRadius={60}
                                fill={chartColors.primary}
                                dataKey="value"
                                paddingAngle={3}
                              >
                                {donutData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => `${value.toFixed(1)}%`}
                                contentStyle={{
                                  backgroundColor: chartColors.tooltip.bg,
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  borderRadius: '12px',
                                  boxShadow: chartColors.tooltip.shadow
                                }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '16px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        );
                      })()}
                      {chartViewType === 'stacked' && (() => {
                        const totalLiters = (productionData.daily_production_liters || 0) * (productionData.production_days || 0) * (productionData.animals_count || 0);
                        const productData = products.map(product => {
                          const distributionPct = parseFloat(product.distribution_percentage) || 0;
                          const litersPerKg = parseFloat(product.liters_per_kg_product) || 1;
                          const productLiters = totalLiters * (distributionPct / 100);
                          const productKg = productLiters / litersPerKg;
                          return {
                            name: product.product_type_custom || t(`productTypes.${product.product_type}`) || product.product_type,
                            kg: productKg,
                          };
                        });
                        return (
                          <ResponsiveContainer width="100%" height={340}>
                            <BarChart data={productData} barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                              <XAxis
                                dataKey="name"
                                stroke={chartColors.axis.tick}
                                tick={{ fill: chartColors.text.secondary, fontSize: 11, fontWeight: 500 }}
                                tickLine={false}
                              />
                              <YAxis
                                stroke={chartColors.axis.tick}
                                tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                formatter={(value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
                                contentStyle={{
                                  backgroundColor: chartColors.tooltip.bg,
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  borderRadius: '12px',
                                  boxShadow: chartColors.tooltip.shadow
                                }}
                                cursor={{ fill: chartColors.background.hover }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                              <Bar dataKey="kg" stackId="a" fill={chartColors.primary} name={t('productMix')} radius={[8, 8, 0, 0]}>
                                {productData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={chartColors.palette[index % chartColors.palette.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                      {chartViewType === 'waterfall' && (() => {
                        const chartData = marginViewMode === 'percent' ? comparisonData.map(item => {
                          const income = Number(item[t('income')]) || 0;
                          const costs = Number(item[t('totalCosts')]) || 0;
                          const margin = Number(item[t('margin')]) || 0;
                          return {
                            name: item.name,
                            [t('income')]: income > 0 ? ((margin / income) * 100) : 0,
                            [t('totalCosts')]: income > 0 ? ((costs / income) * 100) : 0,
                            [t('margin')]: income > 0 ? ((margin / income) * 100) : 0,
                          };
                        }) : comparisonData;

                        return (
                          <ResponsiveContainer width="100%" height={340}>
                            <ComposedChart data={chartData}>
                              <defs>
                                <linearGradient id="marginAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={chartColors.margin} stopOpacity={0.4} />
                                  <stop offset="95%" stopColor={chartColors.margin} stopOpacity={0.05} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                              <XAxis
                                dataKey="name"
                                stroke={chartColors.axis.tick}
                                tick={{ fill: chartColors.text.secondary, fontSize: 12, fontWeight: 500 }}
                                tickLine={false}
                              />
                              <YAxis
                                stroke={chartColors.axis.tick}
                                tick={{ fill: chartColors.text.secondary, fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
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
                                  boxShadow: chartColors.tooltip.shadow
                                }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="roundRect" />
                              <Bar dataKey={t('income')} fill={chartColors.revenue} radius={[6, 6, 0, 0]} />
                              <Bar dataKey={t('totalCosts')} fill={chartColors.costs} radius={[6, 6, 0, 0]} />
                              <Area type="monotone" dataKey={t('margin')} fill="url(#marginAreaGradient)" stroke={chartColors.margin} strokeWidth={3} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="chart-empty">
                      <p className="chart-empty-text">{t('noDataToShow')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Integrated Dashboard View */}
              {results && (
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h2 className="chart-title">
                        {t('integratedDashboard')}
                      </h2>
                      <p className="chart-subtitle">{t('dashboardDescription')}</p>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="metrics-grid">
                    <div className="metric-card info">
                      <div className="metric-label">{t('totalProductKg')}</div>
                      <div className="metric-value numeric-value">
                        {Number(results.total_product_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">{t('totalRevenue')}</div>
                      <div className="metric-value numeric-value">
                        {formatMoney(results.product_revenue)}
                      </div>
                    </div>
                    <div className="metric-card warning">
                      <div className="metric-label">{t('totalCosts')}</div>
                      <div className="metric-value numeric-value">
                        {formatMoney((results.product_revenue || 0) - (results.transformation_margin || 0))}
                      </div>
                    </div>
                    <div className={`metric-card ${(results.transformation_margin || 0) >= 0 ? 'success' : 'error'}`}>
                      <div className="metric-label">{t('grossMargin')}</div>
                      <div className={`metric-value numeric-value ${(results.transformation_margin || 0) >= 0 ? 'success' : 'error'}`}>
                        {formatMoney(results.transformation_margin)}
                      </div>
                      <div className={`metric-change ${((results.product_revenue || 0) > 0 ? ((results.transformation_margin || 0) / (results.product_revenue || 1)) * 100 : 0) >= 0 ? 'positive' : 'negative'}`}>
                        {((results.product_revenue || 0) > 0 ? ((results.transformation_margin || 0) / (results.product_revenue || 1)) * 100 : 0) >= 0 ? '+' : ''}{((results.product_revenue || 0) > 0 ? ((results.transformation_margin || 0) / (results.product_revenue || 1)) * 100 : 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '2rem'
                  }}>
                    {/* Income/Costs/Margin Chart */}
                    {comparisonData && comparisonData.length > 0 && (
                      <div>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                          {t('financialOverview')}
                        </h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                            <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                            <YAxis stroke={chartColors.axis.tick} />
                            <Tooltip
                              formatter={(value) => formatMoney(value)}
                              contentStyle={{
                                backgroundColor: chartColors.tooltip.bg,
                                border: `1px solid ${chartColors.tooltip.border}`,
                                color: chartColors.tooltip.text
                              }}
                            />
                            <Legend />
                            <Bar dataKey={t('income')} fill={chartColors.primary} />
                            <Bar dataKey={t('totalCosts')} fill={chartColors.tertiary} />
                            <Bar dataKey={t('margin')} fill={chartColors.secondary} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Product Mix Chart */}
                    {results.productsBreakdown && results.productsBreakdown.length > 0 && (() => {
                      const totalLiters = results.productsBreakdown.reduce((sum, p) => sum + (p.productLiters || 0), 0);
                      const productData = results.productsBreakdown.map(product => {
                        const distributionPct = product.distribution_percentage || 0;
                        const litersPerKg = product.litersPerKg || 1;
                        const productLiters = totalLiters * (distributionPct / 100);
                        const productKg = productLiters / litersPerKg;
                        return {
                          name: product.product_type_custom || t(`productTypes.${product.product_type}`) || product.product_type,
                          kg: productKg,
                        };
                      });
                      return (
                        <div>
                          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                            {t('productMix')}
                          </h3>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={productData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                              <XAxis dataKey="name" stroke={chartColors.axis.tick} />
                              <YAxis stroke={chartColors.axis.tick} />
                              <Tooltip
                                formatter={(value) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
                                contentStyle={{
                                  backgroundColor: chartColors.tooltip.bg,
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  color: chartColors.tooltip.text
                                }}
                              />
                              <Legend />
                              <Bar dataKey="kg" fill={chartColors.primary} name={t('productMix')} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}

                    {/* Channel Mix Chart */}
                    {results.productsBreakdown && results.productsBreakdown.length > 0 && (() => {
                      const channelData = {
                        direct: { kg: 0 },
                        distributors: { kg: 0 },
                        third: { kg: 0 }
                      };
                      let totalProductKg = 0;
                      results.productsBreakdown.forEach(product => {
                        if (product.salesChannels && product.productKg) {
                          channelData.direct.kg += product.salesChannels.direct?.kg || 0;
                          channelData.distributors.kg += product.salesChannels.distributors?.kg || 0;
                          channelData.third.kg += product.salesChannels.third?.kg || 0;
                          totalProductKg += product.productKg;
                        }
                      });
                      const donutData = [
                        { name: t('salesChannelDirect'), value: totalProductKg > 0 ? (channelData.direct.kg / totalProductKg) * 100 : 0 },
                        { name: t('salesChannelDistributors'), value: totalProductKg > 0 ? (channelData.distributors.kg / totalProductKg) * 100 : 0 },
                        { name: t('salesChannelThird'), value: totalProductKg > 0 ? (channelData.third.kg / totalProductKg) * 100 : 0 },
                      ].filter(item => item.value > 0);
                      const COLORS = [chartColors.primary, chartColors.secondary, chartColors.tertiary];
                      return donutData.length > 0 ? (
                        <div>
                          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
                            {t('channelMix')}
                          </h3>
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={90}
                                fill={chartColors.primary}
                                dataKey="value"
                              >
                                {donutData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) => `${value.toFixed(1)}%`}
                                contentStyle={{
                                  backgroundColor: chartColors.tooltip.bg,
                                  border: `1px solid ${chartColors.tooltip.border}`,
                                  color: chartColors.tooltip.text
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
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

export default Module2Transformation;


