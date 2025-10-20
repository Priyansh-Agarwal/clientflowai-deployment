import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// n8n configuration
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// Validation schemas
const triggerWorkflowSchema = z.object({
  workflowId: z.string(),
  data: z.record(z.any()),
  business_id: z.string().uuid()
});

const createWorkflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  business_id: z.string().uuid(),
  triggers: z.array(z.object({
    type: z.enum(['webhook', 'schedule', 'database']),
    config: z.record(z.any())
  })),
  actions: z.array(z.object({
    type: z.string(),
    config: z.record(z.any())
  }))
});

/**
 * Get all available workflows
 * GET /api/automation/workflows
 */
router.get('/workflows', authenticateToken, async (req, res) => {
  try {
    const { business_id } = req.query;

    // Get workflows from n8n
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    const workflows = response.data.data.filter((workflow: any) => 
      workflow.active && workflow.tags?.includes('clientflow')
    );

    res.json({
      success: true,
      data: workflows,
      count: workflows.length
    });

  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflows'
    });
  }
});

/**
 * Trigger a specific workflow
 * POST /api/automation/trigger/:workflowId
 */
router.post('/trigger/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const triggerData = triggerWorkflowSchema.parse({
      workflowId,
      data: req.body.data,
      business_id: req.body.business_id
    });

    // Trigger workflow via n8n webhook
    const webhookUrl = `${N8N_BASE_URL}/webhook/${workflowId}`;
    
    const response = await axios.post(webhookUrl, {
      ...triggerData.data,
      business_id: triggerData.business_id,
      triggered_at: new Date().toISOString(),
      source: 'api'
    });

    res.json({
      success: true,
      message: 'Workflow triggered successfully',
      execution_id: response.data.executionId,
      status: 'running'
    });

  } catch (error) {
    console.error('Trigger workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger workflow'
    });
  }
});

/**
 * Get workflow execution status
 * GET /api/automation/execution/:executionId
 */
router.get('/execution/:executionId', authenticateToken, async (req, res) => {
  try {
    const { executionId } = req.params;

    const response = await axios.get(`${N8N_BASE_URL}/api/v1/executions/${executionId}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Get execution status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution status'
    });
  }
});

/**
 * Create a new workflow
 * POST /api/automation/workflows
 */
router.post('/workflows', authenticateToken, async (req, res) => {
  try {
    const workflowData = createWorkflowSchema.parse(req.body);

    // Create workflow in n8n
    const n8nWorkflow = {
      name: workflowData.name,
      active: true,
      tags: ['clientflow', `business-${workflowData.business_id}`],
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: `clientflow-${workflowData.name.toLowerCase().replace(/\s+/g, '-')}`,
            responseMode: 'responseNode'
          },
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [240, 300]
        }
      ],
      connections: {},
      settings: {
        executionOrder: 'v1'
      }
    };

    const response = await axios.post(`${N8N_BASE_URL}/api/v1/workflows`, n8nWorkflow, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      data: response.data
    });

  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
});

/**
 * Get automation statistics
 * GET /api/automation/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { business_id, start_date, end_date } = req.query;

    // Get execution statistics from n8n
    const response = await axios.get(`${N8N_BASE_URL}/api/v1/executions`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      },
      params: {
        limit: 1000,
        startDate: start_date,
        endDate: end_date
      }
    });

    const executions = response.data.data;
    const businessExecutions = executions.filter((exec: any) => 
      exec.workflowData?.tags?.includes(`business-${business_id}`)
    );

    const stats = {
      total_executions: businessExecutions.length,
      successful_executions: businessExecutions.filter((e: any) => e.finished && e.status === 'success').length,
      failed_executions: businessExecutions.filter((e: any) => e.finished && e.status === 'error').length,
      running_executions: businessExecutions.filter((e: any) => !e.finished).length,
      average_execution_time: 0,
      most_used_workflows: [],
      execution_trends: {}
    };

    // Calculate average execution time
    const completedExecutions = businessExecutions.filter((e: any) => e.finished && e.startedAt && e.stoppedAt);
    if (completedExecutions.length > 0) {
      const totalTime = completedExecutions.reduce((sum: number, exec: any) => {
        const start = new Date(exec.startedAt).getTime();
        const end = new Date(exec.stoppedAt).getTime();
        return sum + (end - start);
      }, 0);
      stats.average_execution_time = totalTime / completedExecutions.length;
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get automation stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get automation statistics'
    });
  }
});

/**
 * Test workflow execution
 * POST /api/automation/test/:workflowId
 */
router.post('/test/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const testData = req.body;

    // Execute workflow in test mode
    const response = await axios.post(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/execute`, {
      data: testData,
      mode: 'test'
    }, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      message: 'Workflow test completed',
      data: response.data
    });

  } catch (error) {
    console.error('Test workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test workflow'
    });
  }
});

/**
 * Get workflow logs
 * GET /api/automation/logs/:workflowId
 */
router.get('/logs/:workflowId', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const response = await axios.get(`${N8N_BASE_URL}/api/v1/executions`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      },
      params: {
        workflowId,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      }
    });

    res.json({
      success: true,
      data: response.data.data,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: response.data.total
      }
    });

  } catch (error) {
    console.error('Get workflow logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow logs'
    });
  }
});

/**
 * Pause/Resume workflow
 * PUT /api/automation/workflows/:workflowId/status
 */
router.put('/workflows/:workflowId/status', authenticateToken, async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { active } = req.body;

    const response = await axios.put(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, {
      active
    }, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      message: `Workflow ${active ? 'activated' : 'paused'} successfully`,
      data: response.data
    });

  } catch (error) {
    console.error('Update workflow status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow status'
    });
  }
});

export default router;
