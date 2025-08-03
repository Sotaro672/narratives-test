# Narratives CRM Cloud Run Deployment Steps

## Prerequisites

1. Google Cloud SDK installed
2. Docker installed
3. Service account key for authentication

## Step 1: Prepare Service Account Key

1. Visit the Google Cloud Console: https://console.cloud.google.com/
2. Navigate to IAM & Admin > Service Accounts
3. Create a new service account or select an existing one
4. Create a JSON key and download it
5. Rename it to `narratives-crm-service_account.json` 
6. Place it in the `backend` directory

## Step 2: Authentication

Open PowerShell and navigate to your project directory:

```powershell
cd C:\Users\caota\narratives-crm\backend
```

Authenticate with Google Cloud:

```powershell
gcloud auth login
```

Configure Docker to use gcloud authentication:

```powershell
gcloud auth configure-docker
```

## Step 3: Update Project Configuration

Ensure your `deploy.ps1` script has the correct project ID:
- `$PROJECT_ID = "narratives-crm-699392181476"`
- Confirm environment variables are set correctly

## Step 4: Run Deployment Script

Execute the deployment script:

```powershell
.\deploy.ps1
```

This script will:
1. Check for service account file
2. Enable necessary Google Cloud APIs
3. Build and push the Docker image
4. Deploy to Cloud Run
5. Set environment variables

## Step 5: Verify Deployment

After deployment completes:

1. Visit the provided service URL:
   https://narratives-crm-699392181476.us-central1.run.app

2. Test endpoints to verify functionality:
   - `/health` - Should return "OK"
   - `/env` - Should return environment information
   - `/firebase/test` - Should confirm Firebase connection

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check the Docker build logs
   - Verify Go version compatibility
   - Ensure all dependencies are accessible

2. **Permission Errors**:
   - Verify service account has necessary permissions
   - Make sure you're authenticated with gcloud

3. **Environment Variables**:
   - Check if all required environment variables are set
   - Verify secret values are correct

4. **Connectivity Issues**:
   - Test Firebase connectivity
   - Check SMTP server configuration
   - Verify network settings in Cloud Run

## Monitoring

Monitor your deployed service in Google Cloud Console:
https://console.cloud.google.com/run

View logs for debugging:
https://console.cloud.google.com/logs
