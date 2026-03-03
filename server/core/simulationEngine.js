/**
 * Shared Core Simulation Engine
 * 
 * This is the single source of truth for all calculations.
 * All modules use this engine to calculate results from scenario inputs.
 * 
 * Key principle: Each scenario is an independent "snapshot" with its own inputs.
 * Calculations are pure functions that take scenario data and return results.
 */

/**
 * Calculate production metrics from production data
 */
export function calculateProductionMetrics(productionData) {
  if (!productionData) return null;

  const {
    daily_production_liters = 0,
    production_days = 0,
    animals_count = 0,
  } = productionData;

  const totalProductionLiters = daily_production_liters * production_days * animals_count;

  return {
    totalProductionLiters,
    dailyProductionLiters: daily_production_liters,
    productionDays: production_days,
    animalsCount: animals_count,
  };
}

/**
 * Calculate costs from production data
 */
export function calculateCosts(productionData) {
  if (!productionData) return null;

  const {
    feed_cost_per_liter = 0,
    labor_cost_per_liter = 0,
    health_cost_per_liter = 0,
    infrastructure_cost_per_liter = 0,
    other_costs_per_liter = 0,
    daily_production_liters = 0,
    production_days = 0,
    animals_count = 0,
  } = productionData;

  const totalProductionLiters = daily_production_liters * production_days * animals_count;
  const costPerLiter = 
    feed_cost_per_liter +
    labor_cost_per_liter +
    health_cost_per_liter +
    infrastructure_cost_per_liter +
    other_costs_per_liter;

  const totalCosts = costPerLiter * totalProductionLiters;

  return {
    costPerLiter,
    totalCosts,
    feedCost: feed_cost_per_liter * totalProductionLiters,
    laborCost: labor_cost_per_liter * totalProductionLiters,
    healthCost: health_cost_per_liter * totalProductionLiters,
    infrastructureCost: infrastructure_cost_per_liter * totalProductionLiters,
    otherCosts: other_costs_per_liter * totalProductionLiters,
  };
}

/**
 * Calculate revenue from production data
 */
export function calculateRevenue(productionData) {
  if (!productionData) return null;

  const {
    milk_price_per_liter = 0,
    daily_production_liters = 0,
    production_days = 0,
    animals_count = 0,
  } = productionData;

  const totalProductionLiters = daily_production_liters * production_days * animals_count;
  const totalRevenue = milk_price_per_liter * totalProductionLiters;

  return {
    revenuePerLiter: milk_price_per_liter,
    totalRevenue,
  };
}

/**
 * Calculate transformation metrics for Product Mix (multiple products)
 * Supports multiple products with distribution percentages and 3 sales channels per product
 */
