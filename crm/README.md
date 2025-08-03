# Narratives CRM

A Customer Relationship Management system built with Go backend and modern frontend.

## Project Structure

```
├── backend/        # Go backend server
│   ├── main.go    # Main application entry point
│   └── go.mod     # Go module definition
├── frontend/       # React frontend application (TypeScript + Vite)
│   ├── src/       # Source code
│   ├── public/    # Static assets
│   ├── package.json
│   └── vite.config.ts
└── README.md      # This file
```

## Frontend (React + TypeScript)

### Features
- React 19 with TypeScript
- Vite for fast development and building
- ESLint for code quality
- SWC for fast compilation

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The development server will start on `http://localhost:5174`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Backend (Go)

### Features
- HTTP server running on port 8080
- Health check endpoint at `/health`
- Basic API structure

### Running the Backend

```bash
cd backend
go build -o narratives-crm-backend.exe .
./narratives-crm-backend.exe
```

The server will start on `http://localhost:8080`

### Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check

## Cloud Run Deployment

### Prerequisites for Deployment
- Google Cloud SDK (`gcloud`) installed and authenticated
- Docker installed
- Google Cloud project with Cloud Run API enabled

### Deployment Steps

1. **Configure your project ID** in the deployment scripts:
   - Edit `deploy.ps1` (Windows) or `deploy.sh` (Linux/Mac)
   - Replace `your-project-id` with your actual Google Cloud project ID

2. **Deploy using the script:**
   ```powershell
   # Windows
   .\deploy.ps1
   ```
   ```bash
   # Linux/Mac
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Manual deployment (alternative):**
   ```bash
   # Build and push to Container Registry
   docker build -t gcr.io/PROJECT_ID/narratives-crm-backend ./backend
   docker push gcr.io/PROJECT_ID/narratives-crm-backend

   # Deploy to Cloud Run
   gcloud run deploy narratives-crm \
     --image gcr.io/PROJECT_ID/narratives-crm-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080
   ```

### Configuration Files
- `backend/Dockerfile` - Multi-stage Docker build for Go backend
- `backend/service.yaml` - Cloud Run service configuration
- `cloudbuild.yaml` - Cloud Build configuration for CI/CD
- `deploy.ps1` / `deploy.sh` - Deployment scripts

## Development

### Prerequisites
- Go 1.21 or later
- Node.js 18 or later
- npm or yarn
- Git

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/Sotaro672/Narratives-CRM.git
cd Narratives-CRM
```

2. Install dependencies and run the backend:
```bash
cd backend
go run main.go
```

3. Install dependencies and run the frontend:
```bash
cd frontend
npm install
npm run dev
```

The backend will be available at `http://localhost:8080` and the frontend at `http://localhost:5174`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
