import { promises as fs } from 'fs';
import path from 'path';
import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export class SimpleMigrator {
  private readonly migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, '../../migrations');
  }

  /**
   * Initialize Flyway schema history table
   */
  async initializeSchemaHistory(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS flyway_schema_history (
          installed_rank INTEGER NOT NULL,
          version VARCHAR(50),
          description VARCHAR(200) NOT NULL,
          type VARCHAR(20) NOT NULL,
          script VARCHAR(1000) NOT NULL,
          checksum INTEGER,
          installed_by VARCHAR(100) NOT NULL,
          installed_on TIMESTAMP NOT NULL DEFAULT NOW(),
          execution_time INTEGER NOT NULL,
          success BOOLEAN NOT NULL
        );
      `);
      
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS flyway_schema_history_pk 
        ON flyway_schema_history (installed_rank);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS flyway_schema_history_s_idx 
        ON flyway_schema_history (success);
      `);
      
      MyLogger.success('Flyway schema history table initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Get applied migrations
   */
  async getAppliedMigrations(): Promise<Set<string>> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT version FROM flyway_schema_history 
        WHERE success = true AND version IS NOT NULL
      `);
      return new Set(result.rows.map(row => row.version));
    } finally {
      client.release();
    }
  }

  /**
   * Parse migration file name to extract version and description
   */
  parseMigrationFile(filename: string): { version: string; description: string } | null {
    // Support both V1.1.1__description.sql and V1_description.sql formats
    const match = filename.match(/^V(\d+(?:\.\d+)*|\d+)_+(.+)\.sql$/);
    if (!match) return null;
    
    return {
      version: match[1],
      description: match[2].replace(/_/g, ' ')
    };
  }

  /**
   * Calculate checksum for migration content
   */
  calculateChecksum(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Execute a single migration
   */
  async executeMigration(filename: string, version: string, description: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const checksum = this.calculateChecksum(content);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const startTime = Date.now();
      
      // Execute the migration SQL
      await client.query(content);
      
      const executionTime = Date.now() - startTime;
      
      // Get next rank
      const rankResult = await client.query('SELECT COALESCE(MAX(installed_rank), 0) + 1 AS next_rank FROM flyway_schema_history');
      const nextRank = rankResult.rows[0].next_rank;
      
      // Record the migration in history
      await client.query(`
        INSERT INTO flyway_schema_history (
          installed_rank, version, description, type, script, 
          checksum, installed_by, execution_time, success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        nextRank,
        version,
        description,
        'SQL',
        filename,
        checksum,
        'system',
        executionTime,
        true
      ]);
      
      await client.query('COMMIT');
      
      MyLogger.success(`Applied migration V${version} - ${description} (${executionTime}ms)`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Record failed migration
      try {
        const rankResult = await client.query('SELECT COALESCE(MAX(installed_rank), 0) + 1 AS next_rank FROM flyway_schema_history');
        const nextRank = rankResult.rows[0].next_rank;
        
        await client.query(`
          INSERT INTO flyway_schema_history (
            installed_rank, version, description, type, script, 
            checksum, installed_by, execution_time, success
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          nextRank,
          version,
          description,
          'SQL',
          filename,
          this.calculateChecksum(content),
          'system',
          0,
          false
        ]);
      } catch {
        // Ignore error recording failure
      }
      
      MyLogger.error(`Failed to apply migration V${version} - ${description}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    MyLogger.info('Starting database migration...');
    
    try {
      // Initialize schema history table
      await this.initializeSchemaHistory();

      // Get list of migration files
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files.filter(f => f.match(/^V(\d+(?:\.\d+)*|\d+)_+.*\.sql$/));
      
      if (migrationFiles.length === 0) {
        MyLogger.info('No migration files found');
        return;
      }
      
      // Sort migration files by version
      const sortedFiles = migrationFiles.sort((a, b) => {
        const versionA = this.parseMigrationFile(a)?.version;
        const versionB = this.parseMigrationFile(b)?.version;
        
        if (!versionA || !versionB) return 0;
        
        const partsA = versionA.split('.').map(n => parseInt(n, 10));
        const partsB = versionB.split('.').map(n => parseInt(n, 10));
        
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const a = partsA[i] || 0;
          const b = partsB[i] || 0;
          if (a !== b) return a - b;
        }
        return 0;
      });
      
      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      
      // Apply pending migrations
      let appliedCount = 0;
      for (const file of sortedFiles) {
        const migration = this.parseMigrationFile(file);
        if (!migration) {
          MyLogger.warn(`Skipping invalid migration file: ${file}`);
          continue;
        }
        
        if (appliedMigrations.has(migration.version)) {
          MyLogger.info(`Skipping already applied migration: V${migration.version}`);
          continue;
        }
        
        await this.executeMigration(file, migration.version, migration.description);
        appliedCount++;
      }
      
      if (appliedCount === 0) {
        MyLogger.info('Database is up to date - no migrations to apply');
      } else {
        MyLogger.success(`Successfully applied ${appliedCount} migration(s)`);
      }
      
    } catch (error) {
      MyLogger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Show migration info
   */
  async info(): Promise<void> {
    MyLogger.info('Migration information:');
    
    const client = await pool.connect();
    try {
      // Check if schema history exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'flyway_schema_history'
        )
      `);
      
      if (!tableExists.rows[0].exists) {
        MyLogger.info('No migration history found. Run migrate first.');
        return;
      }
      
      // Get migration history
      const result = await client.query(`
        SELECT version, description, installed_on, execution_time, success
        FROM flyway_schema_history 
        ORDER BY installed_rank
      `);
      
      if (result.rows.length === 0) {
        MyLogger.info('No migrations have been applied yet.');
        return;
      }
      
      MyLogger.info(`Found ${result.rows.length} migration(s):`);
      result.rows.forEach(row => {
        const status = row.success ? '✅ SUCCESS' : '❌ FAILED';
        const duration = row.execution_time ? `${row.execution_time}ms` : 'N/A';
        MyLogger.info(`  V${row.version} - ${row.description} (${status}, ${duration})`);
      });
      
    } finally {
      client.release();
    }
  }
}

// CLI interface
export async function runMigrationCommand(command: string): Promise<void> {
  const migrator = new SimpleMigrator();
  
  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;
      case 'info':
        await migrator.info();
        break;
      default:
        throw new Error(`Unknown migration command: ${command}`);
    }
  } catch (error) {
    MyLogger.error(`Migration operation failed:`, error);
    process.exit(1);
  }
}

// Run command if this file is executed directly
if (require.main === module) {
  const [command] = process.argv.slice(2);
  if (!command) {
    console.log('Usage: npx tsx simple-migrator.ts <command>');
    console.log('Commands: migrate, info');
    process.exit(1);
  }
  
  runMigrationCommand(command);
}
