import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

async function fixPaymentApprovalStatus(): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log('Checking and fixing payment approval status...');
    
    // Check for payments with NULL approval_status
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM payments 
      WHERE approval_status IS NULL
    `;
    
    const checkResult = await client.query(checkQuery);
    const nullCount = parseInt(checkResult.rows[0].count);
    
    console.log(`Found ${nullCount} payments with NULL approval_status`);
    
    if (nullCount > 0) {
      // Update payments with NULL approval_status to 'draft'
      const updateQuery = `
        UPDATE payments 
        SET approval_status = 'draft' 
        WHERE approval_status IS NULL
      `;
      
      const updateResult = await client.query(updateQuery);
      console.log(`Updated ${updateResult.rowCount} payments to have 'draft' approval_status`);
    }
    
    // Show current status distribution
    const statusQuery = `
      SELECT approval_status, COUNT(*) as count 
      FROM payments 
      GROUP BY approval_status 
      ORDER BY approval_status
    `;
    
    const statusResult = await client.query(statusQuery);
    console.log('Current payment approval status distribution:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.approval_status || 'NULL'}: ${row.count}`);
    });
    
    console.log('Payment approval status fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing payment approval status:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  fixPaymentApprovalStatus()
    .then(() => {
      console.log('Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}

export { fixPaymentApprovalStatus };
