// Main API service that combines all modules
export { SupplierApi } from './supplier-api';
export { CategoryApi } from './category-api';
export { BrandApi } from './brand-api';
export { ProductApi } from './product-api';
export { StockAdjustmentApi } from './stock-adjustment-api';
export { PurchaseOrderApi } from './purchase-order-api';

// Re-export types and utilities
export * from './types';
export { ApiError } from './types';
export { makeRequest } from './api-utils';

// Legacy ApiService class for backward compatibility
import { SupplierApi } from './supplier-api';
import { CategoryApi } from './category-api';
import { BrandApi } from './brand-api';
import { ProductApi } from './product-api';
import { StockAdjustmentApi } from './stock-adjustment-api';
import { PurchaseOrderApi } from './purchase-order-api';

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
    return SupplierApi.getSupplierCategories();
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
}