import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { MyLogger } from '@/utils/new-logger';

dotenv.config();

export class FlywayManager {
  private readonly flywayPath: string;
  private readonly configPath: string;
  private readonly projectRoot: string;

  constructor() {
    this.projectRoot = path.join(__dirname, '../../');
    this.flywayPath = path.join(this.projectRoot, 'node_modules/.bin/flyway');
    this.configPath = path.join(this.projectRoot, 'flyway.conf');
  }

  /**
   * Run a Flyway command
   */
  private async runFlywayCommand(command: string, extraArgs: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      const configPath = path.join(this.projectRoot, 'flyway.config.js');
      
      const args = [
        'flyway',
        '-c',
        configPath,
        command,
        ...extraArgs
      ];

      // Set environment variables for placeholders
      const env = {
        ...process.env,
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || '5432',
        DB_NAME: process.env.DB_NAME || 'erp_system',
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'password'
      };

      MyLogger.info(`Running Flyway command: npx ${args.join(' ')}`);

      const flyway = spawn('npx', args, { 
        env,
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      flyway.on('close', (code) => {
        if (code === 0) {
          MyLogger.success(`Flyway ${command} completed successfully`);
          resolve();
        } else {
            let newError = new Error(`Flyway ${command} failed with exit code ${code}`)
          MyLogger.error(`Flyway ${command} failed with exit code ${code}`, newError);
          reject(newError);
        }
      });

      flyway.on('error', (error) => {
        MyLogger.error(`Error running Flyway ${command}:`, error);
        reject(error);
      });
    });
  }

  /**
   * Get migration information
   */
  async info(): Promise<void> {
    await this.runFlywayCommand('info');
  }

  /**
   * Run database migrations
   */
  async migrate(): Promise<void> {
    await this.runFlywayCommand('migrate');
  }

  /**
   * Validate applied migrations
   */
  async validate(): Promise<void> {
    await this.runFlywayCommand('validate');
  }

  /**
   * Clean the database (removes all objects)
   * WARNING: This will delete all data!
   */
  async clean(): Promise<void> {
    MyLogger.warn('⚠️  WARNING: This will delete all database objects and data!');
    await this.runFlywayCommand('clean');
  }

  /**
   * Baseline an existing database
   */
  async baseline(version?: string): Promise<void> {
    const args = version ? ['-baselineVersion=' + version] : [];
    await this.runFlywayCommand('baseline', args);
  }

  /**
   * Repair the Flyway schema history table
   */
  async repair(): Promise<void> {
    await this.runFlywayCommand('repair');
  }

  /**
   * Check if migrations directory exists and create if not
   */
  async ensureMigrationsDirectory(): Promise<void> {
    const migrationsDir = path.join(this.projectRoot, 'migrations');
    try {
      await fs.access(migrationsDir);
    } catch {
      await fs.mkdir(migrationsDir, { recursive: true });
      MyLogger.info(`Created migrations directory: ${migrationsDir}`);
    }
  }

  /**
   * Get the next migration version number
   */
  async getNextVersion(): Promise<string> {
    const migrationsDir = path.join(this.projectRoot, 'migrations');
    await this.ensureMigrationsDirectory();
    
    const files = await fs.readdir(migrationsDir);
    const versionFiles = files.filter(f => f.match(/^V\d+__.*\.sql$/));
    
    if (versionFiles.length === 0) {
      return '1.0.0';
    }
    
    const versions = versionFiles
      .map(f => f.match(/^V(\d+(?:\.\d+)*)__/)?.[1])
      .filter(Boolean)
      .map(v => v!.split('.').map(n => parseInt(n, 10)));
    
    versions.sort((a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const aVal = a[i] || 0;
        const bVal = b[i] || 0;
        if (aVal !== bVal) return bVal - aVal; // Descending order
      }
      return 0;
    });
    
    const latestVersion = versions[0];
    if (!latestVersion) {
      return '1.0.0';
    }
    
    // Increment the patch version
    const newVersion = [...latestVersion];
    newVersion[newVersion.length - 1]++;
    
    return newVersion.join('.');
  }

  /**
   * Create a new migration file
   */
  async createMigration(description: string, content: string): Promise<string> {
    const version = await this.getNextVersion();
    const filename = `V${version}__${description.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filepath = path.join(this.projectRoot, 'migrations', filename);
    
    await fs.writeFile(filepath, content);
    MyLogger.success(`Created migration file: ${filename}`);
    
    return filepath;
  }
}

// CLI interface for Flyway operations
export async function runFlywayCommand(command: string, ...args: string[]): Promise<void> {
  const flyway = new FlywayManager();
  
  try {
    switch (command) {
      case 'info':
        await flyway.info();
        break;
      case 'migrate':
        await flyway.migrate();
        break;
      case 'validate':
        await flyway.validate();
        break;
      case 'clean':
        await flyway.clean();
        break;
      case 'baseline':
        await flyway.baseline(args[0]);
        break;
      case 'repair':
        await flyway.repair();
        break;
      default:
        throw new Error(`Unknown Flyway command: ${command}`);
    }
  } catch (error) {
    MyLogger.error(`Flyway operation failed:`, error);
    process.exit(1);
  }
}

// Run command if this file is executed directly
if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.log('Usage: tsx flyway-manager.ts <command> [args...]');
    console.log('Commands: info, migrate, validate, clean, baseline, repair');
    process.exit(1);
  }
  
  runFlywayCommand(command, ...args);
}
