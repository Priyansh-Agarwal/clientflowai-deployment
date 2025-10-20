#!/usr/bin/env node

/**
 * ClientFlow AI Suite - Database Migration Script
 * Handles database migrations for production deployment
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Migration tracking
const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🔄${colors.reset} ${msg}`)
};

// Migration functions
async function ensureMigrationsTable() {
  log.step('Ensuring migrations table exists...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
    `
  });

  if (error) {
    log.error(`Failed to create migrations table: ${error.message}`);
    throw error;
  }

  log.success('Migrations table ready');
}

async function getExecutedMigrations() {
  const { data, error } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('version, filename, executed_at, checksum')
    .order('executed_at');

  if (error) {
    log.error(`Failed to fetch executed migrations: ${error.message}`);
    throw error;
  }

  return data || [];
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(file => {
    const version = file.split('_')[0];
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = require('crypto')
      .createHash('sha256')
      .update(content)
      .digest('hex');

    return {
      version,
      filename: file,
      filePath,
      content,
      checksum
    };
  });
}

async function executeMigration(migration) {
  const startTime = Date.now();
  
  log.step(`Executing migration: ${migration.filename}`);
  
  try {
    // Split SQL content by semicolons and execute each statement
    const statements = migration.content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          throw new Error(`SQL execution failed: ${error.message}`);
        }
      }
    }

    const executionTime = Date.now() - startTime;

    // Record migration as executed
    const { error: insertError } = await supabase
      .from(MIGRATIONS_TABLE)
      .insert({
        version: migration.version,
        filename: migration.filename,
        checksum: migration.checksum,
        execution_time_ms: executionTime
      });

    if (insertError) {
      throw new Error(`Failed to record migration: ${insertError.message}`);
    }

    log.success(`Migration ${migration.filename} executed successfully (${executionTime}ms)`);
    return true;

  } catch (error) {
    log.error(`Migration ${migration.filename} failed: ${error.message}`);
    throw error;
  }
}

async function validateMigration(migration) {
  // Check if migration has already been executed with different checksum
  const { data: existing } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('checksum')
    .eq('version', migration.version)
    .single();

  if (existing && existing.checksum !== migration.checksum) {
    throw new Error(
      `Migration ${migration.filename} has been modified since last execution. ` +
      `Checksum mismatch: expected ${existing.checksum}, got ${migration.checksum}`
    );
  }

  return true;
}

async function runMigrations() {
  try {
    log.info('🚀 Starting database migration process...');
    
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    
    // Get migration files
    const migrationFiles = await getMigrationFiles();
    
    log.info(`Found ${migrationFiles.length} migration files`);
    log.info(`Found ${executedMigrations.length} executed migrations`);
    
    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      migration => !executedVersions.has(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      log.success('✅ Database is up to date - no migrations to run');
      return;
    }
    
    log.info(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(migration => {
      log.info(`   - ${migration.filename}`);
    });
    
    // Execute pending migrations
    let successCount = 0;
    let errorCount = 0;
    
    for (const migration of pendingMigrations) {
      try {
        // Validate migration
        await validateMigration(migration);
        
        // Execute migration
        await executeMigration(migration);
        successCount++;
        
      } catch (error) {
        errorCount++;
        log.error(`Migration ${migration.filename} failed: ${error.message}`);
        
        // Stop on first error in production
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }
      }
    }
    
    // Summary
    log.info('📊 Migration Summary:');
    log.info(`   ✅ Successful: ${successCount}`);
    log.info(`   ❌ Failed: ${errorCount}`);
    
    if (errorCount > 0) {
      log.warn('Some migrations failed. Check the logs above for details.');
      process.exit(1);
    } else {
      log.success('🎉 All migrations completed successfully!');
    }
    
  } catch (error) {
    log.error(`Migration process failed: ${error.message}`);
    process.exit(1);
  }
}

async function rollbackMigration(version) {
  try {
    log.info(`🔄 Rolling back migration version: ${version}`);
    
    // Find migration file
    const migrationFiles = await getMigrationFiles();
    const migration = migrationFiles.find(m => m.version === version);
    
    if (!migration) {
      throw new Error(`Migration version ${version} not found`);
    }
    
    // Check if migration was executed
    const { data: executed } = await supabase
      .from(MIGRATIONS_TABLE)
      .select('*')
      .eq('version', version)
      .single();
    
    if (!executed) {
      log.warn(`Migration ${version} was not executed`);
      return;
    }
    
    // Look for rollback file
    const rollbackFile = migration.filename.replace('.sql', '_rollback.sql');
    const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFile);
    
    if (!fs.existsSync(rollbackPath)) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }
    
    // Execute rollback
    const rollbackContent = fs.readFileSync(rollbackPath, 'utf8');
    const statements = rollbackContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          throw new Error(`Rollback SQL execution failed: ${error.message}`);
        }
      }
    }
    
    // Remove migration record
    const { error } = await supabase
      .from(MIGRATIONS_TABLE)
      .delete()
      .eq('version', version);
    
    if (error) {
      throw new Error(`Failed to remove migration record: ${error.message}`);
    }
    
    log.success(`Migration ${version} rolled back successfully`);
    
  } catch (error) {
    log.error(`Rollback failed: ${error.message}`);
    process.exit(1);
  }
}

async function showStatus() {
  try {
    log.info('📊 Database Migration Status');
    
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = await getMigrationFiles();
    
    log.info(`\n📋 Migration Files (${migrationFiles.length}):`);
    migrationFiles.forEach(migration => {
      const executed = executedMigrations.find(m => m.version === migration.version);
      const status = executed ? '✅ Executed' : '⏳ Pending';
      const executedAt = executed ? ` (${new Date(executed.executed_at).toLocaleString()})` : '';
      log.info(`   ${migration.version} - ${migration.filename} - ${status}${executedAt}`);
    });
    
    log.info(`\n📈 Summary:`);
    log.info(`   Total files: ${migrationFiles.length}`);
    log.info(`   Executed: ${executedMigrations.length}`);
    log.info(`   Pending: ${migrationFiles.length - executedMigrations.length}`);
    
  } catch (error) {
    log.error(`Status check failed: ${error.message}`);
    process.exit(1);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'up':
    case 'migrate':
      await runMigrations();
      break;
      
    case 'rollback':
      if (!arg) {
        log.error('Rollback requires a version number');
        process.exit(1);
      }
      await rollbackMigration(arg);
      break;
      
    case 'status':
      await showStatus();
      break;
      
    default:
      console.log(`
ClientFlow AI Suite - Database Migration Tool

Usage:
  node scripts/migrate.js <command> [options]

Commands:
  up, migrate     Run pending migrations
  rollback <ver>  Rollback a specific migration
  status          Show migration status

Examples:
  node scripts/migrate.js up
  node scripts/migrate.js rollback 001
  node scripts/migrate.js status

Environment Variables:
  SUPABASE_URL              - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
  NODE_ENV                  - Environment (production/development)
      `);
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Migration tool failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runMigrations,
  rollbackMigration,
  showStatus
};
