#!/bin/bash

# ClientFlow AI Suite - Migration Runner
# Runs database migrations in CI/CD pipeline

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Check required environment variables
check_env() {
    log_info "Checking environment variables..."
    
    if [ -z "$SUPABASE_URL" ]; then
        log_error "SUPABASE_URL is not set"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        log_error "SUPABASE_SERVICE_ROLE_KEY is not set"
        exit 1
    fi
    
    log_success "Environment variables validated"
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    # Create a simple test script
    cat > test_connection.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('Database connection successful');
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
EOF

    # Run the test
    if node test_connection.js; then
        log_success "Database connection successful"
        rm test_connection.js
    else
        log_error "Database connection failed"
        rm test_connection.js
        exit 1
    fi
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Check if migration script exists
    if [ ! -f "scripts/migrate.js" ]; then
        log_error "Migration script not found: scripts/migrate.js"
        exit 1
    fi
    
    # Run migrations
    if node scripts/migrate.js up; then
        log_success "Migrations completed successfully"
    else
        log_error "Migrations failed"
        exit 1
    fi
}

# Verify migrations
verify_migrations() {
    log_info "Verifying migrations..."
    
    if node scripts/migrate.js status; then
        log_success "Migration verification completed"
    else
        log_error "Migration verification failed"
        exit 1
    fi
}

# Main execution
main() {
    log_info "🚀 Starting ClientFlow AI Suite migration process..."
    
    # Check environment
    check_env
    
    # Test connection
    test_connection
    
    # Run migrations
    run_migrations
    
    # Verify migrations
    verify_migrations
    
    log_success "🎉 Migration process completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "test-connection")
        check_env
        test_connection
        ;;
    "migrate")
        check_env
        test_connection
        run_migrations
        ;;
    "verify")
        check_env
        verify_migrations
        ;;
    "full")
        main
        ;;
    *)
        echo "ClientFlow AI Suite - Migration Runner"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  test-connection  Test database connection only"
        echo "  migrate         Run migrations only"
        echo "  verify          Verify migration status"
        echo "  full            Run full migration process (default)"
        echo ""
        echo "Environment Variables:"
        echo "  SUPABASE_URL              - Supabase project URL"
        echo "  SUPABASE_SERVICE_ROLE_KEY - Supabase service role key"
        echo "  NODE_ENV                  - Environment (production/development)"
        echo ""
        echo "Examples:"
        echo "  $0 test-connection"
        echo "  $0 migrate"
        echo "  $0 full"
        ;;
esac
