#!/bin/bash

# ClientFlow AI Suite - Production Build Script
echo "🚀 Building ClientFlow AI Suite for production..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Install dev dependencies for build
echo "🔧 Installing build dependencies..."
npm install --only=development

# Type check
echo "🔍 Running type check..."
npm run type-check

# Lint check
echo "🧹 Running lint check..."
npm run lint

# Build TypeScript
echo "🏗️  Building TypeScript..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Verify main files exist
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

# Clean up dev dependencies
echo "🧹 Cleaning up dev dependencies..."
npm prune --production

# Create production package.json
echo "📝 Creating production package.json..."
cp package.json package.json.backup
jq 'del(.devDependencies, .scripts.build, .scripts["build:watch"], .scripts.lint, .scripts["lint:fix"], .scripts["type-check"], .scripts.clean, .scripts.prebuild, .scripts.postbuild)' package.json > package.prod.json
mv package.prod.json package.json

echo "✅ Production build completed successfully!"
echo "📁 Built files are in the 'dist' directory"
echo "🚀 Ready for deployment!"

# Show build summary
echo ""
echo "📊 Build Summary:"
echo "  - TypeScript: Compiled to JavaScript"
echo "  - Dependencies: Production only"
echo "  - Size: $(du -sh dist | cut -f1)"
echo "  - Files: $(find dist -name "*.js" | wc -l) JavaScript files"
echo ""
echo "🎯 Next steps:"
echo "  1. Test the build: npm start"
echo "  2. Deploy to Vercel: vercel --prod"
echo "  3. Or deploy to your preferred platform"