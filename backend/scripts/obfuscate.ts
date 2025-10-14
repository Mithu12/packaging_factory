#!/usr/bin/env node

/**
 * Backend Code Obfuscation Script
 * 
 * This script obfuscates the compiled JavaScript files in the dist directory
 * to protect the source code from reverse engineering.
 */

import * as fs from 'fs';
import * as path from 'path';
import JavaScriptObfuscator from 'javascript-obfuscator';

interface ObfuscationStats {
  processed: number;
  skipped: number;
  errors: number;
}

const stats: ObfuscationStats = {
  processed: 0,
  skipped: 0,
  errors: 0,
};

// Files to skip (critical system files that might break if obfuscated too aggressively)
const SKIP_FILES = [
  'node_modules',
  '.d.ts',
  '.map',
];

// Obfuscation options - balanced between protection and performance
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

function shouldSkipFile(filePath: string): boolean {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function obfuscateFile(filePath: string): void {
  try {
    if (shouldSkipFile(filePath)) {
      stats.skipped++;
      return;
    }

    const code = fs.readFileSync(filePath, 'utf8');
    
    // Skip very small files (likely just exports or configs)
    if (code.length < 100) {
      stats.skipped++;
      return;
    }

    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS).getObfuscatedCode();
    
    fs.writeFileSync(filePath, obfuscatedCode, 'utf8');
    stats.processed++;
    console.log(`✓ Obfuscated: ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    stats.errors++;
    console.error(`✗ Error obfuscating ${filePath}:`, error);
  }
}

function obfuscateDirectory(dirPath: string): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!shouldSkipFile(fullPath)) {
        obfuscateDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      obfuscateFile(fullPath);
    }
  }
}

function main() {
  const distPath = path.join(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    console.error('Error: dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  console.log('\n=== Backend Code Obfuscation ===\n');
  console.log('Starting obfuscation process...\n');

  const startTime = Date.now();
  obfuscateDirectory(distPath);
  const endTime = Date.now();

  console.log('\n=== Obfuscation Complete ===\n');
  console.log(`Files processed:  ${stats.processed}`);
  console.log(`Files skipped:    ${stats.skipped}`);
  console.log(`Errors:           ${stats.errors}`);
  console.log(`Time taken:       ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log('');

  if (stats.errors > 0) {
    console.warn('⚠ Some files had errors during obfuscation. Check the logs above.');
    process.exit(1);
  }

  console.log('✓ All files obfuscated successfully!');
}

// Run the script
if (require.main === module) {
  main();
}

export { obfuscateDirectory, obfuscateFile };

