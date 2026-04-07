import pool from "../database/connection";
import { MyLogger } from "./new-logger";

export class MasterDataSeeder {
  static async seed() {
    const action = "Master Data Seeder";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Seed Categories
      const categoriesToSeed = [
        { name: 'Ready Goods', description: 'Finished products ready for sale' },
        { name: 'Raw Materials', description: 'Materials used for production' }
      ];

      for (const cat of categoriesToSeed) {
        const { rowCount } = await client.query(
          'SELECT 1 FROM categories WHERE name = $1',
          [cat.name]
        );
        if (rowCount === 0) {
          await client.query(
            'INSERT INTO categories (name, description) VALUES ($1, $2)',
            [cat.name, cat.description]
          );
          MyLogger.info(action, { message: `Seeded category: ${cat.name}` });
        }
      }

      // 2. Seed Default Supplier
      const defaultSupplier = {
        name: 'Self',
        supplier_code: 'SUP-SELF',
        category: 'Internal',
        status: 'active'
      };

      const supplierCheck = await client.query(
        'SELECT 1 FROM suppliers WHERE supplier_code = $1',
        [defaultSupplier.supplier_code]
      );

      if (supplierCheck.rowCount === 0) {
        await client.query(
          `INSERT INTO suppliers 
            (supplier_code, name, category, status) 
           VALUES ($1, $2, $3, $4)`,
          [
            defaultSupplier.supplier_code, 
            defaultSupplier.name, 
            defaultSupplier.category, 
            defaultSupplier.status
          ]
        );
        MyLogger.info(action, { message: 'Seeded default supplier: Self' });
      }

      // 3. Seed Default Cost Center
      const defaultCostCenter = {
        name: 'Default Cost Center',
        code: 'CC-DF001',
        type: 'Location',
        status: 'Active'
      };

      let costCenterId;
      const ccCheck = await client.query(
        'SELECT id FROM cost_centers WHERE code = $1',
        [defaultCostCenter.code]
      );

      if (ccCheck.rowCount === 0) {
        const ccInsert = await client.query(
          `INSERT INTO cost_centers (name, code, type, status) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [defaultCostCenter.name, defaultCostCenter.code, defaultCostCenter.type, defaultCostCenter.status]
        );
        costCenterId = ccInsert.rows[0].id;
        MyLogger.info(action, { message: 'Seeded default cost center: CC-DF001' });
      } else {
        costCenterId = ccCheck.rows[0].id;
      }

      // 4. Seed Default Factory & Link Cost Center
      const defaultFactory = {
        code: 'DF001',
        name: 'Default Factory',
        description: 'System default factory',
        address: { street: "123 Default Ave", city: "Default City", country: "Bangladesh" } // Country matches the new standard
      };

      const factoryCheck = await client.query(
        'SELECT id, cost_center_id FROM factories WHERE code = $1',
        [defaultFactory.code]
      );

      let factoryId;
      if (factoryCheck.rowCount === 0) {
        const fInsert = await client.query(
          `INSERT INTO factories 
            (name, code, description, address, cost_center_id, is_active) 
           VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
          [
            defaultFactory.name,
            defaultFactory.code,
            defaultFactory.description,
            defaultFactory.address,
            costCenterId
          ]
        );
        factoryId = fInsert.rows[0].id;
        MyLogger.info(action, { message: 'Seeded default factory: DF001' });
      } else {
        factoryId = factoryCheck.rows[0].id;
        if (factoryCheck.rows[0].cost_center_id !== costCenterId) {
          await client.query(
            'UPDATE factories SET cost_center_id = $1 WHERE code = $2',
            [costCenterId, defaultFactory.code]
          );
          MyLogger.info(action, { message: 'Tagged default factory with cost center' });
        }
      }

      // 5. Seed Default Production Line
      const defaultProdLine = {
        name: 'Default Production Line',
        code: 'PL-DF001',
        description: 'System default production line',
        capacity: 10,
        location: 'Main Floor',
        status: 'available'
      };

      const plCheck = await client.query(
        'SELECT 1 FROM production_lines WHERE code = $1',
        [defaultProdLine.code]
      );

      if (plCheck.rowCount === 0) {
        await client.query(
          `INSERT INTO production_lines 
            (factory_id, name, code, description, capacity, location, status, cost_center_id, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [
            factoryId,
            defaultProdLine.name,
            defaultProdLine.code,
            defaultProdLine.description,
            defaultProdLine.capacity,
            defaultProdLine.location,
            defaultProdLine.status,
            costCenterId
          ]
        );
        MyLogger.info(action, { message: 'Seeded default production line: PL-DF001' });
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { message: "Error seeding master data" });
      throw error;
    } finally {
      client.release();
    }
  }
}
