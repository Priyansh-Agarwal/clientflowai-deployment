Write-Host "ClientFlow API Server - GitHub Upload" -ForegroundColor Green

$repoOwner = "Priyansh-Agarwal"
$repoName = "clientflow-ai-suite"
$repoUrl = "https://github.com/$repoOwner/$repoName.git"

Write-Host "Target Repository: $repoUrl" -ForegroundColor Cyan

# Check Git
try {
    git --version | Out-Null
    Write-Host "Git is available!" -ForegroundColor Green
} catch {
    Write-Host "Installing Git..." -ForegroundColor Yellow
    winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
}

$tempDir = "temp-upload"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

Write-Host "Cloning repository..." -ForegroundColor Yellow
git clone $repoUrl $tempDir
Set-Location $tempDir

Write-Host "Creating api-server directory..." -ForegroundColor Yellow
if (-not (Test-Path "api-server")) {
    New-Item -ItemType Directory -Path "api-server" | Out-Null
}

Write-Host "Copying files..." -ForegroundColor Yellow
Copy-Item "../index.js" "api-server/"
Copy-Item "../package.json" "api-server/"
Copy-Item "../vercel.json" "api-server/"
Copy-Item "../.gitignore" "api-server/"
Copy-Item "../README.md" "api-server/"

Write-Host "Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "Add production API server"

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS! API Server uploaded to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/$repoOwner/$repoName" -ForegroundColor Cyan
} else {
    Write-Host "Push failed - check Git authentication" -ForegroundColor Red
}

Set-Location ..
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
