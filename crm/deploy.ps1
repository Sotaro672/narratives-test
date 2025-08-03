# Configuration
$PROJECT_ID = "narratives-crm"
$SERVICE_NAME = "narratives-crm"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/narratives-crm-backend"

Write-Host "🚀 Deploying Narratives CRM to Cloud Run..." -ForegroundColor Green

# Build and push the image
Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
Set-Location backend
docker build -t "${IMAGE_NAME}:latest" .

Write-Host "📤 Pushing image to Container Registry..." -ForegroundColor Yellow
docker push "${IMAGE_NAME}:latest"

Write-Host "🌐 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image "${IMAGE_NAME}:latest" `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 100 `
  --timeout 300 `
  --set-env-vars="GO_ENV=production,GOOGLE_CLOUD_PROJECT=narratives-crm,GOOGLE_APPLICATION_CREDENTIALS=./narratives-crm-service_account.json,SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=caotailangaogang@gmail.com,SMTP_PASSWORD=dmkpcyrzmfavisnz,FROM_EMAIL=caotailangaogang@gmail.com,FROM_NAME=Narratives CRM System,FRONTEND_URL=https://narratives-crm-site.web.app"

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🔗 Service URL:" -ForegroundColor Cyan
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
