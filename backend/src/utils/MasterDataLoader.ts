import pool from "../database/connection";
import { MyLogger } from "./new-logger";

/**
 * MasterDataLoader — Singleton utility that loads all reference/master data
 * from the database into memory at application startup.
 *
 * Usage:
 *   await MasterDataLoader.load();           // Call once at startup
 *   const cats = MasterDataLoader.categories; // Access cached data anywhere
 *   await MasterDataLoader.reload();          // Hot-reload after a CRUD change
 *   await MasterDataLoader.reload('categories'); // Reload a single table
 */
export class MasterDataLoader {
  private static readonly ACTION = "MasterDataLoader";

  // ── Cached data stores ──────────────────────────────────────────────
  private static _categories: any[] = [];
  private static _subcategories: any[] = [];
  private static _brands: any[] = [];
  private static _origins: any[] = [];
  private static _suppliers: any[] = [];
  private static _products: any[] = [];
  private static _factories: any[] = [];
  private static _productionLines: any[] = [];
  private static _operators: any[] = [];
  private static _costCenters: any[] = [];
  private static _departments: any[] = [];
  private static _designations: any[] = [];

  private static _loaded = false;
  private static _loadedAt: Date | null = null;

  // ── Public read-only accessors ──────────────────────────────────────
  static get categories()      { return this._categories; }
  static get subcategories()   { return this._subcategories; }
  static get brands()          { return this._brands; }
  static get origins()         { return this._origins; }
  static get suppliers()       { return this._suppliers; }
  static get products()        { return this._products; }
  static get factories()       { return this._factories; }
  static get productionLines() { return this._productionLines; }
  static get operators()       { return this._operators; }
  static get costCenters()     { return this._costCenters; }
  static get departments()     { return this._departments; }
  static get designations()    { return this._designations; }
  static get isLoaded()        { return this._loaded; }
  static get loadedAt()        { return this._loadedAt; }

  // ── Loader map (table key → query + setter) ────────────────────────
  private static readonly LOADERS: Record<
    string,
    { query: string; setter: (rows: any[]) => void }
  > = {
    categories: {
      query: `SELECT id, name, description, status, created_at FROM categories ORDER BY name`,
      setter: (rows) => { MasterDataLoader._categories = rows; },
    },
    // subcategories: {
    //   query: `SELECT id, name, category_id, description, status, created_at FROM subcategories ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._subcategories = rows; },
    // },
    // brands: {
    //   query: `SELECT id, name, description, is_active, created_at FROM brands ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._brands = rows; },
    // },
    // origins: {
    //   query: `SELECT id, name, description, is_active, created_at FROM origins ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._origins = rows; },
    // },
    // suppliers: {
    //   query: `SELECT id, supplier_code, name, category, status, contact_person, email, phone, address, created_at FROM suppliers ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._suppliers = rows; },
    // },
    // products: {
    //   query: `SELECT id, sku, name, description, category_id, subcategory_id, brand_id, origin_id, selling_price, cost_price, current_stock, status, created_at FROM products ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._products = rows; },
    // },
    factories: {
      query: `SELECT id, code, name, description, address, cost_center_id, is_active, created_at FROM factories ORDER BY name`,
      setter: (rows) => { MasterDataLoader._factories = rows; },
    },
    productionLines: {
      query: `SELECT id, factory_id, code, name, description, capacity, current_load, location, status, is_active, created_at FROM production_lines ORDER BY name`,
      setter: (rows) => { MasterDataLoader._productionLines = rows; },
    },
    // operators: {
    //   query: `SELECT id, name, employee_id, specialization, status, production_line_id, created_at FROM operators ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._operators = rows; },
    // },
    costCenters: {
      query: `SELECT id, code, name, type, status, created_at FROM cost_centers ORDER BY name`,
      setter: (rows) => { MasterDataLoader._costCenters = rows; },
    },
    // departments: {
    //   query: `SELECT id, name, code, description, is_active, created_at FROM departments ORDER BY name`,
    //   setter: (rows) => { MasterDataLoader._departments = rows; },
    // },
    // designations: {
    //   query: `SELECT id, title, department_id, level, is_active, created_at FROM designations ORDER BY title`,
    //   setter: (rows) => { MasterDataLoader._designations = rows; },
    // },
  };

  // ── Core public methods ─────────────────────────────────────────────

