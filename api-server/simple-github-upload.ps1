Write-Host "🚀 CLIENTFLOW API SERVER - AUTOMATED GITHUB UPLOAD" -ForegroundColor Green

$repoOwner = "Priyansh-Agarwal"
$repoName = "clientflow-ai-suite"
$repoUrl = "https://github.com/$repoOwner/$repoName.git"

Write-Host "📋 TARGET REPOSITORY: $repoUrl" -ForegroundColor Cyan

Write-Host "🔧 CHECKING GIT INSTALLATION..." -ForegroundColor Yellow

try {
    git --version | Out-Null
    Write-Host "✅ Git is available!" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found. Installing..." -ForegroundColor Red
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
    Write-Host "✅ Git installation attempted!" -ForegroundColor Green
}

$tempDir = "github-upload-temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

Write-Host "`n📥 CLONING REPOSITORY..." -ForegroundColor Yellow
git clone $repoUrl $tempDir
Set-Location $tempDir

Write-Host "📁 CREATING API-SERVER DIRECTORY..." -ForegroundColor Yellow
if (-not (Test-Path "api-server")) {
    New-Item -ItemType Directory -Path "api-server" | Out-Null
}

Write-Host "📋 COPYING FILES..." -ForegroundColor Yellow
Copy-Item "../index.js" "api-server/"
Copy-Item "../package.json" "api-server/"
Copy-Item "../vercel.json" "api-server/"
Copy-Item "../.gitignore" "api-server/"
Copy-Item "../README.md" "api-server/"

Write-Host "💾 COMMITTING CHANGES..." -ForegroundColor Yellow
git add .
git commit -m "feat: Add production-ready API server with Supabase integration"

Write-Host "🚀 PUSHING TO GITHUB..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 SUCCESS!" -ForegroundColor Green
    Write-Host "✅ API Server uploaded to GitHub!" -ForegroundColor Green
    Write-Host "🔗 https://github.com/$repoOwner/$repoName" -ForegroundColor Cyan
    Write-Host "`n🚀 NEXT: Deploy to Vercel at https://vercel.com/new" -ForegroundColor Yellow
} else {
    Write-Host "❌ Push failed - check Git authentication" -ForegroundColor Red
}

Set-Location ..
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
