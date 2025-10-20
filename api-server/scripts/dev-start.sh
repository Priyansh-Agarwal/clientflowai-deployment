#!/bin/bash
# Development Environment Startup Script

echo "🚀 Starting ClientFlow AI Suite Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f "env.example" ]; then
        cp env.example .env
        print_status "Created .env file from template"
        print_warning "Please edit .env file with your configuration before continuing"
        exit 1
    else
        print_error "env.example not found. Cannot create .env file"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node --version)
REQUIRED_VERSION="v18"
if [[ $NODE_VERSION == v1[89]* ]] || [[ $NODE_VERSION == v2[0-9]* ]]; then
    print_status "Node.js version: $NODE_VERSION (Supported)"
else
    print_warning "Node.js version: $NODE_VERSION (Recommended: v18+)"
fi

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_warning "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Dependencies already installed"
fi

# Check environment variables
print_status "Checking environment configuration..."

# Load environment variables
source .env

# Check required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_warning "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    print_warning "Please configure these variables in your .env file"
fi

# Check optional environment variables
OPTIONAL_VARS=("TWILIO_ACCOUNT_SID" "TWILIO_AUTH_TOKEN")
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_warning "Optional environment variable not set: $var (SMS/Call features will be limited)"
    fi
done

# Check TypeScript compilation
print_status "Checking TypeScript compilation..."
npm run build
if [ $? -eq 0 ]; then
    print_status "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Check Supabase connection
print_status "Testing Supabase connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from('businesses').select('id').limit(1)
  .then(() => {
    console.log('✓ Supabase connection successful');
    process.exit(0);
  })
  .catch((error) => {
    console.log('✗ Supabase connection failed:', error.message);
    process.exit(1);
  });
"

if [ $? -eq 0 ]; then
    print_status "Supabase connection test passed"
else
    print_warning "Supabase connection test failed - check your credentials"
fi

# Display startup information
echo ""
echo "🎉 Development environment ready!"
echo ""
echo "📚 Available commands:"
echo "  npm run dev     - Start development server with hot reload"
echo "  npm run build   - Build TypeScript to JavaScript"
echo "  npm run test    - Run test suite"
echo "  npm run lint    - Run ESLint"
echo ""
echo "🌐 Server will start on: http://localhost:3001"
echo "📖 API documentation: http://localhost:3001/api"
echo "❤️  Health check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop the development server"

# Wait for user input
read -p "Press Enter to start the development server..."

# Start development server
npm run dev