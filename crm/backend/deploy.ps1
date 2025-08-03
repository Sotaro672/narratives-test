# PowerShell deployment script for Cloud Run

# Set variables
$PROJECT_ID = "narratives-test-64976"
$SERVICE_NAME = "narratives-crm"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "Starting deployment to Cloud Run..." -ForegroundColor Green

# Check if service account file exists
if (-not (Test-Path -Path ".\narratives-test-service_account.json" -PathType Leaf)) {
    Write-Host "Error: Service account file 'narratives-test-service_account.json' not found in the current directory!" -ForegroundColor Red
    Write-Host "Please download your service account key from Google Cloud Console and save it as 'narratives-test-service_account.json' in the backend directory." -ForegroundColor Yellow
    Write-Host "Instructions: https://cloud.google.com/iam/docs/creating-managing-service-account-keys" -ForegroundColor Cyan
    exit 1
}

# Set the project
Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --max-instances 100 `
  --set-env-vars=
  "GO_ENV=production,
  GOOGLE_CLOUD_PROJECT=narratives-test-64976,
  GOOGLE_APPLICATION_CREDENTIALS=./narratives-test-service_account.json,
  CLOUD_RUN_SERVICE_URL=https://narratives-crm-us-central1.run.app,
  SMTP_HOST=smtp.gmail.com,
  SMTP_PORT=587,
  SMTP_USER=caotailangaogang@gmail.com,
  SMTP_PASSWORD=dmkpcyrzmfavisnz,
  FROM_EMAIL=caotailangaogang@gmail.com,
  FROM_NAME=Narratives CRM System,
  FRONTEND_URL=https://narratives-test-64976.web.app"

Write-Host "Deployment completed!" -ForegroundColor Green

# Get service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format "value(status.url)"
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Cyan
