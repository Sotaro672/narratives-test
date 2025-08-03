# Cloud Run Deployment Guide

This guide walks you through deploying the Narratives CRM backend to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK**: Make sure you have the Google Cloud SDK installed
2. **Docker**: Required for building container images
3. **Service Account Key**: A JSON key file for authentication with Google Cloud

## Setup Steps

### 1. Service Account Key

You need a service account key file named `narratives-crm-service_account.json` in the backend directory.

If you don't have this file:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to IAM & Admin > Service Accounts
3. Create a new service account or select an existing one
4. Create a new key (JSON format) and download it
5. Rename the file to `narratives-crm-service_account.json` and place it in the backend directory

### 2. Authentication

Authenticate with Google Cloud:
```
gcloud auth login
```

Configure Docker to use gcloud authentication:
```
gcloud auth configure-docker
```

### 3. Running the Deployment Script

Navigate to the backend directory and run the deployment script:
```
cd backend
.\deploy.ps1
```

## Troubleshooting

### Build Issues
- If you encounter issues with Docker build, check the Dockerfile syntax and dependencies
- Make sure your Go version in the Dockerfile matches the one in go.mod

### Permission Issues
- Ensure your service account has the necessary permissions:
  - Cloud Run Admin
  - Storage Admin
  - Service Account User

### Environment Variables
- If your app fails to start, check the environment variables in the deployment script
- You can modify them directly in the script before deployment

## Monitoring Your Deployment

Once deployed, you can monitor your service in the Google Cloud Console:
https://console.cloud.google.com/run

Your service will be available at:
https://narratives-crm-699392181476.us-central1.run.app
