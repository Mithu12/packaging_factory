import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export async function addExpenseTables() {
    const client = await pool.connect();
    
    try {
        MyLogger.info('Add Expense Tables');
        
        // Create expense_categories table
        MyLogger.info('Create Expense Categories Table');
        await client.query(`
            CREATE TABLE IF NOT EXISTS expense_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(7) DEFAULT '#3B82F6',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        MyLogger.success('Create Expense Categories Table');

        // Create indexes for expense_categories
        MyLogger.info('Create Expense Categories Indexes');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON expense_categories(is_active);
        `);
        MyLogger.success('Create Expense Categories Indexes');

        // Create trigger for expense_categories updated_at
        MyLogger.info('Create Expense Categories Update Timestamp Trigger');
        await client.query(`
            DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
            CREATE TRIGGER update_expense_categories_updated_at
                BEFORE UPDATE ON expense_categories
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        MyLogger.success('Create Expense Categories Update Timestamp Trigger');

        // Create expenses table
        MyLogger.info('Create Expenses Table');
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                expense_number VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
                amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
                currency VARCHAR(3) DEFAULT 'USD',
                expense_date DATE NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'cash',
                vendor_name VARCHAR(255),
                vendor_contact VARCHAR(255),
                receipt_number VARCHAR(100),
                receipt_url VARCHAR(500),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
                approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMP,
                paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                paid_at TIMESTAMP,
                department VARCHAR(100),
                project VARCHAR(100),
                tags TEXT[],
                notes TEXT,
                created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        MyLogger.success('Create Expenses Table');

        // Create indexes for expenses
        MyLogger.info('Create Expenses Indexes');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_expense_number ON expenses(expense_number);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_vendor_name ON expenses(vendor_name);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_department ON expenses(department);
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project);
        `);
        MyLogger.success('Create Expenses Indexes');

        // Create trigger for expenses updated_at
        MyLogger.info('Create Expenses Update Timestamp Trigger');
        await client.query(`
            DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
            CREATE TRIGGER update_expenses_updated_at
                BEFORE UPDATE ON expenses
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        MyLogger.success('Create Expenses Update Timestamp Trigger');

        // Create expense number sequence
        MyLogger.info('Create Expense Number Sequence');
        await client.query(`
            CREATE SEQUENCE IF NOT EXISTS expense_number_seq START 1;
        `);
        MyLogger.success('Create Expense Number Sequence');

        // Insert default expense categories
        MyLogger.info('Insert Default Expense Categories');
        await client.query(`
            INSERT INTO expense_categories (name, description, color) VALUES
            ('Office Supplies', 'Office equipment, stationery, and supplies', '#3B82F6'),
            ('Travel & Transportation', 'Business travel, fuel, and transportation costs', '#10B981'),
            ('Meals & Entertainment', 'Business meals, client entertainment', '#F59E0B'),
            ('Utilities', 'Electricity, water, internet, phone bills', '#EF4444'),
            ('Marketing & Advertising', 'Marketing campaigns, advertising costs', '#8B5CF6'),
            ('Professional Services', 'Legal, accounting, consulting fees', '#06B6D4'),
            ('Equipment & Maintenance', 'Equipment purchase and maintenance', '#84CC16'),
            ('Software & Subscriptions', 'Software licenses, subscriptions', '#F97316'),
            ('Training & Development', 'Employee training, courses, certifications', '#EC4899'),
            ('Other', 'Miscellaneous expenses', '#6B7280')
            ON CONFLICT (name) DO NOTHING;
        `);
        MyLogger.success('Insert Default Expense Categories');

        MyLogger.success('Add Expense Tables');
        
    } catch (error) {
        MyLogger.error('Add Expense Tables', error);
        throw error;
    } finally {
        client.release();
    }
}
