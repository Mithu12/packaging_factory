# Quick Reference - License System & Code Protection

## 🚀 Quick Start Commands

### Generate License Key
```bash
cd backend
npx tsx scripts/generateLicense.ts --clientId=ABC123 --clientName="Company Name"
```

### Build for Production
```bash
# Backend (with obfuscation)
cd backend && npm run build:prod

# Frontend (with obfuscation)
cd frontend && npm run build
```

### Install License (API)
```bash
curl -X POST http://localhost:5000/api/license/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"licenseKey": "YOUR_KEY"}'
```

## 📝 License Generation Examples

### Basic 1-Year License
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=CLIENT123 \
  --clientName="Acme Corp"
```

### 6-Month License with User Limit
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=CLIENT456 \
  --clientName="Tech Inc" \
  --days=180 \
  --maxUsers=25
```

### Feature-Restricted License
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=CLIENT789 \
  --clientName="Retail Store" \
  --features=inventory,sales
```

### Machine-Locked License
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=CLIENT999 \
  --clientName="Factory" \
  --machineId=a1b2c3d4e5f6
```

## 🔧 Build Commands

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Standard build |
| `npm run build:prod` | Build + Obfuscate |
| `npm run obfuscate` | Obfuscate only |
| `npm run generate:license` | Generate license |
| `npm start` | Run production |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build:dev` | Build (no obfuscation) |
| `npm run build` | Build + Obfuscate |
| `npm run preview` | Preview build |

## 🔐 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/license/info` | GET | Admin | Get license info |
| `/api/license/install` | POST | Admin | Install license |
| `/api/license/machine-id` | GET | Admin | Get machine ID |

## 📦 What to Send to Client

### ✅ Include
- `backend/dist/` (obfuscated)
- `frontend/dist/` (obfuscated)
- `backend/package.json`
- License key (secure channel)
- Installation guide

### ❌ Keep Private
- Source code (`src/` folders)
- `.env` files
- `LICENSE_ENCRYPTION_KEY`
- License generator scripts
- Git history

## ⚙️ Environment Setup

```env
# backend/.env
LICENSE_FILE_PATH=./license.lic
LICENSE_ENCRYPTION_KEY=YOUR_STRONG_RANDOM_KEY_HERE
```

Generate strong key:
```bash
openssl rand -hex 32
```

## 🛠️ Troubleshooting

### Build fails
```bash
rm -rf dist node_modules
npm install
npm run build:prod
```

### License won't install
- Check `LICENSE_ENCRYPTION_KEY` matches
- Verify file permissions
- Ensure license key is complete

### Get Machine ID
```bash
curl http://localhost:5000/api/license/machine-id \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 📚 Documentation

- **Complete Guide**: `documents/LICENSE_SYSTEM_GUIDE.md`
- **Deployment**: `BUILD_DEPLOYMENT_GUIDE.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

## ⚡ Common Workflows

### Deploy New Client
1. Generate license key
2. Build production code: `npm run build:prod`
3. Deploy dist folders
4. Send license key securely
5. Client installs via admin panel

### Renew License
1. Generate new key with same clientId
2. Send to client
3. Client installs via admin panel
4. No restart needed

### Update Software
1. Build new version: `npm run build:prod`
2. Deploy to client
3. Existing license continues to work

## 🔍 Quick Checks

### Verify Build
```bash
# Backend
cd backend && npm run build
ls -lh dist/

# Frontend
cd frontend && npm run build
ls -lh dist/
```

### Test License
```bash
# Get info
curl http://localhost:5000/api/license/info \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Check Obfuscation
```bash
# Check if code is obfuscated
head -20 backend/dist/index.js
head -20 frontend/dist/assets/*.js
```

## 📞 Need Help?

- Check detailed docs in `documents/`
- Review code comments
- Test in staging first
- Keep LICENSE_ENCRYPTION_KEY secure

---

**Quick Tip**: Always test in staging before deploying to production!

