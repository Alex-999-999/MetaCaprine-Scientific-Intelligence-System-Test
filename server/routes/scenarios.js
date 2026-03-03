import express from 'express';
import { getPool } from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.js';
import * as scenarioService from '../services/scenarioService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all scenarios for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const scenarios = await scenarioService.getUserScenarios(req.user.userId, type);
    res.json(scenarios);
  } catch (error) {
    console.error('Get scenarios error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get a single scenario with all its data
router.get('/:id', async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.id);
    
    // Business logic in service layer
    const scenario = await scenarioService.getScenarioById(scenarioId, req.user.userId);
    
    // Handle gestation data if it exists
    const pool = getPool();
    const gestationData = await pool.query(
      'SELECT * FROM gestation_data WHERE scenario_id = $1', 
      [scenarioId]
    ).catch(() => ({ rows: [] }));
    
    const gestationRow = gestationData.rows[0];
    const parsedGestationData = gestationRow?.gestation_data || null;
    const parsedTimeline = gestationRow?.calculated_gestation_timeline || null;
    
    res.json({
      ...scenario,
      gestationData: parsedGestationData,
      calculatedGestationTimeline: parsedTimeline,
    });
  } catch (error) {
    console.error('Get scenario error:', error);
    
    if (error.message?.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Create a new scenario
router.post('/', async (req, res) => {
  try {
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Business logic in service layer
    const scenario = await scenarioService.createScenario(
      req.user.userId,
      name,
      type,
      description || null
    );

    res.status(201).json(scenario);
  } catch (error) {
    console.error('Create scenario error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Scenario name already exists for this user' });
    }
    
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Duplicate a scenario
router.post('/:id/duplicate', async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.id);
    const { name } = req.body;

    // Business logic in service layer
    const newScenario = await scenarioService.duplicateScenario(
      scenarioId,
      req.user.userId,
      name || null
    );

    res.status(201).json(newScenario);
  } catch (error) {
    console.error('Duplicate scenario error:', error);
    
    if (error.message?.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update scenario
router.put('/:id', async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.id);
    const { name, description } = req.body;

    // Business logic in service layer
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const scenario = await scenarioService.updateScenario(scenarioId, req.user.userId, updates);

    res.json(scenario);
  } catch (error) {
    console.error('Update scenario error:', error);
    
    if (error.message?.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete scenario
router.delete('/:id', async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.id);

    // Business logic in service layer
    await scenarioService.deleteScenario(scenarioId, req.user.userId);

    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    console.error('Delete scenario error:', error);
    
    if (error.message?.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }
    
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Compare multiple scenarios
router.post('/compare', async (req, res) => {
  try {
    const { scenarioIds } = req.body;

    if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      return res.status(400).json({ error: 'scenarioIds array is required' });
    }

    let pool;
    try {
      pool = getPool();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed. Please check your environment variables.',
        details: dbError.message 
      });
    }
    const userId = req.user.userId;

    // Verify all scenarios belong to user
    const scenariosResult = await pool.query(
      `SELECT s.*, 
       pd.*, td.*, ld.*, yd.*, r.*
       FROM scenarios s
       LEFT JOIN production_data pd ON s.id = pd.scenario_id
       LEFT JOIN transformation_data td ON s.id = td.scenario_id
       LEFT JOIN lactation_data ld ON s.id = ld.scenario_id
       LEFT JOIN yield_data yd ON s.id = yd.scenario_id
       LEFT JOIN results r ON s.id = r.scenario_id
       WHERE s.id = ANY($1::int[]) AND s.user_id = $2`,
      [scenarioIds, userId]
    );

    if (scenariosResult.rows.length !== scenarioIds.length) {
      return res.status(404).json({ error: 'One or more scenarios not found' });
    }

    // Load transformation products for all scenarios
    const transformationProductsResult = await pool.query(
      'SELECT * FROM transformation_products WHERE scenario_id = ANY($1::int[]) ORDER BY scenario_id, id',
      [scenarioIds]
    );

    // Group transformation products by scenario_id
    const productsByScenario = {};
    transformationProductsResult.rows.forEach(product => {
      if (!productsByScenario[product.scenario_id]) {
        productsByScenario[product.scenario_id] = [];
      }
      productsByScenario[product.scenario_id].push(product);
    });

    // Run simulation for each scenario
    const comparisons = scenariosResult.rows.map(row => {
      // Build transformationData (legacy) or transformationProducts (new)
      const scenarioProducts = productsByScenario[row.id] || [];
      
      const scenarioData = {
        productionData: row.daily_production_liters ? {
          daily_production_liters: row.daily_production_liters,
          production_days: row.production_days,
          animals_count: row.animals_count,
          feed_cost_per_liter: row.feed_cost_per_liter,
          labor_cost_per_liter: row.labor_cost_per_liter,
          health_cost_per_liter: row.health_cost_per_liter,
          infrastructure_cost_per_liter: row.infrastructure_cost_per_liter,
          other_costs_per_liter: row.other_costs_per_liter,
          milk_price_per_liter: row.milk_price_per_liter,
        } : null,
        transformationData: (scenarioProducts.length === 0 && row.product_type) ? {
          product_type: row.product_type,
          liters_per_kg_product: row.liters_per_kg_product,
          processing_cost_per_liter: row.processing_cost_per_liter,
          product_price_per_kg: row.product_price_per_kg,
        } : null,
        transformationProducts: scenarioProducts.length > 0 ? scenarioProducts : null,
        lactationData: row.lactation_days ? {
          lactation_days: row.lactation_days,
          dry_days: row.dry_days,
          productive_life_years: row.productive_life_years,
          replacement_rate: row.replacement_rate,
        } : null,
        yieldData: row.conversion_rate ? {
          conversion_rate: row.conversion_rate,
          efficiency_percentage: row.efficiency_percentage,
        } : null,
        scenarioType: row.type,
      };

      const simulationResults = runSimulation(scenarioData);

      return {
        scenario: {
          id: row.id,
          name: row.name,
          type: row.type,
          description: row.description,
        },
        results: simulationResults,
      };
    });

    res.json(comparisons);
  } catch (error) {
    console.error('Compare scenarios error:', error);
    const errorMessage = error.message || 'Internal server error';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
