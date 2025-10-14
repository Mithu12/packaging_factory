import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface LicenseData {
  key: string;
  machineId: string;
  issueDate: string;
  expiryDate: string;
  maxUsers?: number;
  features?: string[];
  clientName?: string;
  clientId?: string;
}

interface LicenseValidationResult {
  valid: boolean;
  error?: string;
  data?: LicenseData;
}

export class LicenseManager {
  private static instance: LicenseManager;
  private licenseFilePath: string;
  private encryptionKey: string;
  private cachedLicense?: LicenseData;
  private lastValidation?: number;
  private validationInterval = 3600000; // 1 hour

  private constructor() {
    this.licenseFilePath = process.env.LICENSE_FILE_PATH || path.join(__dirname, '../../license.lic');
    this.encryptionKey = process.env.LICENSE_ENCRYPTION_KEY || 'DEFAULT_KEY_CHANGE_IN_PRODUCTION';
  }

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  /**
   * Get machine ID based on hardware characteristics
   */
  private async getMachineId(): Promise<string> {
    try {
      let identifier = '';

      // Get system identifiers based on OS
      if (process.platform === 'linux') {
        try {
          const { stdout: machineId } = await execAsync('cat /etc/machine-id || cat /var/lib/dbus/machine-id');
          identifier = machineId.trim();
        } catch {
          const { stdout: cpuInfo } = await execAsync('cat /proc/cpuinfo | grep Serial || echo ""');
          identifier = cpuInfo.trim();
        }
      } else if (process.platform === 'win32') {
        const { stdout: wmic } = await execAsync('wmic csproduct get uuid');
        identifier = wmic.replace('UUID', '').trim();
      } else if (process.platform === 'darwin') {
        const { stdout: serial } = await execAsync('system_profiler SPHardwareDataType | grep "Serial Number" | awk \'{print $4}\'');
        identifier = serial.trim();
      }

      // Fallback to network interface MAC address
      if (!identifier) {
        const networkInterfaces = require('os').networkInterfaces();
        const firstInterface = Object.values(networkInterfaces).flat()[0] as any;
        identifier = firstInterface?.mac || 'UNKNOWN';
      }

      // Create hash of the identifier
      return crypto.createHash('sha256').update(identifier).digest('hex');
    } catch (error) {
      console.error('Error getting machine ID:', error);
      return 'UNKNOWN';
    }
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string): string {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate a license key
   */
  public generateLicenseKey(
    clientId: string,
    clientName: string,
    expiryDays: number = 365,
    options: {
      maxUsers?: number;
      features?: string[];
      machineId?: string;
    } = {}
  ): string {
    const issueDate = new Date().toISOString();
    const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    
    const licenseData = {
      clientId,
      clientName,
      issueDate,
      expiryDate,
      maxUsers: options.maxUsers,
      features: options.features,
      machineId: options.machineId || 'ANY',
    };

    const dataString = JSON.stringify(licenseData);
    const signature = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(dataString)
      .digest('hex');

    const licenseKey = Buffer.from(dataString + '.' + signature).toString('base64');
    return licenseKey;
  }

  /**
   * Parse and verify license key
   */
  private parseLicenseKey(licenseKey: string): LicenseData | null {
    try {
      const decoded = Buffer.from(licenseKey, 'base64').toString('utf8');
      const [dataString, signature] = decoded.split('.');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.encryptionKey)
        .update(dataString)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      const data = JSON.parse(dataString);
      return {
        key: licenseKey,
        machineId: data.machineId,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        maxUsers: data.maxUsers,
        features: data.features,
        clientName: data.clientName,
        clientId: data.clientId,
      };
    } catch (error) {
      console.error('Error parsing license key:', error);
      return null;
    }
  }

  /**
   * Validate license
   */
  public async validateLicense(skipCache: boolean = false): Promise<LicenseValidationResult> {
    // Check cache
    const now = Date.now();
    if (!skipCache && this.cachedLicense && this.lastValidation && (now - this.lastValidation) < this.validationInterval) {
      return { valid: true, data: this.cachedLicense };
    }

    // Read license file
    if (!fs.existsSync(this.licenseFilePath)) {
      return { valid: false, error: 'License file not found' };
    }

    try {
      const encryptedLicense = fs.readFileSync(this.licenseFilePath, 'utf8');
      const licenseKey = this.decrypt(encryptedLicense);
      const licenseData = this.parseLicenseKey(licenseKey);

      if (!licenseData) {
        return { valid: false, error: 'Invalid license key' };
      }

      // Check expiry
      const expiryDate = new Date(licenseData.expiryDate);
      if (expiryDate < new Date()) {
        return { valid: false, error: 'License expired' };
      }

      // Check machine ID
      const currentMachineId = await this.getMachineId();
      if (licenseData.machineId !== 'ANY' && licenseData.machineId !== currentMachineId) {
        return { valid: false, error: 'License not valid for this machine' };
      }

      // Cache valid license
      this.cachedLicense = licenseData;
      this.lastValidation = now;

      return { valid: true, data: licenseData };
    } catch (error) {
      console.error('Error validating license:', error);
      return { valid: false, error: 'Error reading license file' };
    }
  }

  /**
   * Install a license key
   */
  public installLicense(licenseKey: string): { success: boolean; error?: string } {
    try {
      const licenseData = this.parseLicenseKey(licenseKey);
      
      if (!licenseData) {
        return { success: false, error: 'Invalid license key' };
      }

      // Encrypt and save
      const encrypted = this.encrypt(licenseKey);
      const dir = path.dirname(this.licenseFilePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.licenseFilePath, encrypted, 'utf8');
      
      // Clear cache
      this.cachedLicense = undefined;
      this.lastValidation = undefined;

      return { success: true };
    } catch (error) {
      console.error('Error installing license:', error);
      return { success: false, error: 'Failed to install license' };
    }
  }

  /**
   * Get license info
   */
  public async getLicenseInfo(): Promise<LicenseData | null> {
    const result = await this.validateLicense();
    return result.valid ? result.data || null : null;
  }

  /**
   * Get current machine ID (for generating licenses)
   */
  public async getCurrentMachineId(): Promise<string> {
    return this.getMachineId();
  }

  /**
   * Check if a feature is enabled
   */
  public async hasFeature(feature: string): Promise<boolean> {
    const result = await this.validateLicense();
    if (!result.valid || !result.data) {
      return false;
    }

    if (!result.data.features || result.data.features.length === 0) {
      return true; // If no features specified, all are enabled
    }

    return result.data.features.includes(feature);
  }

  /**
   * Get days until expiry
   */
  public async getDaysUntilExpiry(): Promise<number> {
    const result = await this.validateLicense();
    if (!result.valid || !result.data) {
      return 0;
    }

    const expiryDate = new Date(result.data.expiryDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}

export default LicenseManager.getInstance();

