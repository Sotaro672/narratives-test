# CRM Frontend Build and Deploy Script for Windows
Write-Host "Building CRM Frontend..." -ForegroundColor Green

# Navigate to frontend directory and build
Set-Location ..\frontend
npm run build

# Return to backend directory  
Set-Location ..\backend

# Copy build files
Write-Host "Copying build files..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force ..\frontend\dist .

# Deploy to Firebase
Write-Host "Deploying to Firebase..." -ForegroundColor Blue
firebase deploy --only hosting --project narratives-test-64976

Write-Host "Deployment complete!" -ForegroundColor Green
