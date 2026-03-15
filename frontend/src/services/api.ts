// Main API service that combines all modules
export { SupplierApi } from '../modules/inventory/services/supplier-api';
export { default as SupplierCategoryApi } from '../modules/inventory/services/supplier-category-api';
export { CategoryApi } from '../modules/inventory/services/category-api';
export { BrandApi } from '../modules/inventory/services/brand-api';
export { OriginApi } from '../modules/inventory/services/origin-api';
export { ProductApi } from '../modules/inventory/services/product-api';
export { StockAdjustmentApi } from '../modules/inventory/services/stock-adjustment-api';
export { PurchaseOrderApi } from '../modules/inventory/services/purchase-order-api';
export { DistributionApi } from '../modules/inventory/services/distribution-api';
export { ExpenseApi } from './expense-api';
export { ExpenseCategoryApi } from './expense-category-api';

// Re-export types and utilities
export * from './types';
export { ApiError } from './types';
export { makeRequest } from './api-utils';

// Legacy ApiService class for backward compatibility
import { SupplierApi } from '../modules/inventory/services/supplier-api';
import SupplierCategoryApi from '../modules/inventory/services/supplier-category-api';
import { CategoryApi } from '../modules/inventory/services/category-api';
import { BrandApi } from '../modules/inventory/services/brand-api';
import { OriginApi } from '../modules/inventory/services/origin-api';
import { ProductApi } from '../modules/inventory/services/product-api';
import { StockAdjustmentApi } from '../modules/inventory/services/stock-adjustment-api';
import { PurchaseOrderApi } from '../modules/inventory/services/purchase-order-api';
import { DistributionApi } from '../modules/inventory/services/distribution-api';
import { ExpenseApi } from './expense-api';
import { ExpenseCategoryApi } from './expense-category-api';

export class ApiService {
  // Supplier methods
  static async getSuppliers(params?: any) {
    return SupplierApi.getSuppliers(params);
  }

  static async getSupplier(id: number) {
    return SupplierApi.getSupplier(id);
  }

  static async createSupplier(data: any) {
    return SupplierApi.createSupplier(data);
  }

  static async updateSupplier(id: number, data: any) {
    return SupplierApi.updateSupplier(id, data);
  }

  static async toggleSupplierStatus(id: number) {
    return SupplierApi.toggleSupplierStatus(id);
  }

  static async deleteSupplier(id: number) {
    return SupplierApi.deleteSupplier(id);
  }

  static async getSupplierStats() {
    return SupplierApi.getSupplierStats();
  }

  static async getSupplierCategories() {
    return SupplierCategoryApi.getSupplierCategoryNames();
  }

  // Supplier Category methods
  static async getSupplierCategoryList(params?: any) {
    return SupplierCategoryApi.getSupplierCategories(params);
  }

  static async getSupplierCategory(id: number) {
    return SupplierCategoryApi.getSupplierCategory(id);
  }

  static async createSupplierCategory(data: any) {
    return SupplierCategoryApi.createSupplierCategory(data);
  }

  static async updateSupplierCategory(id: number, data: any) {
    return SupplierCategoryApi.updateSupplierCategory(id, data);
  }

  static async deleteSupplierCategory(id: number) {
    return SupplierCategoryApi.deleteSupplierCategory(id);
  }

  static async searchSuppliers(query: string, limit = 10) {
    return SupplierApi.searchSuppliers(query, limit);
  }

  // Category methods
  static async getCategories(params?: any) {
    return CategoryApi.getCategories(params);
  }

  static async getCategory(id: number) {
    return CategoryApi.getCategory(id);
  }

  static async createCategory(data: any) {
    return CategoryApi.createCategory(data);
  }

  static async updateCategory(id: number, data: any) {
    return CategoryApi.updateCategory(id, data);
  }

  static async deleteCategory(id: number) {
    return CategoryApi.deleteCategory(id);
  }

  static async getCategoryStats() {
    return CategoryApi.getCategoryStats();
  }

  static async searchCategories(query: string, limit = 10) {
    return CategoryApi.searchCategories(query, limit);
  }

  // Subcategory methods
  static async getSubcategories(params?: any) {
    return CategoryApi.getSubcategories(params);
  }

  static async getSubcategory(id: number) {
    return CategoryApi.getSubcategory(id);
  }

  static async createSubcategory(data: any) {
    return CategoryApi.createSubcategory(data);
  }

  static async updateSubcategory(id: number, data: any) {
    return CategoryApi.updateSubcategory(id, data);
  }

  static async deleteSubcategory(id: number) {
    return CategoryApi.deleteSubcategory(id);
  }

  static async searchSubcategories(query: string, limit = 10) {
    return CategoryApi.searchSubcategories(query, limit);
  }

  // Brand methods
  static async getBrands(params?: any) {
    return BrandApi.getAllBrands();
  }

  static async getBrand(id: number) {
    return BrandApi.getBrandById(id);
  }

  static async createBrand(data: any) {
    return BrandApi.createBrand(data);
  }

  static async updateBrand(id: number, data: any) {
    return BrandApi.updateBrand(id, data);
  }

  static async deleteBrand(id: number) {
    return BrandApi.deleteBrand(id);
  }

  // Origin methods
  static async getOrigins(params?: any) {
    return OriginApi.getAllOrigins();
  }

  static async getOrigin(id: number) {
    return OriginApi.getOriginById(id);
  }

  static async createOrigin(data: any) {
    return OriginApi.createOrigin(data);
  }

  static async updateOrigin(id: number, data: any) {
    return OriginApi.updateOrigin(id, data);
  }

  static async deleteOrigin(id: number) {
    return OriginApi.deleteOrigin(id);
  }

