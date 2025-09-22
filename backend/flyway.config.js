require('dotenv').config();

const config = {
  // Database connection
  url: `jdbc:postgresql://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'erp_system'}`,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  
  // Migration settings
  locations: ['migrations'],
  table: 'flyway_schema_history',
  createSchemas: true,
  defaultSchema: 'public',
  
  // Validation settings
  validateOnMigrate: true,
  mixed: false,
  group: false,
  
  // File naming
  sqlMigrationPrefix: 'V',
  sqlMigrationSeparator: '__',
  sqlMigrationSuffixes: ['.sql'],
  
  // Placeholder settings
  placeholderReplacement: true,
  placeholderPrefix: '${',
  placeholderSuffix: '}',
  
  // Error handling
  ignoreMissingMigrations: false,
  ignoreIgnoredMigrations: false,
  ignorePendingMigrations: false,
  ignoreFutureMigrations: true,
  
  // Baseline settings
  baselineVersion: '1.0.0',
  baselineDescription: '<< Flyway Baseline >>',
  baselineOnMigrate: true,
  
  // Encoding
  encoding: 'UTF-8'
};

module.exports = config;
