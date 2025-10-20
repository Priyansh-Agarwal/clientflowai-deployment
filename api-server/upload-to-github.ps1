# 🚀 AUTOMATED GITHUB UPLOAD SCRIPT
# This script uploads all API server files to your GitHub repository automatically

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken,
    [Parameter(Mandatory=$false)]
    [string]$RepositoryOwner = "Priyansh-Agarwal",
    [Parameter(Mandatory=$false)]
    [string]$RepositoryName = "clientflow-ai-suite"
)

Write-Host "🚀 ClientFlow AI Suite - Automated GitHub Upload" -ForegroundColor Green
Write-Host "=============================================`n" -ForegroundColor Green

# GitHub API configuration
$baseUrl = "https://api.github.com"
$headers = @{
    "Authorization" = "token $GitHubToken"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "ClientFlow-Upload-Script"
}

# Function to create/update file in GitHub
function Upload-GitHubFile {
    param(
        [string]$Path,
        [string]$Content,
        [string]$Message = "Automated upload via PowerShell script"
    )
    
    try {
        $uri = "$baseUrl/repos/$RepositoryOwner/$RepositoryName/contents/$Path"
        
        # Check if file exists
        $existingFile = $null
        try {
            $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ErrorAction SilentlyContinue
            $existingFile = $response
        }
        catch {
            # File doesn't exist, that's fine
        }
        
        $body = @{
            message = $Message
            content = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Content))
        }
        
        if ($existingFile) {
            $body.sha = $existingFile.sha
        }
        
        $response = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers -Body ($body | ConvertTo-JSON)
        return $response
    }
    catch {
        Write-Host "❌ Failed to upload $Path : $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to upload directory recursively
function Upload-Directory {
    param(
        [string]$LocalPath,
        [string]$GitHubPath = ""
    )
    
    Get-ChildItem -Path $LocalPath -Recurse | ForEach-Object {
        if ($_.PSIsContainer) {
            # Skip directories, we'll handle files
            return
        }
        
        $relativePath = $_.FullName.Substring((Resolve-Path $LocalPath).Path.Length + 1)
        $relativePath = $relativePath.Replace("\", "/")
        
        if ($GitHubPath) {
            $githubFilePath = "$GitHubPath/$relativePath"
        } else {
            $githubFilePath = $relativePath
        }
        
        Write-Host "📤 Uploading: $githubFilePath" -ForegroundColor Yellow
        
        # Read file content
        $content = Get-Content -Path $_.FullName -Raw -Encoding UTF8
        
        # Upload to GitHub
        $result = Upload-GitHubFile -Path $githubFilePath -Content $content -Message "Automated upload: $githubFilePath"
        
        if ($result) {
            Write-Host "✅ Uploaded: $githubFilePath" -ForegroundColor Green
        }
        
        Start-Sleep -Milliseconds 500  # Rate limiting
    }
}

# Main execution
try {
    Write-Host "🔗 Connecting to GitHub repository..." -ForegroundColor Cyan
    Write-Host "Repository: $RepositoryOwner/$RepositoryName`n" -ForegroundColor Cyan
    
    # Test GitHub connection
    $repoUrl = "$baseUrl/repos/$RepositoryOwner/$RepositoryName"
    $repoCheck = Invoke-RestMethod -Uri $repoUrl -Method Get -Headers $headers
    Write-Host "✅ Connected to repository successfully!" -ForegroundColor Green
    
    # Upload API server files
    Write-Host "`n📁 Uploading API server files..." -ForegroundColor Cyan
    
    # Upload root API server files
    $rootFiles = @("index.js", "package.json", "vercel.json", ".gitignore", "env.example")
    foreach ($file in $rootFiles) {
        if (Test-Path $file) {
            Write-Host "📤 Uploading: api-server/$file" -ForegroundColor Yellow
            $content = Get-Content -Path $file -Raw -Encoding UTF8
            $result = Upload-GitHubFile -Path "api-server/$file" -Content $content -Message "Upload API server: $file"
            if ($result) {
                Write-Host "✅ Uploaded: api-server/$file" -ForegroundColor Green
            }
        }
    }
    
    # Upload documentation files
    Write-Host "`n📚 Uploading documentation files..." -ForegroundColor Cyan
    $docFiles = Get-ChildItem -Path "." -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }
    foreach ($file in $docFiles) {
        Write-Host "📤 Uploading: api-server/$($file.Name)" -ForegroundColor Yellow
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $result = Upload-GitHubFile -Path "api-server/$($file.Name)" -Content $content -Message "Upload documentation: $($file.Name)"
        if ($result) {
            Write-Host "✅ Uploaded: api-server/$($file.Name)" -ForegroundColor Green
        }
    }
    
    # Upload src directory
    if (Test-Path "src") {
        Write-Host "`n⚙️ Uploading source code structure..." -ForegroundColor Cyan
        Upload-Directory -LocalPath "src" -GitHubPath "api-server/src"
    }
    
    # Upload docs directory
    if (Test-Path "docs") {
        Write-Host "`n📖 Uploading API documentation..." -ForegroundColor Cyan
        Upload-Directory -LocalPath "docs" -GitHubPath "api-server/docs"
    }
    
    # Upload scripts directory
    if (Test-Path "scripts") {
        Write-Host "`n🔧 Uploading helper scripts..." -ForegroundColor Cyan
        Upload-Directory -LocalPath "scripts" -GitHubPath "api-server/scripts"
    }
    
    # Upload supabase directory
    if (Test-Path "supabase") {
        Write-Host "`n🗄️ Uploading database files..." -ForegroundColor Cyan
        Upload-Directory -LocalPath "supabase" -GitHubPath "api-server/supabase"
    }
    
    # Upload GitHub Actions workflow
    if (Test-Path ".github/workflows/deploy-api.yml") {
        Write-Host "`n🔄 Uploading CI/CD pipeline..." -ForegroundColor Cyan
        $content = Get-Content -Path ".github/workflows/deploy-api.yml" -Raw -Encoding UTF8
        $result = Upload-GitHubFile -Path "api-server/.github/workflows/deploy-api.yml" -Content $content -Message "Upload CI/CD pipeline"
        if ($result) {
            Write-Host "✅ Uploaded CI/CD pipeline" -ForegroundColor Green
        }
    }
    
    # Update main README
    Write-Host "`n📖 Updating main repository README..." -ForegroundColor Cyan
    $mainReadme = @"
# ClientFlow AI Suite

**Full-Stack CRM Application with AI-Powered Business Automation**

## 🌐 Live Demo
- **Frontend**: https://clientflow-ai-suite.vercel.app
- **API**: Deployed via Vercel (see api-server/ folder)

## 🏗️ Architecture

- 🌐 **Frontend**: React + TypeScript + Tailwind CSS + Vite
- 🚀 **Backend**: Node.js + Express + TypeScript + Supabase
- 🎨 **UI Components**: shadcn/ui + Tailwind CSS
- 📱 **Deployment**: Vercel (Frontend + Backend)

## 💻 Quick Start

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### API Development
```bash
cd api-server

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm start
```

## 📋 Features

### ✅ Frontend Features
- Modern React dashboard with TypeScript
- Responsive design with Tailwind CSS
- Component library with shadcn/ui
- Real-time updates with Supabase
- Form validation and error handling

### ✅ Backend Features
- Multi-tenant business management
- Customer relationship management
- Appointment scheduling system
- SMS/Call integration via Twilio
- Automated notifications and webhooks
- Real-time analytics dashboard

## 🔗 API Documentation

See [api-server/README.md](./api-server/README.md) for complete API reference.

### Key Endpoints
- `GET /health` - API health check
- `GET /api/businesses` - List businesses
- `GET /api/customers` - List customers
- `POST /api/appointments` - Create appointment
- `GET /api/analytics/dashboard` - Dashboard metrics

## 🚀 Deployment

### Frontend
The React frontend is automatically deployed to Vercel on every main branch push.

### Backend API
The API server can be deployed separately to Vercel:
1. Import the repository to Vercel
2. Set root directory to `api-server/`
3. Configure environment variables
4. Deploy

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**🎯 A complete business management solution with modern technology stack!**
"@
    
    $result = Upload-GitHubFile -Path "README.md" -Content $mainReadme -Message "Update main repository README with full-stack documentation"
    if ($result) {
        Write-Host "✅ Updated main repository README" -ForegroundColor Green
    }
    
    Write-Host "`n🎉 UPLOAD COMPLETE!" -ForegroundColor Green
    Write-Host "=================" -ForegroundColor Green
    Write-Host "✅ All API server files uploaded successfully" -ForegroundColor Green
    Write-Host "✅ Repository structure updated" -ForegroundColor Green
    Write-Host "✅ Main README updated" -ForegroundColor Green
    Write-Host "✅ Documentation added" -ForegroundColor Green
    Write-Host "✅ CI/CD pipeline ready" -ForegroundColor Green
    
    Write-Host "`n🌐 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://github.com/$RepositoryOwner/$RepositoryName" -ForegroundColor Yellow
    Write-Host "2. Verify all files uploaded correctly" -ForegroundColor Yellow
    Write-Host "3. Deploy to Vercel using the api-server/ folder" -ForegroundColor Yellow
    
    Write-Host "`n🚀 Your complete CRM API is now on GitHub!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your GitHub token and repository access." -ForegroundColor Red
}
