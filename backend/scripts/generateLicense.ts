#!/usr/bin/env node

/**
 * License Key Generator Script
 * 
 * Usage:
 *   npx tsx scripts/generateLicense.ts --clientId=CLIENT_ID --clientName="Client Name" [options]
 * 
 * Options:
 *   --clientId       Client unique ID (required)
 *   --clientName     Client company name (required)
 *   --days          License validity in days (default: 365)
 *   --maxUsers      Maximum number of users (optional)
 *   --features      Comma-separated list of features (optional)
 *   --machineId     Bind to specific machine ID (default: ANY)
 * 
 * Examples:
 *   npx tsx scripts/generateLicense.ts --clientId=ABC123 --clientName="Acme Corp" --days=365
 *   npx tsx scripts/generateLicense.ts --clientId=XYZ789 --clientName="Tech Inc" --days=180 --maxUsers=50 --features=factory,inventory,accounting
 */

import { LicenseManager } from '../src/utils/licenseManager';
import * as fs from 'fs';
import * as path from 'path';

interface CommandLineArgs {
  clientId?: string;
  clientName?: string;
  days?: string;
  maxUsers?: string;
  features?: string;
  machineId?: string;
  output?: string;
}

function parseArgs(): CommandLineArgs {
  const args: CommandLineArgs = {};
  
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    args[key as keyof CommandLineArgs] = value;
  });
  
  return args;
}

function printUsage() {
  console.log(`
License Key Generator

Usage:
  npx tsx scripts/generateLicense.ts --clientId=CLIENT_ID --clientName="Client Name" [options]

Required Options:
  --clientId       Client unique ID
  --clientName     Client company name

Optional Options:
  --days          License validity in days (default: 365)
  --maxUsers      Maximum number of users
  --features      Comma-separated list of features (e.g., factory,inventory,accounting)
  --machineId     Bind to specific machine ID (default: ANY - works on any machine)
  --output        Output file path for license (default: ./generated_license.lic)

Examples:
  # Generate a 1-year license
  npx tsx scripts/generateLicense.ts --clientId=ABC123 --clientName="Acme Corp"

  # Generate 6-month license with user limit
  npx tsx scripts/generateLicense.ts --clientId=XYZ789 --clientName="Tech Inc" --days=180 --maxUsers=50

  # Generate license with specific features
  npx tsx scripts/generateLicense.ts --clientId=DEF456 --clientName="Manufacturing Co" --features=factory,inventory,accounting

  # Generate machine-locked license
  npx tsx scripts/generateLicense.ts --clientId=GHI789 --clientName="Retail Store" --machineId=abc123def456
  `);
}

async function main() {
  const args = parseArgs();

  // Validate required arguments
  if (!args.clientId || !args.clientName) {
    console.error('Error: --clientId and --clientName are required\n');
    printUsage();
    process.exit(1);
  }

  // Parse options
  const expiryDays = args.days ? parseInt(args.days, 10) : 365;
  const maxUsers = args.maxUsers ? parseInt(args.maxUsers, 10) : undefined;
  const features = args.features ? args.features.split(',').map(f => f.trim()) : undefined;
  const machineId = args.machineId || undefined;
  const outputPath = args.output || './generated_license.lic';

  // Validate days
  if (isNaN(expiryDays) || expiryDays <= 0) {
    console.error('Error: --days must be a positive number');
    process.exit(1);
  }

  console.log('\n=== License Key Generator ===\n');
  console.log('Generating license with the following parameters:');
  console.log(`  Client ID:     ${args.clientId}`);
  console.log(`  Client Name:   ${args.clientName}`);
  console.log(`  Valid for:     ${expiryDays} days`);
  console.log(`  Max Users:     ${maxUsers || 'Unlimited'}`);
  console.log(`  Features:      ${features ? features.join(', ') : 'All'}`);
  console.log(`  Machine ID:    ${machineId || 'ANY (portable)'}`);
  console.log('');

  try {
    // Generate license key
    const licenseManager = LicenseManager.getInstance();
    const licenseKey = licenseManager.generateLicenseKey(
      args.clientId,
      args.clientName,
      expiryDays,
      {
        maxUsers,
        features,
        machineId,
      }
    );

    // Save to file
    const result = licenseManager.installLicense(licenseKey);
    
    if (!result.success) {
      console.error('Error:', result.error);
      process.exit(1);
    }

    // Also save the raw key to a separate file for distribution
    const keyOutputPath = outputPath.replace('.lic', '_key.txt');
    fs.writeFileSync(keyOutputPath, licenseKey, 'utf8');

    console.log('✓ License generated successfully!\n');
    console.log('License Key (share this with client):');
    console.log('─'.repeat(80));
    console.log(licenseKey);
    console.log('─'.repeat(80));
    console.log('');
    console.log(`License key saved to: ${keyOutputPath}`);
    console.log(`Encrypted license file saved to: ${path.resolve(outputPath)}`);
    console.log('');
    console.log('INSTRUCTIONS FOR CLIENT:');
    console.log('1. Share the license key (from the text file) with the client');
    console.log('2. Client should install it via the admin panel or by placing the license file in the application directory');
    console.log('3. Restart the application after installing the license');
    console.log('');

    // Calculate expiry date
    const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    console.log(`License will expire on: ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`);
    
  } catch (error) {
    console.error('Error generating license:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