export function calculateTransformationMetricsProductMix(productionData, transformationProducts) {
  if (!productionData || !transformationProducts || transformationProducts.length === 0) return null;

  const productionMetrics = calculateProductionMetrics(productionData);
  const totalLiters = productionMetrics.totalProductionLiters;
  
  // Calculate total milk production cost per liter (sum of all costs from Module 1)
  const feedCost = Number(productionData.feed_cost_per_liter) || 0;
  const laborCost = Number(productionData.labor_cost_per_liter) || 0;
  const healthCost = Number(productionData.health_cost_per_liter) || 0;
  const infrastructureCost = Number(productionData.infrastructure_cost_per_liter) || 0;
  const otherCost = Number(productionData.other_costs_per_liter) || 0;
  const totalMilkProductionCostPerLiter = feedCost + laborCost + healthCost + infrastructureCost + otherCost;

  let totalProductRevenue = 0;
  let totalProcessingCost = 0;
  let totalPackagingCost = 0;
  const productsBreakdown = [];

  // Process each product
  for (const product of transformationProducts) {
    const distributionPct = Number(product.distribution_percentage) || 0;
    const litersPerKg = Number(product.liters_per_kg_product) || 1;
    
    // Unit selection: processing and packaging costs can be per liter or per kg
    const processingCostUnit = product.processing_cost_unit || 'liter';
    const packagingCostUnit = product.packaging_cost_unit || 'kg';
    const processingCostPerLiter = Number(product.processing_cost_per_liter) || 0;
    const processingCostPerKg = Number(product.processing_cost_per_kg) || 0;
    const packagingCostPerLiter = Number(product.packaging_cost_per_liter) || 0;
    const packagingCostPerKg = Number(product.packaging_cost_per_kg) || 0;

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

    const productMilkCost = totalMilkProductionCostPerLiter * productLiters;

    // Calculate revenue by sales channel for this product
    const directPct = Number(product.sales_channel_direct_percentage) || 100;
    const distPct = Number(product.sales_channel_distributors_percentage) || 0;
    const thirdPct = Number(product.sales_channel_third_percentage) || 0;

    const directPrice = Number(product.direct_sale_price_per_kg) || 0;
    const distPrice = Number(product.distributors_price_per_kg) || 0;
    const thirdPrice = Number(product.third_channel_price_per_kg) || 0;

    const directKg = productKg * (directPct / 100);
    const distKg = productKg * (distPct / 100);
    const thirdKg = productKg * (thirdPct / 100);

    const directRevenue = directPrice * directKg;
    const distRevenue = distPrice * distKg;
    const thirdRevenue = thirdPrice * thirdKg;
    const productRevenue = directRevenue + distRevenue + thirdRevenue;

    totalProductRevenue += productRevenue;
    totalProcessingCost += productProcessingCost;
    totalPackagingCost += productPackagingCost;

    productsBreakdown.push({
      product_type: product.product_type,
      product_type_custom: product.product_type_custom,
      distribution_percentage: distributionPct,
      productLiters,
      productKg,
      productRevenue,
      processingCost: productProcessingCost,
      packagingCost: productPackagingCost,
      milkCost: productMilkCost,
      processingCostUnit,
      packagingCostUnit,
      salesChannels: {
        direct: { percentage: directPct, kg: directKg, pricePerKg: directPrice, revenue: directRevenue },
        distributors: { percentage: distPct, kg: distKg, pricePerKg: distPrice, revenue: distRevenue },
        third: { percentage: thirdPct, kg: thirdKg, pricePerKg: thirdPrice, revenue: thirdRevenue },
      },
    });
  }

  const totalProductKg = productsBreakdown.reduce((sum, p) => sum + p.productKg, 0);

  // Calculate total liters used in transformation
  const totalTransformationLiters = productsBreakdown.reduce((sum, p) => sum + p.productLiters, 0);

  return {
    totalProductKg,
    totalTransformationLiters,
    processingCost: totalProcessingCost,
    packagingCost: totalPackagingCost,
    productRevenue: totalProductRevenue,
    revenuePerKg: totalProductKg > 0 ? totalProductRevenue / totalProductKg : 0,
    productsBreakdown,
    // For audit trail: average weighted price and costs
    averageWeightedPrice: totalProductKg > 0 ? totalProductRevenue / totalProductKg : 0,
    averageWeightedCost: totalProductKg > 0 ? (totalProcessingCost + totalPackagingCost + (totalMilkProductionCostPerLiter * totalTransformationLiters)) / totalProductKg : 0,
  };
}

/**
 * Calculate transformation metrics (for dairy transformation module)
 * Supports 3 sales channels: direct, distributors, third/mixed
 * Legacy function for single product scenarios
 */
export function calculateTransformationMetrics(productionData, transformationData) {
  if (!productionData || !transformationData) return null;

  const productionMetrics = calculateProductionMetrics(productionData);
  const {
    liters_per_kg_product = 0,
    processing_cost_per_liter = 0,
    product_price_per_kg = 0, // Legacy field for backward compatibility
    sales_channel_direct_percentage = 100,
    sales_channel_distributors_percentage = 0,
    sales_channel_third_percentage = 0,
    direct_sale_price_per_kg = null,
    distributors_price_per_kg = null,
    third_channel_price_per_kg = null,
  } = transformationData;

  const totalLiters = productionMetrics.totalProductionLiters;
  const totalProductKg = totalLiters / (liters_per_kg_product || 1);
  const processingCost = processing_cost_per_liter * totalLiters;

  // Calculate revenue by sales channel
  // Use channel-specific prices if available, otherwise fall back to product_price_per_kg
  const directPrice = direct_sale_price_per_kg !== null ? direct_sale_price_per_kg : product_price_per_kg;
  const distributorsPrice = distributors_price_per_kg !== null ? distributors_price_per_kg : product_price_per_kg;
  const thirdPrice = third_channel_price_per_kg !== null ? third_channel_price_per_kg : product_price_per_kg;

  const directKg = totalProductKg * (sales_channel_direct_percentage / 100);
  const distributorsKg = totalProductKg * (sales_channel_distributors_percentage / 100);
  const thirdKg = totalProductKg * (sales_channel_third_percentage / 100);

  const directRevenue = directPrice * directKg;
  const distributorsRevenue = distributorsPrice * distributorsKg;
  const thirdRevenue = thirdPrice * thirdKg;
  const totalProductRevenue = directRevenue + distributorsRevenue + thirdRevenue;

  return {
    totalProductKg,
    processingCost,
    productRevenue: totalProductRevenue,
    revenuePerKg: totalProductKg > 0 ? totalProductRevenue / totalProductKg : 0,
    litersPerKg: liters_per_kg_product,
    // Sales channel breakdown
    salesChannels: {
      direct: {
        percentage: sales_channel_direct_percentage,
        kg: directKg,
        pricePerKg: directPrice,
        revenue: directRevenue,
      },
      distributors: {
        percentage: sales_channel_distributors_percentage,
        kg: distributorsKg,
        pricePerKg: distributorsPrice,
        revenue: distributorsRevenue,
      },
      third: {
        percentage: sales_channel_third_percentage,
        kg: thirdKg,
        pricePerKg: thirdPrice,
        revenue: thirdRevenue,
      },
    },
  };
}

