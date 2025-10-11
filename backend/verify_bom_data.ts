import pool from './src/database/connection';

async function verifyBOMData() {
  try {
    console.log('=== BOM DATA VERIFICATION ===\n');

    // Check total BOMs
    const bomCount = await pool.query('SELECT COUNT(*) as count FROM bill_of_materials');
    console.log(`Total BOMs: ${bomCount.rows[0].count}`);

    // Check total BOM components
    const componentCount = await pool.query('SELECT COUNT(*) as count FROM bom_components');
    console.log(`Total BOM components: ${componentCount.rows[0].count}`);

    // Check new products added
    const newProducts = await pool.query(`
      SELECT COUNT(*) as count FROM products
      WHERE sku IN (
        'CHAIR-OFFICE-ERGONOMIC', 'TABLE-WORKBENCH', 'LED-LAMP-5W',
        'POWER-BANK-10000', 'GEARBOX-ASSEMBLY', 'CONVEYOR-BELT-2M',
        'SEALANT-SILICONE', 'WORK-APRON-LEATHER', 'CABINET-STEEL',
        'TOOL-SET-25PC', 'COTTON-FABRIC-WHITE', 'POLYESTER-FIBER',
        'EPOXY-ADHESIVE-5KG', 'LITHIUM-GREASE', 'ACRYLIC-PRIMER',
        'PLYWOOD-18MM-4X8', 'MDF-12MM-4X8', 'NATURAL-RUBBER',
        'SILICONE-RUBBER', 'LED-5MM-RED', 'PCB-FR4-100X160',
        'GEAR-SPUR-48T', 'SPRING-COMPRESSION', 'BUBBLE-WRAP-50M',
        'GLOVES-NITRILE-L'
      )
    `);
    console.log(`New products added: ${newProducts.rows[0].count}`);

    // Show BOMs with their costs
    const boms = await pool.query(`
      SELECT
        bom.id, p.name as product_name, p.sku, bom.version,
        bom.total_cost, COUNT(bc.id) as component_count
      FROM bill_of_materials bom
      JOIN products p ON bom.parent_product_id = p.id
      LEFT JOIN bom_components bc ON bom.id = bc.bom_id
      GROUP BY bom.id, p.name, p.sku, bom.version, bom.total_cost
      ORDER BY bom.id DESC
      LIMIT 20
    `);

    console.log('\n=== RECENT BOMs ===');
    boms.rows.forEach(bom => {
      console.log(`${bom.product_name} (${bom.sku}) v${bom.version}`);
      console.log(`  Cost: $${bom.total_cost}, Components: ${bom.component_count}`);
      console.log('');
    });

    // Show BOM components for the first few BOMs
    const components = await pool.query(`
      SELECT
        bc.id, p.name as component_name, p.sku as component_sku,
        bc.quantity_required, bc.unit_cost, bc.total_cost, bc.scrap_factor
      FROM bom_components bc
      JOIN products p ON bc.component_product_id = p.id
      WHERE bc.bom_id IN (SELECT id FROM bill_of_materials ORDER BY id DESC LIMIT 3)
      ORDER BY bc.bom_id, bc.id
    `);

    console.log('=== SAMPLE BOM COMPONENTS ===');
    let currentBomId = null;
    components.rows.forEach(comp => {
      if (comp.bom_id !== currentBomId) {
        console.log(`\n--- BOM ${comp.bom_id} Components ---`);
        currentBomId = comp.bom_id;
      }
      console.log(`${comp.component_name} (${comp.component_sku}):`);
      console.log(`  Qty: ${comp.quantity_required}, Unit Cost: $${comp.unit_cost}, Total: $${comp.total_cost}, Scrap: ${comp.scrap_factor}%`);
    });

    // Check suppliers added
    const suppliers = await pool.query(`
      SELECT COUNT(*) as count FROM suppliers
      WHERE supplier_code IN ('SUP011', 'SUP012', 'SUP013', 'SUP014', 'SUP015')
    `);
    console.log(`\nNew suppliers added: ${suppliers.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

verifyBOMData();
