// HRM Module Initialization
import { Application } from 'express';
import hrmRoutes from './routes';

export class HRMModule {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
    this.initializeModule();
  }

  private initializeModule(): void {
    // Register HRM routes
    this.app.use('/api/hrm', hrmRoutes);

    console.log('✅ HRM Module initialized');
  }

  // Static method to initialize the module
  static init(app: Application): HRMModule {
    return new HRMModule(app);
  }
}

export default HRMModule;