  // Product methods
  static async getProducts(params?: any) {
    return ProductApi.getProducts(params);
  }

  static async getProduct(id: number) {
    return ProductApi.getProduct(id);
  }

  static async createProduct(data: any) {
    return ProductApi.createProduct(data);
  }

  static async updateProduct(id: number, data: any) {
    return ProductApi.updateProduct(id, data);
  }

  static async toggleProductStatus(id: number) {
    return ProductApi.toggleProductStatus(id);
  }

  static async updateProductStock(id: number, data: any) {
    return ProductApi.updateProductStock(id, data);
  }

  static async deleteProduct(id: number) {
    return ProductApi.deleteProduct(id);
  }

  static async getProductStats() {
    return ProductApi.getProductStats();
  }

  static async searchProducts(query: string, limit = 10) {
    return ProductApi.searchProducts(query, limit);
  }

  static async searchProductByBarcode(barcode: string) {
    return ProductApi.searchProductByBarcode(barcode);
  }

  static async getLowStockProducts() {
    return ProductApi.getLowStockProducts();
  }

  static async getProductsByCategory(categoryId: number) {
    return ProductApi.getProductsByCategory(categoryId);
  }

  static async getProductsBySupplier(supplierId: number) {
    return ProductApi.getProductsBySupplier(supplierId);
  }

  static async checkProductReferences(id: number) {
    return ProductApi.checkProductReferences(id);
  }

  // Stock Adjustment methods
  static async getStockAdjustments(params?: any) {
    return StockAdjustmentApi.getStockAdjustments(params);
  }

  static async getStockAdjustmentStats(productId?: number) {
    return StockAdjustmentApi.getStockAdjustmentStats(productId);
  }

  static async getStockAdjustment(id: number) {
    return StockAdjustmentApi.getStockAdjustment(id);
  }

  // Purchase Order methods
  static async getPurchaseOrders(params?: any) {
    return PurchaseOrderApi.getPurchaseOrders(params);
  }

  static async getPurchaseOrder(id: number) {
    return PurchaseOrderApi.getPurchaseOrder(id);
  }

  static async createPurchaseOrder(data: any) {
    return PurchaseOrderApi.createPurchaseOrder(data);
  }

  static async updatePurchaseOrder(id: number, data: any) {
    return PurchaseOrderApi.updatePurchaseOrder(id, data);
  }

  static async updatePurchaseOrderStatus(id: number, data: any) {
    return PurchaseOrderApi.updatePurchaseOrderStatus(id, data);
  }

  static async receiveGoods(id: number, data: any) {
    return PurchaseOrderApi.receiveGoods(id, data);
  }

  static async deletePurchaseOrder(id: number) {
    return PurchaseOrderApi.deletePurchaseOrder(id);
  }

  static async cancelPurchaseOrder(id: number, reason?: string) {
    return PurchaseOrderApi.cancelPurchaseOrder(id, reason);
  }

  static async getPurchaseOrderStats() {
    return PurchaseOrderApi.getPurchaseOrderStats();
  }

  static async searchPurchaseOrders(query: string, limit = 10) {
    return PurchaseOrderApi.searchPurchaseOrders(query, limit);
  }

  // Expense methods
  static async getExpenses(params?: any) {
    return ExpenseApi.getExpenses(params);
  }

  static async getExpense(id: number) {
    return ExpenseApi.getExpense(id);
  }

  static async createExpense(data: any) {
    return ExpenseApi.createExpense(data);
  }

  static async createExpenseWithReceipt(data: any, receiptFile?: File) {
    return ExpenseApi.createExpenseWithReceipt(data, receiptFile);
  }

  static async updateExpense(id: number, data: any) {
    return ExpenseApi.updateExpense(id, data);
  }

  static async updateExpenseReceipt(id: number, receiptFile: File) {
    return ExpenseApi.updateExpenseReceipt(id, receiptFile);
  }

  static async approveExpense(id: number, notes?: string) {
    return ExpenseApi.approveExpense(id, notes);
  }

  static async rejectExpense(id: number, reason: string) {
    return ExpenseApi.rejectExpense(id, reason);
  }

  static async payExpense(id: number, notes?: string) {
    return ExpenseApi.payExpense(id, notes);
  }

  static async deleteExpense(id: number) {
    return ExpenseApi.deleteExpense(id);
  }

  static async getExpenseStats(params?: any) {
    return ExpenseApi.getExpenseStats(params);
  }

  static async getExpenseAccountPreview(categoryId: number, costCenterId?: number) {
    return ExpenseApi.getExpenseAccountPreview(categoryId, costCenterId);
  }

  static async getExpenseAccountDebited(expenseId: number) {
    return ExpenseApi.getExpenseAccountDebited(expenseId);
  }

  // Expense Category methods
  static async getExpenseCategories(params?: any) {
    return ExpenseCategoryApi.getExpenseCategories(params);
  }

  static async getActiveExpenseCategories() {
    return ExpenseCategoryApi.getActiveExpenseCategories();
  }

  static async getExpenseCategory(id: number) {
    return ExpenseCategoryApi.getExpenseCategory(id);
  }

  static async createExpenseCategory(data: any) {
    return ExpenseCategoryApi.createExpenseCategory(data);
  }

  static async updateExpenseCategory(id: number, data: any) {
    return ExpenseCategoryApi.updateExpenseCategory(id, data);
  }

  static async deleteExpenseCategory(id: number) {
    return ExpenseCategoryApi.deleteExpenseCategory(id);
  }

  // Distribution Center methods
  static async getDistributionCenters(params?: any) {
    return DistributionApi.getDistributionCenters(params);
  }
}