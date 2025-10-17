---
description: Repository Information Overview
alwaysApply: true
---

# ERP System Information

## Summary
A modern, full-stack ERP system built with React, TypeScript, Express.js, and PostgreSQL. This project focuses on the Purchase & Inventory module with comprehensive supplier management capabilities. The system includes backend API services, a React-based frontend, and end-to-end testing.

## Structure
- **backend/**: Express.js API with TypeScript
- **frontend/**: React application with TypeScript and Tailwind CSS
- **e2e_testing/**: Playwright-based end-to-end tests
- **documents/**: Project documentation and implementation guides
- **.zencoder/**: Zencoder configuration and rules
- **.github/**: GitHub workflows and CI/CD configuration

## Projects

### Backend (Express.js + TypeScript)
**Configuration File**: backend/package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.3.3
**Runtime**: Node.js v18+
**Build System**: tsc (TypeScript compiler)
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- express: ^4.18.2 (Web framework)
- pg: ^8.16.3 (PostgreSQL client)
- drizzle-orm: ^0.44.6 (ORM)
- bcrypt: ^6.0.0 (Password hashing)
- jsonwebtoken: ^9.0.2 (JWT authentication)
- joi: ^17.11.0 (Validation)

#### Build & Installation
```bash
cd backend
npm install
cp env.example .env
# Update .env with database credentials
npm run db:migrate
npm run db:seed
```

#### Build Commands
```bash
# Development
npm run dev

# Production build with obfuscation
npm run build:prod

# Start production server
npm start
```

#### Testing
**Database Migrations**:
```bash
npm run db:migrate       # Run migrations
npm run db:migrate:info  # Migration status
npm run db:validate      # Validate migrations
```

### Frontend (React + TypeScript)
**Configuration File**: frontend/package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.8.3
**Build System**: Vite 5.4.19
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- react: ^18.3.1
- react-dom: ^18.3.1
- react-router-dom: ^6.30.1
- @tanstack/react-query: ^5.83.0
- axios: ^1.12.2
- tailwindcss: ^3.4.17
- zod: ^3.25.76
- shadcn/ui components (via Radix UI)

#### Build & Installation
```bash
cd frontend
npm install
cp env.example .env
```

#### Build Commands
```bash
# Development
npm run dev

# Production build with obfuscation
npm run build

# Development build without obfuscation
npm run build:dev

# Preview production build
npm run preview
```

### E2E Testing (Playwright)
**Configuration File**: e2e_testing/package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: TypeScript 5.3.3
**Framework**: Playwright 1.48.2
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- @playwright/test: ^1.48.2
- pg: ^8.11.5 (PostgreSQL client for test data)

#### Test Commands
```bash
cd e2e_testing
npm install

# Run tests
npm test

# Run tests in serial mode
npm run test:serial

# Run tests with UI
npm run test:ui

# Generate test code
npm run codegen
```

## Deployment

### PM2 Configuration
**File**: ecosystem.config.js
**Services**:
- erp-backend: Node.js backend service
- erp-frontend: Vite frontend preview service

### Deployment Script
**File**: deploy.sh
**Process**:
1. Builds backend with obfuscation
2. Builds frontend for production
3. Zips distribution files
4. Uploads to remote server
5. Extracts files on server
6. Restarts PM2 processes

### License System
The project includes a license management system with:
- Time-based expiration
- Hardware binding
- Feature flags
- User limits
- Code obfuscation for IP protection
```