# License System & Code Protection Guide

## Overview

This ERP system now includes a comprehensive license key system and code obfuscation to protect your intellectual property from unauthorized use and resale.

## Features

### 1. License Key System
- **Hardware Binding**: Licenses can be bound to specific machines
- **Time-Limited**: Set expiration dates for licenses
- **Feature Control**: Enable/disable specific features per license
- **User Limits**: Set maximum number of concurrent users
- **Auto-Validation**: Periodic license checks with caching

### 2. Code Obfuscation
- **Backend**: JavaScript obfuscation after TypeScript compilation
- **Frontend**: Vite plugin for production build obfuscation
- **Protection Level**: Balanced between security and performance

## License Key Generation

### Generate a License Key

```bash
cd backend
npx tsx scripts/generateLicense.ts --clientId=CLIENT123 --clientName="Company Name" [options]
```

### Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--clientId` | Unique client identifier (required) | - | `ABC123` |
| `--clientName` | Client company name (required) | - | `"Acme Corp"` |
| `--days` | License validity in days | 365 | `180` |
| `--maxUsers` | Maximum concurrent users | Unlimited | `50` |
| `--features` | Comma-separated feature list | All | `factory,inventory` |
| `--machineId` | Bind to specific machine ID | ANY | `abc123def` |
| `--output` | Output file path | `./generated_license.lic` | `./client_license.lic` |

### Examples

**1. Standard 1-year license:**
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=ABC123 \
  --clientName="Acme Manufacturing"
```

**2. 6-month license with user limit:**
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=XYZ789 \
  --clientName="Tech Solutions" \
  --days=180 \
  --maxUsers=25
```

**3. Feature-restricted license:**
```bash
npx tsx scripts/generateLicense.ts \
  --clientId=DEF456 \
  --clientName="Retail Store" \
  --features=inventory,sales
```

**4. Machine-locked license:**
```bash
# First, get the client's machine ID
# Client runs this in their admin panel or via API
# Then use that machine ID:
npx tsx scripts/generateLicense.ts \
  --clientId=GHI789 \
  --clientName="Production Facility" \
  --machineId=a1b2c3d4e5f6
```

## License Installation

### For Clients

#### Method 1: Admin Panel (Recommended)
1. Log in as an administrator
2. Navigate to Settings → License Management
3. Paste the license key provided by the vendor
4. Click "Install License"
5. Restart the application

#### Method 2: Manual Installation
1. Save the license key to a text file
2. Place it in the application directory as `license.lic`
3. Restart the application

#### Method 3: API Installation
```bash
curl -X POST http://your-server:5000/api/license/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"licenseKey": "YOUR_LICENSE_KEY_HERE"}'
```

## Building for Production

### Backend Build with Obfuscation

```bash
cd backend

# Standard build (no obfuscation)
npm run build

# Production build (with obfuscation)
npm run build:prod
```

**Build Process:**
1. Compiles TypeScript to JavaScript (`tsc`)
2. Resolves path aliases (`tsc-alias`)
3. Obfuscates all JavaScript files in `dist/`

**Output:** Obfuscated code in `backend/dist/`

### Frontend Build with Obfuscation

```bash
cd frontend

# Development build (no obfuscation)
npm run build:dev

# Production build (with obfuscation)
npm run build
```

**Build Process:**
1. Vite builds and bundles the React app
2. Automatic code obfuscation via plugin
3. Minification and optimization

**Output:** Obfuscated code in `frontend/dist/`

## Deployment Checklist

### Pre-Deployment

- [ ] Update `LICENSE_ENCRYPTION_KEY` in backend `.env` (use a strong random key)
- [ ] Generate production license key for client
- [ ] Test license installation in staging environment
- [ ] Build both backend and frontend with `build:prod` commands
- [ ] Verify obfuscated code works correctly

### Production Deployment

```bash
# Build backend
cd backend
npm run build:prod

# Build frontend
cd frontend
npm run build

# Deploy dist folders to production server
# Install license on production server
# Start production server
cd backend
npm start
```

### Post-Deployment

- [ ] Install license on production server
- [ ] Verify license validation is working
- [ ] Check application functionality
- [ ] Monitor license expiration dates
- [ ] Set up license renewal reminders

## API Endpoints

### Get License Info
```http
GET /api/license/info
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "license": {
    "clientName": "Acme Corp",
    "clientId": "ABC123",
    "issueDate": "2025-01-01T00:00:00.000Z",
    "expiryDate": "2026-01-01T00:00:00.000Z",
    "daysRemaining": 350,
    "maxUsers": 50,
    "features": ["factory", "inventory", "accounting"]
  }
}
```

### Install License
```http
POST /api/license/install
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "licenseKey": "BASE64_ENCODED_LICENSE_KEY"
}
```

