import { MyLogger } from './new-logger';

/**
 * Module Registry - Manages optional module dependencies
 * This allows modules to check if other modules are available and integrate conditionally
 */
class ModuleRegistry {
  private availableModules: Set<string> = new Set();
  private moduleServices: Map<string, any> = new Map();

  /**
   * Register a module as available
   */
  registerModule(moduleName: string, services?: any): void {
    this.availableModules.add(moduleName);
    if (services) {
      this.moduleServices.set(moduleName, services);
    }
    MyLogger.info('Module Registry', { 
      action: 'register', 
      module: moduleName, 
      hasServices: !!services 
    });
  }

  /**
   * Check if a module is available
   */
  isModuleAvailable(moduleName: string): boolean {
    return this.availableModules.has(moduleName);
  }

  /**
   * Get services for a module (if available)
   */
  getModuleServices<T = any>(moduleName: string): T | null {
    return this.moduleServices.get(moduleName) || null;
  }

  /**
   * Get all available modules
   */
  getAvailableModules(): string[] {
    return Array.from(this.availableModules);
  }

  /**
   * Unregister a module (useful for testing or dynamic module loading)
   */
  unregisterModule(moduleName: string): void {
    this.availableModules.delete(moduleName);
    this.moduleServices.delete(moduleName);
    MyLogger.info('Module Registry', { 
      action: 'unregister', 
      module: moduleName 
    });
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry();

// Module names constants
export const MODULE_NAMES = {
  ACCOUNTS: 'accounts',
  EXPENSES: 'expenses',
  INVENTORY: 'inventory',
  FACTORY: 'factory',
  HRM: 'hrm',
} as const;

export type ModuleName = typeof MODULE_NAMES[keyof typeof MODULE_NAMES];
