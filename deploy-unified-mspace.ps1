# Deploy the new unified MSpace service and deprecate old functions

Write-Host "🚀 Deploying Unified MSpace Service..." -ForegroundColor Green

# Deploy the new unified service
Write-Host "Deploying mspace-service..." -ForegroundColor Yellow
supabase functions deploy mspace-service

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ mspace-service deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy mspace-service" -ForegroundColor Red
    exit 1
}

# Apply database migration for missing columns
Write-Host "Applying database migration..." -ForegroundColor Yellow
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database migration applied successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to apply database migration" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Unified MSpace Service Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the admin dashboard user management" -ForegroundColor White
Write-Host "2. Verify balance checking works" -ForegroundColor White
Write-Host "3. Test reseller client functionality" -ForegroundColor White
Write-Host "4. Check credential management" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Old Functions (TO BE DEPRECATED):" -ForegroundColor Yellow
Write-Host "- mspace-accounts" -ForegroundColor Gray
Write-Host "- mspace-balance" -ForegroundColor Gray
Write-Host "- mspace-balance-simple" -ForegroundColor Gray
Write-Host "- mspace-credentials" -ForegroundColor Gray
Write-Host "- debug-mspace-credentials" -ForegroundColor Gray
Write-Host "- decrypt-credentials" -ForegroundColor Gray
Write-Host "- test-mspace-balance" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 These will be removed after testing the unified service" -ForegroundColor Yellow