### Get Machine ID
```http
GET /api/license/machine-id
Authorization: Bearer {admin_token}
```

## Middleware Usage

### Apply License Validation to Routes

```typescript
import { validateLicense, requireFeature } from './middleware/licenseValidation';

// Validate license for all routes
router.use(validateLicense);

// Require specific feature
router.use('/factory', requireFeature('factory'));

// Or per-route
router.post('/orders', validateLicense, requireFeature('orders'), createOrder);
```

### Check License in Code

```typescript
import LicenseManager from './utils/licenseManager';

// Check if license is valid
const result = await LicenseManager.validateLicense();
if (!result.valid) {
  // Handle invalid license
}

// Check for specific feature
const hasFeature = await LicenseManager.hasFeature('factory');

// Get days until expiry
const days = await LicenseManager.getDaysUntilExpiry();
```

## Frontend Integration

### Use License Service

```typescript
import { licenseService } from '@/services/licenseService';

// Get license info
const info = await licenseService.getLicenseInfo();

// Install license
const result = await licenseService.installLicense(licenseKey);

// Check feature availability
const hasFactory = await licenseService.hasFeature('factory');

// Get machine ID
const machineInfo = await licenseService.getMachineId();
```

### Conditional Rendering

```tsx
import { licenseService } from '@/services/licenseService';
import { useEffect, useState } from 'react';

function FeatureComponent() {
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    licenseService.hasFeature('premium').then(setHasAccess);
  }, []);

  if (!hasAccess) {
    return <div>This feature requires a license upgrade</div>;
  }

  return <div>Premium Feature Content</div>;
}
```

## Security Considerations

### Obfuscation Limitations
- **Not Encryption**: Obfuscation makes code harder to read, not impossible
- **Reversible**: Skilled developers can still reverse-engineer
- **Performance**: Heavy obfuscation can impact performance

### Best Practices
1. **Legal Protection**: Always use a strong software license agreement
2. **License Keys**: Change `LICENSE_ENCRYPTION_KEY` in production
3. **Regular Updates**: Keep dependencies and obfuscation tools updated
4. **Monitoring**: Track license usage and violations
5. **Support Model**: Make ongoing support valuable to deter resale

### Additional Protection Layers
1. **SaaS Hosting**: Consider hosting the application yourself
2. **Code Audits**: Periodically check for license violations
3. **Watermarking**: Add unique identifiers to each client build
4. **Server Validation**: Implement phone-home license validation

## Troubleshooting

### License Installation Fails
- Check if license key is complete and not corrupted
- Verify `LICENSE_ENCRYPTION_KEY` matches between generation and installation
- Ensure file permissions allow writing to license directory

### License Expired
- Generate a new license with extended validity
- Send to client for installation
- Consider implementing auto-renewal

### Machine ID Mismatch
- Generate a new license with correct machine ID
- Or generate with `--machineId=ANY` for portable licenses

### Build Failures
- Ensure all dependencies are installed
- Check for syntax errors before obfuscation
- Try standard build first, then add obfuscation

### Performance Issues After Obfuscation
- Reduce obfuscation strength in config files
- Exclude performance-critical files
- Profile and optimize specific bottlenecks

## Configuration Files

### Backend Obfuscation
`backend/scripts/obfuscate.ts` - Adjust obfuscation options

### Frontend Obfuscation
`frontend/vite.config.ts` - Modify obfuscator plugin options

### License Manager
`backend/src/utils/licenseManager.ts` - Core license logic

## Support & Maintenance

### License Renewal Process
1. Generate new license with extended date
2. Notify client 30 days before expiry
3. Provide new license key
4. Client installs via admin panel

### Updating Features
```typescript
// Add new features to license
const newLicense = licenseManager.generateLicenseKey(
  clientId,
  clientName,
  365,
  {
    features: ['factory', 'inventory', 'accounting', 'new-feature']
  }
);
```

## License System Architecture

```
Client Request
     ↓
License Middleware (validates on each request)
     ↓
License Manager (caches for 1 hour)
     ↓
License File (encrypted on disk)
     ↓
Machine ID Verification
     ↓
Feature/Expiry Checks
     ↓
Allow/Deny Request
```

## Environment Variables

```env
# Backend (.env)
LICENSE_FILE_PATH=./license.lic
LICENSE_ENCRYPTION_KEY=your-secret-key-min-32-chars
```

## Conclusion

This license system provides a solid foundation for protecting your ERP system from unauthorized use and resale. Combined with code obfuscation, it significantly raises the barrier for reverse engineering while maintaining performance.

**Remember:** The strongest protection is always a combination of:
- Strong legal agreements
- Technical measures (licensing + obfuscation)
- Ongoing customer relationships
- Regular updates and support

For questions or issues, refer to the codebase or consult with your development team.

