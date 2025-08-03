#!/bin/bash

# Set variables
PROJECT_ID="narratives-crm"
SERVICE_NAME="narratives-crm"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "Starting deployment to Cloud Run..."

# Authenticate with gcloud (if needed)
# gcloud auth login

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image
echo "Building Docker image..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 100 \
  --set-env-vars="PORT=8080,GO_ENV=production,GOOGLE_CLOUD_PROJECT=narratives-crm"

echo "Deployment completed!"
echo "Service URL: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')"
