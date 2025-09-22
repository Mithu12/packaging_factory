import { promises as fs } from 'fs';
import path from 'path';
import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export class MigrationValidator {
  private readonly migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, '../../migrations');
  }

  /**
   * Validate all migration files exist and are readable
   */
  async validateMigrationFiles(): Promise<void> {
    MyLogger.info('Validating migration files...');
    
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrationFiles = files.filter(f => f.match(/^V\d+(?:\.\d+)*__.*\.sql$/));
      
      if (migrationFiles.length === 0) {
        throw new Error('No migration files found');
      }
      
      MyLogger.info(`Found ${migrationFiles.length} migration files`);
      
      // Sort migration files by version
      const sortedFiles = migrationFiles.sort((a, b) => {
        const versionA = a.match(/^V(\d+(?:\.\d+)*)__/)?.[1];
        const versionB = b.match(/^V(\d+(?:\.\d+)*)__/)?.[1];
        
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
      
      // Validate each file
      for (const file of sortedFiles) {
        const filePath = path.join(this.migrationsDir, file);
        const stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
          throw new Error(`Migration file ${file} is not a regular file`);
        }
        
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.trim().length === 0) {
          throw new Error(`Migration file ${file} is empty`);
        }
        
        MyLogger.info(`✓ ${file} - Valid (${content.length} chars)`);
      }
      
      MyLogger.success(`All ${migrationFiles.length} migration files are valid`);
      
    } catch (error) {
      MyLogger.error('Migration file validation failed:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async validateDatabaseConnection(): Promise<void> {
    MyLogger.info('Testing database connection...');
    
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      MyLogger.success(`Database connected successfully: ${result.rows[0].version}`);
    } catch (error) {
      MyLogger.error('Database connection failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if Flyway schema history table exists
   */
  async checkSchemaHistory(): Promise<boolean> {
    MyLogger.info('Checking for Flyway schema history table...');
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'flyway_schema_history'
        )
      `);
      
      const exists = result.rows[0].exists;
      if (exists) {
        MyLogger.info('Flyway schema history table exists');
        
        // Show current migration status
        const migrations = await client.query(`
          SELECT version, description, installed_on, success 
          FROM flyway_schema_history 
          ORDER BY installed_rank
        `);
        
        if (migrations.rows.length > 0) {
          MyLogger.info(`Found ${migrations.rows.length} applied migrations:`);
          migrations.rows.forEach(row => {
            MyLogger.info(`  V${row.version} - ${row.description} (${row.success ? 'SUCCESS' : 'FAILED'})`);
          });
        } else {
          MyLogger.info('No migrations have been applied yet');
        }
      } else {
        MyLogger.info('Flyway schema history table does not exist');
      }
      
      return exists;
    } catch (error) {
      MyLogger.error('Error checking schema history:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run complete validation
   */
  async runValidation(): Promise<void> {
    MyLogger.info('Starting migration system validation...');
    
    try {
      await this.validateDatabaseConnection();
      await this.validateMigrationFiles();
      await this.checkSchemaHistory();
      
      MyLogger.success('✅ Migration system validation completed successfully');
      
    } catch (error) {
      MyLogger.error('❌ Migration system validation failed:', error);
      throw error;
    }
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.runValidation()
    .then(() => {
      console.log('🎉 Validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Validation failed:', error.message);
      process.exit(1);
    });
}
