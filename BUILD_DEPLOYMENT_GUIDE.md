# Build & Deployment Guide

## Quick Start

### Development Build

```bash
# Backend (no obfuscation)
cd backend
npm run build

# Frontend (no obfuscation)
cd frontend
npm run build:dev
```

### Production Build (with Obfuscation)

```bash
# Backend (TypeScript compilation + obfuscation)
cd backend
npm run build:prod

# Frontend (optimized + obfuscated)
cd frontend
npm run build
```

## What's New: License System & Code Protection

This project now includes:
1. **License Key System** - Control client usage and prevent unauthorized resale
2. **Code Obfuscation** - Protect your source code from reverse engineering
3. **Machine Binding** - Lock licenses to specific hardware
4. **Feature Control** - Enable/disable features per license

## Build Commands

### Backend

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run dev` | Development server with hot reload | Development |
| `npm run build` | Compile TypeScript only | Testing/Staging |
| `npm run build:prod` | Compile + Obfuscate | Production Deployment |
| `npm run obfuscate` | Obfuscate existing dist/ | Re-obfuscate after build |
| `npm run generate:license` | Generate license keys | License management |
| `npm start` | Run compiled code | Production runtime |

### Frontend

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run dev` | Development server | Development |
| `npm run build:dev` | Build without obfuscation | Testing/Staging |
| `npm run build` | Build with obfuscation | Production Deployment |
| `npm run preview` | Preview production build | Testing production build |

## License Management

### Generate a License

```bash
cd backend

# Basic license (1 year, no restrictions)
npx tsx scripts/generateLicense.ts \
  --clientId=CLIENT123 \
  --clientName="Company Name"

# Advanced license (6 months, 25 users, specific features)
npx tsx scripts/generateLicense.ts \
  --clientId=CLIENT456 \
  --clientName="Another Company" \
  --days=180 \
  --maxUsers=25 \
  --features=factory,inventory,accounting
```

### Install a License

**Via Admin Panel:**
1. Login as admin
2. Go to Settings → License
3. Paste license key
4. Click Install

**Via API:**
```bash
curl -X POST http://localhost:5000/api/license/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"licenseKey": "YOUR_LICENSE_KEY"}'
```

## Deployment Process

### 1. Pre-Deployment Setup

```bash
# Update environment variables
cd backend
cp env.example .env

# IMPORTANT: Set a strong LICENSE_ENCRYPTION_KEY
# Example: openssl rand -hex 32
nano .env
```

Update these variables:
```env
LICENSE_ENCRYPTION_KEY=your-strong-random-key-here
NODE_ENV=production
```

### 2. Generate Client License

```bash
cd backend
npx tsx scripts/generateLicense.ts \
  --clientId=PROD_CLIENT \
  --clientName="Production Client" \
  --days=365
```

Save the generated license key for the client.

### 3. Build Production Code

```bash
# Build backend (with obfuscation)
cd backend
npm install
npm run build:prod

# Build frontend (with obfuscation)
cd ../frontend
npm install
npm run build
```

### 4. Deploy

```bash
# Example deployment to server
rsync -avz backend/dist/ server:/app/backend/
rsync -avz frontend/dist/ server:/app/frontend/
rsync -avz backend/node_modules/ server:/app/backend/node_modules/
rsync -avz backend/package.json server:/app/backend/
rsync -avz backend/.env server:/app/backend/
```

### 5. Install License on Server

```bash
# SSH to server
ssh server

# Install license (one of these methods):
# Method 1: Copy license file
scp generated_license.lic server:/app/backend/license.lic

# Method 2: Use API after server is running
# (client installs via admin panel)
```

### 6. Start Production Server

```bash
# On server
cd /app/backend
npm start

# Or use PM2 for process management
pm2 start dist/index.js --name erp-backend
pm2 save
pm2 startup
```

## Production Checklist

- [ ] Updated `LICENSE_ENCRYPTION_KEY` to a strong random value
- [ ] Generated production license for client
- [ ] Built backend with `npm run build:prod`
- [ ] Built frontend with `npm run build`
- [ ] Verified obfuscated code works in staging
- [ ] Deployed to production server
- [ ] Installed license on production server
- [ ] Tested license validation
- [ ] Configured reverse proxy (nginx/apache) for frontend
- [ ] Set up SSL/TLS certificates
- [ ] Configured firewall rules
- [ ] Set up monitoring and logging
- [ ] Documented license expiry date
- [ ] Set reminder for license renewal

## Protecting Your Investment

### Code Obfuscation Details

