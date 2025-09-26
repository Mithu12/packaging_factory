import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

export class DeleteProductMediator {
  static async deleteProduct(id: number): Promise<void> {
    let action = "DeleteProductMediator.deleteProduct";
    try {
      MyLogger.info(action, { productId: id });

      // Check if product exists
      const productQuery = "SELECT id, name, sku FROM products WHERE id = $1";
      const productResult = await pool.query(productQuery, [id]);

      if (productResult.rows.length === 0) {
        MyLogger.warn(action, { productId: id, message: "Product not found" });
        throw new Error("Product not found");
      }

      const product = productResult.rows[0];

      // Check if product is referenced in other tables (e.g., purchase orders, inventory transactions)
      // For now, we'll do a soft delete by setting status to 'discontinued'
      // In a real system, you might want to check for references in other tables

      const updateQuery = `
                UPDATE products 
                SET status = 'discontinued', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;

      await pool.query(updateQuery, [id]);

      MyLogger.success(action, {
        productId: id,
        productName: product.name,
        productSku: product.sku,
        message: "Product marked as discontinued",
      });
    } catch (error: any) {
      MyLogger.error(action, error, { productId: id });
      throw error;
    }
  }

  static async hardDeleteProduct(id: number): Promise<void> {
    let action = "DeleteProductMediator.hardDeleteProduct";
    try {
      MyLogger.info(action, { productId: id });

      // Check if product exists
      const productQuery = "SELECT id, name, sku FROM products WHERE id = $1";
      const productResult = await pool.query(productQuery, [id]);

      if (productResult.rows.length === 0) {
        MyLogger.warn(action, { productId: id, message: "Product not found" });
        throw new Error("Product not found");
      }

      const product = productResult.rows[0];

      // Check for references in other tables
      // This is a simplified check - in a real system, you'd check all related tables
      const referencesQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM purchase_order_items WHERE product_id = $1) as po_items,
                    (SELECT COUNT(*) FROM inventory_transactions WHERE product_id = $1) as inventory_transactions
            `;

      const referencesResult = await pool.query(referencesQuery, [id]);
      const references = referencesResult.rows[0];

      if (
        parseInt(references.po_items) > 0 ||
        parseInt(references.inventory_transactions) > 0
      ) {
        MyLogger.warn(action, {
          productId: id,
          message: "Product has references in other tables",
          references: references,
        });
        throw new Error(
          "Cannot delete product: it has references in purchase orders or inventory transactions"
        );
      }

      // Delete the product
      const deleteQuery = "DELETE FROM products WHERE id = $1";
      await pool.query(deleteQuery, [id]);

      MyLogger.success(action, {
        productId: id,
        productName: product.name,
        productSku: product.sku,
        message: "Product permanently deleted",
      });
    } catch (error: any) {
      MyLogger.error(action, error, { productId: id });
      throw error;
    }
  }

  static async checkProductReferences(id: number): Promise<{
    hasReferences: boolean;
    references: {
      purchase_order_items: number;
      inventory_transactions: number;
    };
  }> {
    let action = "DeleteProductMediator.checkProductReferences";
    try {
      MyLogger.info(action, { productId: id });

      const query = `
                SELECT 
                    (SELECT COUNT(*) FROM purchase_order_items WHERE product_id = $1) as purchase_order_items,
                    (SELECT COUNT(*) FROM inventory_transactions WHERE product_id = $1) as inventory_transactions
            `;

      const result = await pool.query(query, [id]);
      const references = result.rows[0];

      const referencesCount = {
        purchase_order_items: parseInt(references.purchase_order_items),
        inventory_transactions: parseInt(references.inventory_transactions),
      };

      const hasReferences =
        referencesCount.purchase_order_items > 0 ||
        referencesCount.inventory_transactions > 0;

      MyLogger.success(action, {
        productId: id,
        hasReferences,
        references: referencesCount,
      });

      return {
        hasReferences,
        references: referencesCount,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { productId: id });
      throw error;
    }
  }
}
