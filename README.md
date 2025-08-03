# Narratives Monorepo

This is a monorepo containing both CRM and SNS applications for the Narratives project.

## Project Structure

```
├── crm/                    # CRM Application
│   ├── backend/           # Go GraphQL backend
│   ├── frontend/          # Vue.js frontend
│   ├── functions/         # Firebase Cloud Functions
│   └── extensions/        # Firebase Extensions
├── sns/                   # SNS Application  
│   ├── backend/           # Go GraphQL backend
│   └── flutter_app/       # Flutter web/mobile app
├── firebase.json          # Firebase configuration
├── firestore.rules        # Shared Firestore security rules
├── cors.json             # CORS configuration
└── package.json          # Monorepo scripts and dependencies
```

## Quick Start

### Prerequisites
- Node.js 18+
- Go 1.21+
- Flutter SDK
- Firebase CLI

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install individually
npm run install:crm
npm run install:sns
```

### Development

```bash
# CRM Frontend (Vue.js)
npm run dev:crm:frontend

# CRM Backend (Go)
npm run dev:crm:backend

# SNS Backend (Go)  
npm run dev:sns:backend

# SNS Flutter App
cd sns/flutter_app
flutter run -d web-server --web-port 3000
```

### Build

```bash
# Build CRM Frontend
npm run build:crm:frontend

# Build CRM Backend
npm run build:crm:backend

# Build SNS Backend
npm run build:sns:backend

# Build SNS Flutter Web
npm run build:sns:app
```

### Deployment

```bash
# Deploy CRM
npm run deploy:crm

# Deploy SNS
npm run deploy:sns
```

## Configuration

### Firebase Projects
- CRM: `narratives-crm`
- SNS: `narratives-test-64976`

### Environment Variables
Set up environment variables in each service directory:
- `crm/backend/.env`
- `sns/backend/.env`

### Firebase Configuration
- Shared Firestore rules in `firestore.rules`
- Individual project configurations in respective directories
- CORS settings in `cors.json`

## Development Workflow

1. Make changes in the respective service directory (`crm/` or `sns/`)
2. Test locally using the dev scripts
3. Build and test the complete application
4. Deploy to Firebase

## Services

### CRM (Customer Relationship Management)
- **Frontend**: Vue.js with TypeScript
- **Backend**: Go with GraphQL (gqlgen)
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting

### SNS (Social Networking Service)
- **App**: Flutter (Web/Mobile)
- **Backend**: Go with GraphQL (gqlgen) 
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting

## Contributing

1. Follow the established directory structure
2. Use the provided npm scripts for common tasks
3. Ensure all tests pass before committing
4. Update documentation as needed
