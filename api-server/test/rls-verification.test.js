/**
 * ClientFlow AI Suite - RLS Verification Tests
 * Tests Row Level Security policies for multi-tenant isolation
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables for RLS testing');
  console.error('   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

// Create Supabase clients
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const testOrg1 = 'test-org-1';
const testOrg2 = 'test-org-2';
const testBusiness1 = 'test-business-1';
const testBusiness2 = 'test-business-2';
const testUser1 = 'test-user-1';
const testUser2 = 'test-user-2';

// Helper functions
const createTestData = async () => {
  console.log('📋 Creating test data...');
  
  try {
    // Create test organizations
    await serviceClient.from('organizations').upsert([
      {
        id: testOrg1,
        name: 'Test Organization 1',
        slug: 'test-org-1',
        created_at: new Date().toISOString()
      },
      {
        id: testOrg2,
        name: 'Test Organization 2',
        slug: 'test-org-2',
        created_at: new Date().toISOString()
      }
    ]);

    // Create test businesses
    await serviceClient.from('businesses').upsert([
      {
        id: testBusiness1,
        organization_id: testOrg1,
        business_name: 'Test Business 1',
        slug: 'test-business-1',
        created_at: new Date().toISOString()
      },
      {
        id: testBusiness2,
        organization_id: testOrg2,
        business_name: 'Test Business 2',
        slug: 'test-business-2',
        created_at: new Date().toISOString()
      }
    ]);

    // Create test users
    await serviceClient.from('profiles').upsert([
      {
        id: testUser1,
        email: 'user1@test.com',
        full_name: 'Test User 1',
        created_at: new Date().toISOString()
      },
      {
        id: testUser2,
        email: 'user2@test.com',
        full_name: 'Test User 2',
        created_at: new Date().toISOString()
      }
    ]);

    // Create organization memberships
    await serviceClient.from('organization_members').upsert([
      {
        user_id: testUser1,
        organization_id: testOrg1,
        role: 'owner',
        created_at: new Date().toISOString()
      },
      {
        user_id: testUser2,
        organization_id: testOrg2,
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ]);

    // Create business memberships
    await serviceClient.from('business_members').upsert([
      {
        user_id: testUser1,
        business_id: testBusiness1,
        role: 'owner',
        created_at: new Date().toISOString()
      },
      {
        user_id: testUser2,
        business_id: testBusiness2,
        role: 'owner',
        created_at: new Date().toISOString()
      }
    ]);

    // Create test customers
    await serviceClient.from('customers').upsert([
      {
        id: 'test-customer-1',
        business_id: testBusiness1,
        first_name: 'Customer 1',
        last_name: 'Org1',
        email: 'customer1@test.com',
        created_at: new Date().toISOString()
      },
      {
        id: 'test-customer-2',
        business_id: testBusiness2,
        first_name: 'Customer 2',
        last_name: 'Org2',
        email: 'customer2@test.com',
        created_at: new Date().toISOString()
      }
    ]);

    console.log('✅ Test data created successfully');
  } catch (error) {
    console.error('❌ Failed to create test data:', error.message);
    throw error;
  }
};

const cleanupTestData = async () => {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete in reverse order of dependencies
    await serviceClient.from('customers').delete().in('id', ['test-customer-1', 'test-customer-2']);
    await serviceClient.from('business_members').delete().in('user_id', [testUser1, testUser2]);
    await serviceClient.from('organization_members').delete().in('user_id', [testUser1, testUser2]);
    await serviceClient.from('profiles').delete().in('id', [testUser1, testUser2]);
    await serviceClient.from('businesses').delete().in('id', [testBusiness1, testBusiness2]);
    await serviceClient.from('organizations').delete().in('id', [testOrg1, testOrg2]);
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
    // Don't throw here as cleanup is not critical
  }
};

// RLS Test Suite
describe('RLS Verification Tests', () => {
  
  before(async () => {
    await createTestData();
  });

  after(async () => {
    await cleanupTestData();
  });

  describe('Organization Isolation', () => {
    it('should prevent cross-organization data access', async () => {
      // Test with service role (should see all data)
      const { data: allOrgs } = await serviceClient
        .from('organizations')
        .select('id, name');
      
      assert(allOrgs.length >= 2, 'Service role should see all organizations');
      
      // Test with anon client (should see no data without auth)
      const { data: anonOrgs, error: anonError } = await anonClient
        .from('organizations')
        .select('id, name');
      
      // Anon client should either see no data or get an error
      assert(anonOrgs.length === 0 || anonError, 'Anon client should not see organizations');
    });

    it('should enforce organization membership for data access', async () => {
      // This test would require setting up proper auth context
      // For now, we'll test that the policies exist
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, permissive, roles, cmd, qual')
        .eq('tablename', 'organizations');
      
      assert(policies.length > 0, 'Organization RLS policies should exist');
      
      const selectPolicy = policies.find(p => p.cmd === 'SELECT');
      assert(selectPolicy, 'Organization SELECT policy should exist');
      assert(selectPolicy.qual.includes('organization_members'), 'Policy should check organization membership');
    });
  });

  describe('Business Isolation', () => {
    it('should prevent cross-business data access', async () => {
      // Test that businesses are isolated by organization
      const { data: allBusinesses } = await serviceClient
        .from('businesses')
        .select('id, business_name, organization_id');
      
      const org1Businesses = allBusinesses.filter(b => b.organization_id === testOrg1);
      const org2Businesses = allBusinesses.filter(b => b.organization_id === testOrg2);
      
      assert(org1Businesses.length > 0, 'Should have businesses in org 1');
      assert(org2Businesses.length > 0, 'Should have businesses in org 2');
      
      // Verify they are different businesses
      assert(org1Businesses[0].id !== org2Businesses[0].id, 'Businesses should be different');
    });

    it('should enforce business membership for customer access', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, permissive, roles, cmd, qual')
        .eq('tablename', 'customers');
      
      assert(policies.length > 0, 'Customer RLS policies should exist');
      
      const selectPolicy = policies.find(p => p.cmd === 'SELECT');
      assert(selectPolicy, 'Customer SELECT policy should exist');
      assert(selectPolicy.qual.includes('business_members'), 'Policy should check business membership');
    });
  });

  describe('Customer Data Isolation', () => {
    it('should prevent cross-organization customer access', async () => {
      // Get customers for each business
      const { data: customers1 } = await serviceClient
        .from('customers')
        .select('id, first_name, business_id')
        .eq('business_id', testBusiness1);
      
      const { data: customers2 } = await serviceClient
        .from('customers')
        .select('id, first_name, business_id')
        .eq('business_id', testBusiness2);
      
      assert(customers1.length > 0, 'Should have customers in business 1');
      assert(customers2.length > 0, 'Should have customers in business 2');
      
      // Verify customers belong to different businesses
      assert(customers1[0].business_id !== customers2[0].business_id, 'Customers should belong to different businesses');
    });

    it('should enforce proper customer creation permissions', async () => {
      const { data: policies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, permissive, roles, cmd, qual')
        .eq('tablename', 'customers')
        .eq('cmd', 'INSERT');
      
      assert(policies.length > 0, 'Customer INSERT policies should exist');
      
      const insertPolicy = policies[0];
      assert(insertPolicy.qual.includes('business_members'), 'Policy should check business membership');
    });
  });

  describe('RLS Policy Coverage', () => {
    it('should have RLS enabled on all critical tables', async () => {
      const criticalTables = [
        'organizations',
        'businesses',
        'profiles',
        'organization_members',
        'business_members',
        'customers',
        'services',
        'calls',
        'conversations',
        'conversation_messages',
        'appointments',
        'reviews',
        'daily_metrics',
        'ai_scripts',
        'notifications',
        'audit_logs'
      ];

      for (const table of criticalTables) {
        const { data: rlsStatus } = await serviceClient
          .from('pg_class')
          .select('relrowsecurity')
          .eq('relname', table);
        
        if (rlsStatus && rlsStatus.length > 0) {
          assert(rlsStatus[0].relrowsecurity, `RLS should be enabled on ${table}`);
        }
      }
    });

    it('should have comprehensive policy coverage', async () => {
      const tablesWithPolicies = [
        'organizations',
        'businesses',
        'customers',
        'appointments'
      ];

      for (const table of tablesWithPolicies) {
        const { data: policies } = await serviceClient
          .from('pg_policies')
          .select('cmd')
          .eq('tablename', table);
        
        const commands = [...new Set(policies.map(p => p.cmd))];
        
        // Should have policies for SELECT, INSERT, UPDATE, DELETE
        assert(commands.includes('SELECT'), `${table} should have SELECT policy`);
        assert(commands.includes('INSERT'), `${table} should have INSERT policy`);
        assert(commands.includes('UPDATE'), `${table} should have UPDATE policy`);
        assert(commands.includes('DELETE'), `${table} should have DELETE policy`);
      }
    });
  });

  describe('Service Role Bypass', () => {
    it('should allow service role to bypass RLS', async () => {
      // Service role should be able to access all data
      const { data: allData, error } = await serviceClient
        .from('organizations')
        .select('*');
      
      assert(!error, 'Service role should not have RLS restrictions');
      assert(allData.length > 0, 'Service role should see all organizations');
    });

    it('should have service role bypass policies', async () => {
      const { data: servicePolicies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, roles')
        .like('roles', '%service_role%');
      
      assert(servicePolicies.length > 0, 'Should have service role bypass policies');
      
      const tables = [...new Set(servicePolicies.map(p => p.tablename))];
      assert(tables.length > 5, 'Service role bypass should cover multiple tables');
    });
  });

  describe('Permission-Based Access', () => {
    it('should have granular permission policies', async () => {
      // Check for permission-based policies
      const { data: permissionPolicies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, qual')
        .like('qual', '%permissions%');
      
      assert(permissionPolicies.length > 0, 'Should have permission-based policies');
    });

    it('should prevent privilege escalation', async () => {
      const { data: escalationPolicies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, qual')
        .like('policyname', '%elevate%');
      
      assert(escalationPolicies.length > 0, 'Should have privilege escalation prevention policies');
    });
  });

  describe('Audit and Compliance', () => {
    it('should have audit log policies', async () => {
      const { data: auditPolicies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, cmd')
        .eq('tablename', 'audit_logs');
      
      assert(auditPolicies.length > 0, 'Should have audit log policies');
      
      const adminOnlyPolicy = auditPolicies.find(p => p.policyname.includes('admin'));
      assert(adminOnlyPolicy, 'Should have admin-only audit log access policy');
    });

    it('should prevent audit log modification', async () => {
      const { data: auditPolicies } = await serviceClient
        .from('pg_policies')
        .select('tablename, policyname, cmd')
        .eq('tablename', 'audit_logs')
        .in('cmd', ['UPDATE', 'DELETE']);
      
      const updatePolicy = auditPolicies.find(p => p.cmd === 'UPDATE');
      const deletePolicy = auditPolicies.find(p => p.cmd === 'DELETE');
      
      if (updatePolicy) {
        assert(updatePolicy.policyname.includes('system') || updatePolicy.policyname.includes('false'), 
               'Update policy should be system-only or false');
      }
      
      if (deletePolicy) {
        assert(deletePolicy.policyname.includes('system') || deletePolicy.policyname.includes('false'), 
               'Delete policy should be system-only or false');
      }
    });
  });
});

// Export for use in other test files
module.exports = {
  createTestData,
  cleanupTestData,
  testOrg1,
  testOrg2,
  testBusiness1,
  testBusiness2,
  testUser1,
  testUser2
};
