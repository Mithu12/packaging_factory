import pool from './connection';
import {MyLogger} from '@/utils/new-logger';

const seedData = async () => {
  let action = 'Seed Database Data'
  const client = await pool.connect();
  
  try {
    MyLogger.info(action)
    
    // Check if data already exists
    MyLogger.info('Check Existing Data')
    const result = await client.query('SELECT COUNT(*) FROM suppliers');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      MyLogger.warn(action, { message: 'Data already exists, skipping seed', existingCount: count })
      console.log('📊 Data already exists, skipping seed');
      return;
    }
    MyLogger.success('Check Existing Data', { existingCount: count })

    // Insert sample suppliers
    MyLogger.info('Insert Sample Suppliers')
    const suppliers = [
      {
        supplier_code: 'SUP-001',
        name: 'ABC Electronics Ltd',
        contact_person: 'John Smith',
        phone: '+1 (555) 123-4567',
        email: 'john.smith@abcelectronics.com',
        website: 'https://www.abcelectronics.com',
        address: '123 Tech Street',
        city: 'Silicon Valley',
        state: 'CA',
        zip_code: '94025',
        country: 'United States',
        category: 'Electronics',
        tax_id: 'TAX-123456789',
        payment_terms: 'net-30',
        bank_name: 'Tech Bank',
        bank_account: '1234567890',
        bank_routing: '021000021',
        status: 'active',
        rating: 4.8,
        total_orders: 145,
        last_order_date: '2024-01-10',
        notes: 'Reliable supplier for electronic components'
      },
      {
        supplier_code: 'SUP-002',
        name: 'Global Raw Materials Inc',
        contact_person: 'Sarah Johnson',
        phone: '+1 (555) 987-6543',
        email: 'sarah.j@globalraw.com',
        website: 'https://www.globalraw.com',
        address: '456 Industrial Blvd',
        city: 'Houston',
        state: 'TX',
        zip_code: '77001',
        country: 'United States',
        category: 'Raw Materials',
        tax_id: 'TAX-987654321',
        payment_terms: 'net-15',
        bank_name: 'Industrial Bank',
        bank_account: '0987654321',
        bank_routing: '021000022',
        status: 'active',
        rating: 4.5,
        total_orders: 89,
        last_order_date: '2024-01-08',
        notes: 'Specializes in industrial raw materials'
      },
      {
        supplier_code: 'SUP-003',
        name: 'Office Furniture Pro',
        contact_person: 'Mike Wilson',
        phone: '+1 (555) 456-7890',
        email: 'mike@officefurniturepro.com',
        website: 'https://www.officefurniturepro.com',
        address: '789 Commerce Ave',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30309',
        country: 'United States',
        category: 'Furniture',
        tax_id: 'TAX-456789123',
        payment_terms: 'net-45',
        bank_name: 'Commerce Bank',
        bank_account: '4567891230',
        bank_routing: '021000023',
        status: 'inactive',
        rating: 4.2,
        total_orders: 67,
        last_order_date: '2023-12-15',
        notes: 'Temporarily inactive due to supply chain issues'
      },
      {
        supplier_code: 'SUP-004',
        name: 'Premium Parts Supply',
        contact_person: 'Lisa Davis',
        phone: '+1 (555) 321-0987',
        email: 'lisa.davis@premiumparts.com',
        website: 'https://www.premiumparts.com',
        address: '321 Manufacturing Lane',
        city: 'Detroit',
        state: 'MI',
        zip_code: '48201',
        country: 'United States',
        category: 'Components',
        tax_id: 'TAX-321098765',
        payment_terms: 'net-30',
        bank_name: 'Manufacturing Bank',
        bank_account: '3210987654',
        bank_routing: '021000024',
        status: 'active',
        rating: 4.9,
        total_orders: 203,
        last_order_date: '2024-01-12',
        notes: 'Excellent quality and fast delivery'
      }
    ];

    for (const supplier of suppliers) {
      await client.query(`
        INSERT INTO suppliers (
          supplier_code, name, contact_person, phone, email, website,
          address, city, state, zip_code, country, category, tax_id,
          payment_terms, bank_name, bank_account, bank_routing,
          status, rating, total_orders, last_order_date, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
      `, [
        supplier.supplier_code, supplier.name, supplier.contact_person,
        supplier.phone, supplier.email, supplier.website, supplier.address,
        supplier.city, supplier.state, supplier.zip_code, supplier.country,
        supplier.category, supplier.tax_id, supplier.payment_terms,
        supplier.bank_name, supplier.bank_account, supplier.bank_routing,
        supplier.status, supplier.rating, supplier.total_orders,
        supplier.last_order_date, supplier.notes
      ]);
    }
    MyLogger.success('Insert Sample Suppliers', { suppliersCount: suppliers.length })

    // Insert sample performance data
    MyLogger.info('Insert Sample Performance Data')
    const performanceData = [
      {
        supplier_id: 1,
        delivery_time_days: 3,
        quality_rating: 4.8,
        price_rating: 4.5,
        communication_rating: 4.9,
        issues_count: 2,
        on_time_delivery_rate: 95.5,
        notes: 'Consistently reliable'
      },
      {
        supplier_id: 2,
        delivery_time_days: 5,
        quality_rating: 4.3,
        price_rating: 4.7,
        communication_rating: 4.4,
        issues_count: 5,
        on_time_delivery_rate: 88.2,
        notes: 'Good pricing, occasional delays'
      },
      {
        supplier_id: 4,
        delivery_time_days: 2,
        quality_rating: 4.9,
        price_rating: 4.6,
        communication_rating: 4.8,
        issues_count: 1,
        on_time_delivery_rate: 98.1,
        notes: 'Top performer'
      }
    ];

    for (const perf of performanceData) {
      await client.query(`
        INSERT INTO supplier_performance (
          supplier_id, delivery_time_days, quality_rating, price_rating,
          communication_rating, issues_count, on_time_delivery_rate, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        perf.supplier_id, perf.delivery_time_days, perf.quality_rating,
        perf.price_rating, perf.communication_rating, perf.issues_count,
        perf.on_time_delivery_rate, perf.notes
      ]);
    }
    MyLogger.success('Insert Sample Performance Data', { performanceRecordsCount: performanceData.length })

    // Insert sample categories
    MyLogger.info('Insert Sample Categories')
    const categories = [
      {
        name: 'Electronics',
        description: 'Electronic devices and accessories'
      },
      {
        name: 'Clothing',
        description: 'Apparel and fashion items'
      },
      {
        name: 'Furniture',
        description: 'Home and office furniture'
      },
      {
        name: 'Books',
        description: 'Books and educational materials'
      }
    ];

    const insertedCategories = [];
    for (const category of categories) {
      const result = await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
        [category.name, category.description]
      );
      insertedCategories.push(result.rows[0]);
    }
    MyLogger.success('Insert Sample Categories', { categoriesCount: insertedCategories.length })

    // Insert sample subcategories
    MyLogger.info('Insert Sample Subcategories')
    const subcategories = [
      // Electronics subcategories
      { name: 'Smartphones', description: 'Mobile phones and accessories', category_id: insertedCategories[0].id },
      { name: 'Laptops', description: 'Portable computers', category_id: insertedCategories[0].id },
      { name: 'Tablets', description: 'Tablet devices', category_id: insertedCategories[0].id },
      
      // Clothing subcategories
      { name: "Men's Wear", description: 'Men clothing and accessories', category_id: insertedCategories[1].id },
      { name: "Women's Wear", description: 'Women clothing and accessories', category_id: insertedCategories[1].id },
      { name: 'Kids Wear', description: 'Children clothing', category_id: insertedCategories[1].id },
      
      // Furniture subcategories
      { name: 'Office Furniture', description: 'Desks, chairs, and office equipment', category_id: insertedCategories[2].id },
      { name: 'Home Furniture', description: 'Living room, bedroom furniture', category_id: insertedCategories[2].id },
      
      // Books subcategories
      { name: 'Fiction', description: 'Novels and fiction books', category_id: insertedCategories[3].id },
      { name: 'Non-Fiction', description: 'Educational and reference books', category_id: insertedCategories[3].id }
    ];

    for (const subcategory of subcategories) {
      await client.query(
        'INSERT INTO subcategories (name, description, category_id) VALUES ($1, $2, $3)',
        [subcategory.name, subcategory.description, subcategory.category_id]
      );
    }
    MyLogger.success('Insert Sample Subcategories', { subcategoriesCount: subcategories.length })

    // Insert sample products
    MyLogger.info('Insert Sample Products')
    const products = [
      {
        sku: 'LPT-001',
        name: 'Business Laptop Model X',
        description: 'High-performance business laptop with 16GB RAM and 512GB SSD',
        category_id: 1, // Electronics
        subcategory_id: 1, // Laptops
        unit_of_measure: 'pcs',
        cost_price: 850.00,
        selling_price: 1200.00,
        current_stock: 45,
        min_stock_level: 10,
        max_stock_level: 100,
        supplier_id: 1, // ABC Electronics Ltd
        status: 'active',
        barcode: '1234567890123',
        weight: 2.5,
        dimensions: '35.5 x 24.5 x 2.0 cm',
        tax_rate: 8.5,
        reorder_point: 15,
        reorder_quantity: 25,
        notes: 'Popular business laptop model'
      },
      {
        sku: 'CHR-205',
        name: 'Ergonomic Office Chair',
        description: 'Comfortable ergonomic office chair with lumbar support',
        category_id: 2, // Furniture
        subcategory_id: 3, // Seating
        unit_of_measure: 'pcs',
        cost_price: 150.00,
        selling_price: 220.00,
        current_stock: 8,
        min_stock_level: 15,
        max_stock_level: 50,
        supplier_id: 2, // Office Furniture Pro
        status: 'active',
        barcode: '2345678901234',
        weight: 15.0,
        dimensions: '65 x 65 x 120 cm',
        tax_rate: 8.5,
        reorder_point: 20,
        reorder_quantity: 30,
        notes: 'Low stock - needs reordering'
      },
      {
        sku: 'TNR-301',
        name: 'Laser Printer Toner',
        description: 'High-yield laser printer toner cartridge',
        category_id: 3, // Office Supplies
        subcategory_id: 4, // Consumables
        unit_of_measure: 'pcs',
        cost_price: 45.00,
        selling_price: 75.00,
        current_stock: 3,
        min_stock_level: 12,
        max_stock_level: 100,
        supplier_id: 3, // Premium Parts Supply
        status: 'active',
        barcode: '3456789012345',
        weight: 0.8,
        dimensions: '25 x 15 x 8 cm',
        tax_rate: 8.5,
        reorder_point: 15,
        reorder_quantity: 50,
        notes: 'Critical stock level - urgent reorder needed'
      },
      {
        sku: 'MTL-450',
        name: 'Steel Raw Material Grade A',
        description: 'High-quality steel raw material for manufacturing',
        category_id: 4, // Raw Materials
        subcategory_id: 5, // Metals
        unit_of_measure: 'kg',
        cost_price: 2.50,
        selling_price: 4.00,
        current_stock: 2500,
        min_stock_level: 500,
        max_stock_level: 5000,
        supplier_id: 4, // Global Raw Materials Inc
        status: 'active',
        barcode: '4567890123456',
        weight: null, // Sold by weight
        dimensions: 'Various sizes',
        tax_rate: 8.5,
        reorder_point: 750,
        reorder_quantity: 1000,
        notes: 'Bulk material - good stock levels'
      },
      {
        sku: 'CBL-102',
        name: 'USB-C Cable Premium',
        description: 'High-speed USB-C cable with premium build quality',
        category_id: 1, // Electronics
        subcategory_id: 2, // Accessories
        unit_of_measure: 'pcs',
        cost_price: 8.00,
        selling_price: 15.00,
        current_stock: 120,
        min_stock_level: 50,
        max_stock_level: 200,
        supplier_id: 1, // ABC Electronics Ltd
        status: 'discontinued',
        barcode: '5678901234567',
        weight: 0.1,
        dimensions: '2m length',
        tax_rate: 8.5,
        reorder_point: 60,
        reorder_quantity: 100,
        notes: 'Product discontinued - clear remaining stock'
      }
    ];

    for (const product of products) {
      await client.query(
        'INSERT INTO products (sku, name, description, category_id, subcategory_id, unit_of_measure, cost_price, selling_price, current_stock, min_stock_level, max_stock_level, supplier_id, status, barcode, weight, dimensions, tax_rate, reorder_point, reorder_quantity, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)',
        [product.sku, product.name, product.description, product.category_id, product.subcategory_id, product.unit_of_measure, product.cost_price, product.selling_price, product.current_stock, product.min_stock_level, product.max_stock_level, product.supplier_id, product.status, product.barcode, product.weight, product.dimensions, product.tax_rate, product.reorder_point, product.reorder_quantity, product.notes]
      );
    }
    MyLogger.success('Insert Sample Products', { productsCount: products.length })

    MyLogger.success(action, { 
      suppliersInserted: suppliers.length, 
      performanceRecordsInserted: performanceData.length,
      categoriesInserted: insertedCategories.length,
      subcategoriesInserted: subcategories.length,
      productsInserted: products.length
    })
    console.log('✅ Sample data inserted successfully');
  } catch (error) {
    MyLogger.error(action, error)
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  let action = 'Database Seeding'
  MyLogger.info(action)
  seedData()
    .then(() => {
      MyLogger.success(action)
      console.log('🎉 Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      MyLogger.error(action, error)
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export default seedData;