**Backend (JavaScript):**
- Control flow flattening
- Dead code injection
- String array encoding
- Identifier renaming
- Self-defending code

**Frontend (Vite):**
- Integrated obfuscation plugin
- Production-only activation
- Minification + terser
- Source maps disabled

### License System Features

**Security:**
- Hardware binding (machine ID)
- Time-based expiration
- Encrypted storage
- HMAC signature verification
- Periodic validation with caching

**Control:**
- User limits
- Feature flags
- Client tracking
- Expiry warnings

### Additional Protection Recommendations

1. **Legal Agreement**: Always use a comprehensive EULA
2. **Regular Updates**: Keep valuable through ongoing improvements
3. **Support Contract**: Make support essential to operation
4. **Watermarking**: Add unique build identifiers per client
5. **Monitoring**: Track unauthorized usage
6. **Server Validation**: Consider phone-home validation

## File Structure After Build

```
project/
├── backend/
│   ├── dist/                    # Obfuscated JavaScript (DO NOT COMMIT)
│   ├── src/                     # TypeScript source (keep private)
│   ├── scripts/
│   │   ├── generateLicense.ts   # License generator
│   │   └── obfuscate.ts         # Obfuscation script
│   └── license.lic              # Installed license (DO NOT COMMIT)
│
├── frontend/
│   ├── dist/                    # Obfuscated build (DO NOT COMMIT)
│   └── src/                     # React source (keep private)
│
└── documents/
    ├── LICENSE_SYSTEM_GUIDE.md  # Detailed license documentation
    └── BUILD_DEPLOYMENT_GUIDE.md # This file
```

## What to Send to Client

### For Installation:
1. ✅ `backend/dist/` folder (obfuscated)
2. ✅ `frontend/dist/` folder (obfuscated)
3. ✅ `backend/node_modules/` (or package.json to install)
4. ✅ `backend/package.json`
5. ✅ License key (via secure channel)
6. ✅ Installation instructions
7. ✅ Admin credentials

### Keep Private:
1. ❌ Source code (`backend/src/`, `frontend/src/`)
2. ❌ `.env` files with secrets
3. ❌ `LICENSE_ENCRYPTION_KEY`
4. ❌ License generation scripts
5. ❌ Git history
6. ❌ Development files

## Troubleshooting

### Build Errors

**"Cannot find module"**
```bash
npm install
npm run build
```

**Obfuscation fails**
```bash
# Build without obfuscation first
npm run build

# Then obfuscate separately
npm run obfuscate
```

**Type errors**
```bash
# Check tsconfig.json
# Fix type errors in source
npm run build
```

### License Issues

**"License file not found"**
- Ensure `license.lic` is in backend root or path specified in `.env`
- Check `LICENSE_FILE_PATH` environment variable

**"License expired"**
- Generate new license with extended date
- Install via admin panel or API

**"License not valid for this machine"**
- Get machine ID: `GET /api/license/machine-id`
- Generate new license with correct machine ID
- Or use `--machineId=ANY` for portable license

### Performance Issues

**Backend slow after obfuscation**
- Reduce obfuscation in `scripts/obfuscate.ts`
- Lower `controlFlowFlatteningThreshold`
- Disable `selfDefending` for better performance

**Frontend slow after obfuscation**
- Adjust settings in `vite.config.ts`
- Reduce obfuscation strength
- Profile and optimize

## Support & Maintenance

### License Renewal

1. Generate new license 30 days before expiry
2. Notify client via email
3. Client installs via admin panel
4. Verify installation

### Updates & Patches

```bash
# Build new version
npm run build:prod

# Deploy update
rsync -avz dist/ server:/app/backend/

# Restart server
ssh server "pm2 restart erp-backend"
```

### Monitoring License Usage

Check logs for:
- License validation failures
- Expiry warnings
- Feature access attempts
- Machine ID mismatches

## Additional Resources

- [LICENSE_SYSTEM_GUIDE.md](./documents/LICENSE_SYSTEM_GUIDE.md) - Comprehensive license documentation
- [RBAC_IMPLEMENTATION_GUIDE.md](./documents/RBAC_IMPLEMENTATION_GUIDE.md) - Role-based access control
- [AUDIT_SYSTEM_FIX_SUMMARY.md](./documents/AUDIT_SYSTEM_FIX_SUMMARY.md) - Audit system documentation

## Questions?

For technical issues or questions about the license system, code obfuscation, or deployment process, consult the development team or refer to the detailed documentation in the `documents/` folder.

