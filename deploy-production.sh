#!/bin/bash
# ClientFlow AI Suite - Production Deployment Script
# This script automates the deployment process

set -e

echo "🚀 ClientFlow AI Suite - Production Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_status "Dependencies check passed"
}

# Check environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env.production" ]; then
        print_warning "Production environment file not found. Creating template..."
        cp env.example .env.production
        print_warning "Please edit .env.production with your actual values before continuing."
        exit 1
    fi
    
    # Check for required variables
    source .env.production
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$JWT_SECRET" ]; then
        print_error "Missing required environment variables:"
        print_error "- SUPABASE_URL"
        print_error "- SUPABASE_SERVICE_ROLE_KEY" 
        print_error "- JWT_SECRET"
        print_error "Please update .env.production with your actual values."
        exit 1
    fi
    
    print_status "Environment variables check passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install API server dependencies
    cd api-server
    npm ci --production
    cd ..
    
    # Install web app dependencies
    cd apps/web
    npm ci
    cd ../..
    
    print_status "Dependencies installed successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    cd api-server
    npm test
    cd ..
    
    print_status "Tests passed successfully"
}

# Build applications
build_applications() {
    print_status "Building applications..."
    
    # Build API server
    cd api-server
    npm run build
    cd ..
    
    # Build web app
    cd apps/web
    npm run build
    cd ../..
    
    print_status "Applications built successfully"
}

# Deploy API server
deploy_api() {
    print_status "Deploying API server..."
    
    cd api-server
    
    # Check if Vercel CLI is installed
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod --yes
    else
        print_warning "Vercel CLI not found. Please install it with: npm install -g vercel"
        print_warning "Or deploy manually to your preferred platform."
    fi
    
    cd ..
}

# Deploy web app
deploy_web() {
    print_status "Deploying web application..."
    
    cd apps/web
    
    # Check if Vercel CLI is installed
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod --yes
    else
        print_warning "Vercel CLI not found. Please install it with: npm install -g vercel"
        print_warning "Or deploy manually to your preferred platform."
    fi
    
    cd ../..
}

# Run smoke tests
run_smoke_tests() {
    print_status "Running smoke tests..."
    
    cd api-server
    npm run smoke:production
    cd ..
    
    print_status "Smoke tests passed"
}

# Main deployment function
main() {
    echo "Starting deployment process..."
    
    check_dependencies
    check_env_vars
    install_dependencies
    run_tests
    build_applications
    
    # Ask user for deployment preference
    echo ""
    echo "Choose deployment method:"
    echo "1) Deploy both API and Web app"
    echo "2) Deploy API only"
    echo "3) Deploy Web app only"
    echo "4) Skip deployment (manual)"
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_api
            deploy_web
            ;;
        2)
            deploy_api
            ;;
        3)
            deploy_web
            ;;
        4)
            print_warning "Skipping deployment. Please deploy manually."
            ;;
        *)
            print_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
    
    echo ""
    print_status "Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Set up your Supabase database with the provided migrations"
    echo "2. Configure environment variables in your deployment platform"
    echo "3. Test your deployed application"
    echo "4. Set up monitoring and error tracking"
    echo ""
    echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@"

