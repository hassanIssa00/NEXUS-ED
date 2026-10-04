# ============================================
# Nexus EDU — Windows PowerShell local verification script
# Usage: .\deploy_all.ps1
# ============================================

Write-Host "Nexus EDU Local Verification Build" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location $root

Write-Host "`nChecking TypeScript across web, API, and mobile..." -ForegroundColor Yellow
npm run check-types
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nBuilding the API..." -ForegroundColor Yellow
npm run build --workspace=api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nBuilding the web app..." -ForegroundColor Yellow
$env:NEXT_TELEMETRY_DISABLED = "1"
npm run build --workspace=web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nLocal verification builds completed. This script does not start or deploy production services." -ForegroundColor Green
Write-Host "Production deployment configuration: docker-compose.prod.yml (OCI Always Free candidate)."
Write-Host "Push the reviewed changes to origin/master; verify GitHub CI before any production use."
