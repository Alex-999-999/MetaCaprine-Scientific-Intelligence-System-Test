/**
 * Module Testing Script
 * Tests all 5 modules via API endpoints
 * 
 * Usage: node test-modules.js
 * 
 * Prerequisites:
 * - Backend running on http://localhost:3001
 * - Database connected and seeded
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, 'server', '.env') });

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';
const TEST_EMAIL = `test_${Date.now()}@test.com`;
const TEST_PASSWORD = 'Test123456!';

let authToken = null;
let testUserId = null;
let testScenarioIds = {
  module1: null,
  module2: null,
  module3: null,
  module4: null,
  module5: null,
};

const results = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// Test helper
async function runTest(name, testFn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await testFn();
    results.passed++;
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    results.failed++;
    results.errors.push({ test: name, error: error.message });
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// ============================================
// AUTHENTICATION TESTS
// ============================================

async function testHealthCheck() {
  const result = await apiCall('GET', '/health');
  if (!result.success) {
    throw new Error(`Health check failed: ${JSON.stringify(result.error)}`);
  }
  console.log(`   ✓ API is running`);
  console.log(`   ✓ Database status: ${result.data.database || 'unknown'}`);
}

async function testAuthRegister() {
  const result = await apiCall('POST', '/auth/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: 'Test User',
  });

  if (!result.success) {
    throw new Error(`Registration failed: ${JSON.stringify(result.error)}`);
  }

  if (!result.data.token) {
    throw new Error('No token received');
  }

  authToken = result.data.token;
  testUserId = result.data.user.id;
  console.log(`   ✓ User registered: ${TEST_EMAIL}`);
  console.log(`   ✓ Token received`);
}

async function testAuthLogin() {
  const result = await apiCall('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!result.success) {
    throw new Error(`Login failed: ${JSON.stringify(result.error)}`);
  }

  if (!result.data.token) {
    throw new Error('No token received');
  }

  authToken = result.data.token;
  console.log(`   ✓ Login successful`);
}

// ============================================
// SCENARIO TESTS
// ============================================

async function testCreateScenario(type, name) {
  const result = await apiCall(
    'POST',
    '/scenarios',
    {
      name,
      type,
      description: `Test scenario for ${name}`,
    },
    authToken
  );

  if (!result.success) {
    throw new Error(`Failed to create scenario: ${JSON.stringify(result.error)}`);
  }

  if (!result.data.id) {
    throw new Error('No scenario ID returned');
  }

  return result.data.id;
}

// ============================================
// MODULE 1 TESTS
// ============================================

async function testModule1() {
  console.log('\n📦 MODULE 1: Production & Direct Sales');

  // Create scenario
  const scenarioId = await testCreateScenario('milk_sale', 'Test Production Scenario');
  testScenarioIds.module1 = scenarioId;
  console.log(`   ✓ Scenario created: ID ${scenarioId}`);

  // Save production data
  const productionData = {
    daily_production_liters: 50,
    production_days: 365,
    animals_count: 20,
    feed_cost_per_liter: 0.5,
    labor_cost_per_liter: 0.3,
    health_cost_per_liter: 0.1,
    infrastructure_cost_per_liter: 0.2,
    other_costs_per_liter: 0.1,
    milk_price_per_liter: 2.0,
  };

  const saveResult = await apiCall(
    'POST',
    `/modules/production/${scenarioId}`,
    productionData,
    authToken
  );

  if (!saveResult.success) {
    throw new Error(`Failed to save production data: ${JSON.stringify(saveResult.error)}`);
  }
  console.log(`   ✓ Production data saved`);

  // Load scenario with results
  const loadResult = await apiCall(
    'GET',
    `/scenarios/${scenarioId}`,
    null,
    authToken
  );

  if (!loadResult.success) {
    throw new Error(`Failed to load scenario: ${JSON.stringify(loadResult.error)}`);
  }

  if (!loadResult.data.productionData) {
    throw new Error('No production data in response');
  }

  if (!loadResult.data.results) {
    throw new Error('No results calculated');
  }

  // Verify calculations
  const results = loadResult.data.results;
  // Check both snake_case (database) and camelCase (engine) formats
  // Database returns DECIMAL as strings, so parse them
  const totalProduction = parseFloat(results.total_production_liters || results.totalProductionLiters || 0);
  const totalRevenue = parseFloat(results.total_revenue || results.totalRevenue || 0);
  const grossMargin = parseFloat(results.gross_margin || results.grossMargin || 0);

  if (isNaN(totalProduction) || totalProduction <= 0) {
    throw new Error(`Invalid total_production_liters: ${results.total_production_liters || results.totalProductionLiters}`);
  }
  if (isNaN(totalRevenue) || totalRevenue <= 0) {
    throw new Error(`Invalid total_revenue: ${results.total_revenue || results.totalRevenue}`);
  }
  if (isNaN(grossMargin)) {
    throw new Error(`Invalid gross_margin: ${results.gross_margin || results.grossMargin}`);
  }

  console.log(`   ✓ Scenario loaded with results`);
  console.log(`   ✓ Total Production: ${totalProduction.toLocaleString()}L`);
  console.log(`   ✓ Total Revenue: $${totalRevenue.toLocaleString()}`);
  console.log(`   ✓ Gross Margin: $${grossMargin.toLocaleString()}`);
}

// ============================================
// MODULE 2 TESTS
// ============================================

async function testModule2() {
  console.log('\n📦 MODULE 2: Dairy Transformation');

  // Create scenario
  const scenarioId = await testCreateScenario('transformation', 'Test Transformation Scenario');
  testScenarioIds.module2 = scenarioId;
  console.log(`   ✓ Scenario created: ID ${scenarioId}`);

  // Save transformation data
  const transformationData = {
    products: [
      {
        product_type: 'queso_fresco',
        distribution_percentage: '100',
        liters_per_kg_product: '10',
        processing_cost_per_liter: '0.5',
        processing_cost_per_kg: '',
        processing_cost_unit: 'liter',
        packaging_cost_per_liter: '',
        packaging_cost_per_kg: '1.0',
        packaging_cost_unit: 'kg',
        sales_channel_direct_percentage: '40',
        sales_channel_distributors_percentage: '40',
        sales_channel_third_percentage: '20',
        direct_sale_price_per_kg: '25',
        distributors_price_per_kg: '20',
        third_channel_price_per_kg: '18',
      },
    ],
  };

  const result = await apiCall(
    'POST',
    `/modules/transformation/${scenarioId}`,
    transformationData,
    authToken
  );

  if (!result.success) {
    throw new Error(`Failed to save transformation data: ${JSON.stringify(result.error)}`);
  }

  console.log(`   ✓ Transformation data saved`);
}

// ============================================
// MODULE 3 TESTS
// ============================================

async function testModule3() {
  console.log('\n📦 MODULE 3: Scientific Breed Intelligence');

  // Load breeds list
  const breedsResult = await apiCall('GET', '/module3/breeds', null, authToken);

  if (!breedsResult.success) {
    throw new Error(`Failed to load breeds: ${JSON.stringify(breedsResult.error)}`);
  }

  if (!breedsResult.data.breeds || !Array.isArray(breedsResult.data.breeds)) {
    throw new Error('Invalid breeds response');
  }

  if (breedsResult.data.breeds.length === 0) {
    throw new Error('No breeds found - database may not be seeded');
  }

  console.log(`   ✓ Loaded ${breedsResult.data.breeds.length} breeds`);

  if (breedsResult.data.breeds.length < 27) {
    console.warn(`   ⚠️  Expected 27 breeds, found ${breedsResult.data.breeds.length}`);
  }

  // Get first breed key for testing
  const firstBreed = breedsResult.data.breeds[0];
  const breedKey = firstBreed.breed_key || firstBreed.breed_name?.toLowerCase().replace(/\s+/g, '_');

  if (!breedKey) {
    throw new Error('No breed key found in response');
  }

  // Test breed simulation
  const simulateResult = await apiCall(
    'POST',
    '/module3/simulate',
    {
      breed_key: breedKey,
      overrides: {
        herd_size: 30,
        milk_kg_yr: 800,
      },
    },
    authToken
  );

  if (!simulateResult.success) {
    throw new Error(`Failed to simulate breed: ${JSON.stringify(simulateResult.error)}`);
  }

  if (!simulateResult.data.scenario) {
    throw new Error('No scenario data in response');
  }

  // Check both property name formats
  const scenario = simulateResult.data.scenario;
  const ecmLifetime = scenario.total_ecm_kg_lifetime || scenario.ecm_kg_lifetime || scenario.ecmLifetime;

  if (typeof ecmLifetime !== 'number') {
    console.warn(`   ⚠️  ECM Lifetime not found in expected format: ${JSON.stringify(Object.keys(scenario))}`);
  } else {
    console.log(`   ✓ ECM Lifetime: ${ecmLifetime} kg`);
  }

  console.log(`   ✓ Breed simulation successful`);

  // Test breed comparison (if we have at least 2 breeds)
  if (breedsResult.data.breeds.length >= 2) {
    const secondBreed = breedsResult.data.breeds[1];
    const breedKey2 = secondBreed.breed_key || secondBreed.breed_name?.toLowerCase().replace(/\s+/g, '_');

    const compareResult = await apiCall(
      'POST',
      '/module3/compare',
      {
        a: { breed_key: breedKey, overrides: { herd_size: 30 } },
        b: { breed_key: breedKey2, overrides: { herd_size: 30 } },
      },
      authToken
    );

    if (!compareResult.success) {
      throw new Error(`Failed to compare breeds: ${JSON.stringify(compareResult.error)}`);
    }

    if (!compareResult.data.comparison) {
      throw new Error('No comparison data in response');
    }

    console.log(`   ✓ Breed comparison successful`);
  }
}

// ============================================
// MODULE 4 TESTS
// ============================================

async function testModule4() {
  console.log('\n📦 MODULE 4: Cost Calculators / Yield');

  // Create scenario
  const scenarioId = await testCreateScenario('yield', 'Test Yield Scenario');
  testScenarioIds.module4 = scenarioId;
  console.log(`   ✓ Scenario created: ID ${scenarioId}`);

  // Save yield data
  const yieldData = {
    conversion_rate: 0.85,
    efficiency_percentage: 95,
  };

  const result = await apiCall(
    'POST',
    `/modules/yield/${scenarioId}`,
    yieldData,
    authToken
  );

  if (!result.success) {
    throw new Error(`Failed to save yield data: ${JSON.stringify(result.error)}`);
  }

  console.log(`   ✓ Yield data saved`);
}

// ============================================
// MODULE 5 TESTS
// ============================================

async function testModule5() {
  console.log('\n📦 MODULE 5: Reproductive Management');

  // Create scenario
  const scenarioId = await testCreateScenario('summary', 'Test Gestation Scenario');
  testScenarioIds.module5 = scenarioId;
  console.log(`   ✓ Scenario created: ID ${scenarioId}`);

  // Save gestation data
  const gestationData = {
    mating_date: '2024-01-01',
    gestation_days: 150,
    notes: 'Test gestation',
  };

  const calculatedTimeline = {
    matingDate: '2024-01-01',
    expectedBirthDate: '2024-05-30',
    weeks: [],
  };

  const result = await apiCall(
    'POST',
    `/modules/gestation/${scenarioId}`,
    {
      gestationData,
      calculatedGestationTimeline: calculatedTimeline,
    },
    authToken
  );

  if (!result.success) {
    throw new Error(`Failed to save gestation data: ${JSON.stringify(result.error)}`);
  }

  console.log(`   ✓ Gestation data saved`);
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('🚀 Starting Module Tests...');
  console.log(`📡 API Base URL: ${API_BASE}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log('='.repeat(60));

  // Check API health first
  await runTest('API Health Check', testHealthCheck);

  if (results.failed > 0) {
    console.error('\n❌ API is not accessible. Please ensure backend is running on port 3001');
    process.exit(1);
  }

  // Run tests in sequence
  await runTest('Authentication - Register User', testAuthRegister);
  await runTest('Authentication - Login', testAuthLogin);
  await runTest('Module 1: Production & Direct Sales', testModule1);
  await runTest('Module 2: Dairy Transformation', testModule2);
  await runTest('Module 3: Scientific Breed Intelligence', testModule3);
  await runTest('Module 4: Cost Calculators / Yield', testModule4);
  await runTest('Module 5: Reproductive Management', testModule5);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  const total = results.passed + results.failed;
  if (total > 0) {
    console.log(`📈 Success Rate: ${((results.passed / total) * 100).toFixed(1)}%`);
  }

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    results.errors.forEach((err) => {
      console.log(`   - ${err.test}: ${err.error}`);
    });
  }

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    console.log('✅ Project is working correctly!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review errors above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