/**
 * Calculate lactation impact (for lactation & productive life module)
 */
export function calculateLactationImpact(productionData, lactationData) {
  if (!productionData || !lactationData) return null;

  const {
    lactation_days = 0,
    dry_days = 0,
    productive_life_years = 0,
    replacement_rate = 0,
  } = lactationData;

  const cycleDays = lactation_days + dry_days;
  const cyclesPerYear = 365 / cycleDays;
  const productiveDays = productive_life_years * 365;
  const effectiveProductionDays = productiveDays * (lactation_days / cycleDays);

  return {
    cycleDays,
    cyclesPerYear,
    productiveDays,
    effectiveProductionDays,
    replacementRate: replacement_rate,
  };
}

/**
 * Calculate yield/conversion metrics (for yield module)
 */
export function calculateYieldMetrics(productionData, yieldData) {
  if (!productionData || !yieldData) return null;

  const productionMetrics = calculateProductionMetrics(productionData);
  const {
    conversion_rate = 0,
    efficiency_percentage = 100,
  } = yieldData;

  const totalLiters = productionMetrics.totalProductionLiters;
  const effectiveLiters = totalLiters * (efficiency_percentage / 100);
  const convertedProduct = effectiveLiters * conversion_rate;

  return {
    totalLiters,
    effectiveLiters,
    convertedProduct,
    conversionRate: conversion_rate,
    efficiencyPercentage: efficiency_percentage,
  };
}

/**
 * Main simulation function - calculates all results for a scenario
 * This is the single entry point for all calculations
 */
export function runSimulation(scenarioData) {
  const {
    productionData,
    transformationData,
    lactationData,
    yieldData,
    scenarioType,
  } = scenarioData;

  // Always calculate base production metrics
  const productionMetrics = calculateProductionMetrics(productionData);
  const costs = calculateCosts(productionData);
  const revenue = calculateRevenue(productionData);

  // Calculate base results
  const totalProductionLiters = productionMetrics?.totalProductionLiters || 0;
  let totalRevenue = revenue?.totalRevenue || 0;
  let totalCosts = costs?.totalCosts || 0;

  // Module-specific calculations
  let transformationMetrics = null;
  let lactationMetrics = null;
  let yieldMetrics = null;

  // Handle transformation: support both legacy single product and new Product Mix
  const { transformationProducts = [] } = scenarioData;
  if (transformationData || (transformationProducts && transformationProducts.length > 0)) {
    if (transformationProducts && transformationProducts.length > 0) {
      // New Product Mix: calculate for multiple products
      transformationMetrics = calculateTransformationMetricsProductMix(productionData, transformationProducts);
    } else {
      // Legacy single product
      transformationMetrics = calculateTransformationMetrics(productionData, transformationData);
    }
    
    // For transformation scenarios, use product revenue instead of milk revenue
    if (scenarioType === 'transformation' && transformationMetrics) {
      totalRevenue = transformationMetrics.productRevenue;
      totalCosts += transformationMetrics.processingCost;
      if (transformationMetrics.packagingCost) {
        totalCosts += transformationMetrics.packagingCost;
      }
    }
  }

  if (lactationData) {
    lactationMetrics = calculateLactationImpact(productionData, lactationData);
    // Adjust production based on lactation cycle
    if (scenarioType === 'lactation') {
      const adjustedProduction = totalProductionLiters * 
        (lactationMetrics.effectiveProductionDays / lactationMetrics.productiveDays);
      // Recalculate with adjusted production
      const adjustedRevenue = (revenue?.revenuePerLiter || 0) * adjustedProduction;
      const adjustedCosts = (costs?.costPerLiter || 0) * adjustedProduction;
      totalRevenue = adjustedRevenue;
      totalCosts = adjustedCosts;
    }
  }

  if (yieldData) {
    yieldMetrics = calculateYieldMetrics(productionData, yieldData);
  }

  // Final calculations
  const grossMargin = totalRevenue - totalCosts;
  const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
  const revenuePerLiter = totalProductionLiters > 0 ? totalRevenue / totalProductionLiters : 0;
  const costPerLiter = totalProductionLiters > 0 ? totalCosts / totalProductionLiters : 0;

  return {
    totalProductionLiters,
    totalRevenue,
    totalCosts,
    grossMargin,
    marginPercentage,
    revenuePerLiter,
    costPerLiter,
    productionMetrics,
    costs,
    revenue,
    transformationMetrics,
    lactationMetrics,
    yieldMetrics,
  };
}
