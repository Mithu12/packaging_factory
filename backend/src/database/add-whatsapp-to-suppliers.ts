import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export async function addWhatsAppToSuppliers() {
  const client = await pool.connect();
  
  try {
    MyLogger.info('Adding WhatsApp field to suppliers table');

      // Add the whatsapp_number column
      await client.query(`
        ALTER TABLE suppliers 
        ADD COLUMN if not exists whatsapp_number VARCHAR(50)
      `);
      
      MyLogger.success('Added whatsapp_number column to suppliers table');
    
  } catch (error) {
    MyLogger.error('Error adding WhatsApp field to suppliers', error);
    throw error;
  } finally {
    client.release();
  }
}
