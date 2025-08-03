#!/bin/bash

# Configuration
PROJECT_ID="your-project-id"  # Replace with your actual project ID
SERVICE_NAME="narratives-crm"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/narratives-crm-backend"

echo "🚀 Deploying Narratives CRM to Cloud Run..."

# Build and push the image
echo "📦 Building Docker image..."
cd backend
docker build -t $IMAGE_NAME:latest .

echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_NAME:latest

echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 100 \
  --timeout 300

echo "✅ Deployment completed!"
echo "🔗 Service URL:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