  /**
   * Load all master data into memory.
   * Safe to call multiple times — subsequent calls are no-ops unless forced.
   */
  static async load(force = false): Promise<void> {
    if (this._loaded && !force) {
      MyLogger.info(this.ACTION, { message: "Master data already loaded, skipping." });
      return;
    }

    MyLogger.info(this.ACTION, { message: "Loading all master data..." });
    const startTime = Date.now();
    const summary: Record<string, number> = {};

    for (const [key, loader] of Object.entries(this.LOADERS)) {
      try {
        const { rows } = await pool.query(loader.query);
        loader.setter(rows);
        summary[key] = rows.length;
      } catch (error: any) {
        // If a table doesn't exist yet (e.g. module not migrated), skip gracefully
        if (error.code === "42P01") {
          MyLogger.warn(this.ACTION, {
            message: `Table for "${key}" does not exist yet — skipped.`,
          });
          summary[key] = -1; // -1 signals "table missing"
        } else {
          MyLogger.error(this.ACTION, error, { key, message: `Failed to load "${key}"` });
          summary[key] = -1;
        }
      }
    }

    this._loaded = true;
    this._loadedAt = new Date();

    const elapsed = Date.now() - startTime;
    MyLogger.success(this.ACTION, {
      message: `Master data loaded in ${elapsed}ms`,
      summary,
      loadedAt: this._loadedAt.toISOString(),
    });
  }

  /**
   * Reload all master data, or a single table by key.
   * Useful after a CRUD operation mutates reference data.
   *
   * @param key  Optional table key (e.g. 'categories'). If omitted, reloads everything.
   */
  static async reload(key?: string): Promise<void> {
    if (key) {
      const loader = this.LOADERS[key];
      if (!loader) {
        MyLogger.warn(this.ACTION, { message: `Unknown master data key: "${key}"` });
        return;
      }

      try {
        MyLogger.info(this.ACTION, { message: `Reloading master data: ${key}` });
        const { rows } = await pool.query(loader.query);
        loader.setter(rows);
        MyLogger.success(this.ACTION, { message: `Reloaded "${key}" — ${rows.length} rows` });
      } catch (error: any) {
        MyLogger.error(this.ACTION, error, { key, message: `Failed to reload "${key}"` });
      }
      return;
    }

    // Reload everything
    await this.load(true);
  }

  // ── Convenience look-up helpers ─────────────────────────────────────

  /** Find a category by ID */
  static getCategoryById(id: number) {
    return this._categories.find((c) => c.id === id) ?? null;
  }

  /** Find a product by ID */
  static getProductById(id: number) {
    return this._products.find((p) => p.id === id) ?? null;
  }

  /** Find a product by SKU */
  static getProductBySku(sku: string) {
    return this._products.find((p) => p.sku === sku) ?? null;
  }

  /** Find a factory by ID */
  static getFactoryById(id: string | number) {
    return this._factories.find((f) => String(f.id) === String(id)) ?? null;
  }

  /** Find a factory by code */
  static getFactoryByCode(code: string) {
    return this._factories.find((f) => f.code === code) ?? null;
  }

  /** Find a supplier by ID */
  static getSupplierById(id: number) {
    return this._suppliers.find((s) => s.id === id) ?? null;
  }

  /** Find a production line by ID */
  static getProductionLineById(id: string | number) {
    return this._productionLines.find((pl) => String(pl.id) === String(id)) ?? null;
  }

  /** Find a cost center by ID */
  static getCostCenterById(id: number) {
    return this._costCenters.find((cc) => cc.id === id) ?? null;
  }

  /** Find a department by ID */
  static getDepartmentById(id: number) {
    return this._departments.find((d) => d.id === id) ?? null;
  }

  /** Get products filtered by category ID */
  static getProductsByCategory(categoryId: number) {
    return this._products.filter((p) => p.category_id === categoryId);
  }

  /** Get active-only items from any master list */
  static getActive(key: keyof typeof MasterDataLoader.LOADERS): any[] {
    const list = (this as any)[`_${key}`] as any[];
    if (!list) return [];
    return list.filter(
      (item) =>
        item.is_active === true ||
        item.status === "active" ||
        item.status === "Active" ||
        item.status === "available"
    );
  }

  /** Get a diagnostic snapshot for health-check / debugging */
  static getStatus() {
    return {
      loaded: this._loaded,
      loadedAt: this._loadedAt?.toISOString() ?? null,
      counts: Object.keys(this.LOADERS).reduce(
        (acc, key) => {
          const list = (this as any)[`_${key}`] as any[];
          acc[key] = list?.length ?? 0;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}
