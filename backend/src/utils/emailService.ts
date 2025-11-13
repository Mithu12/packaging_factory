import nodemailer, { Transporter } from 'nodemailer';
import { MyLogger } from './new-logger';
import SettingsMediator from '@/mediators/settings/SettingsMediator';
import { IntegrationSettings } from '@/types/settings';

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  private fromEmail: string = 'noreply@company.com';

  /**
   * Initialize email transporter with SMTP settings from database
   */
  async initialize(): Promise<void> {
    try {
      const settingsMediator = new SettingsMediator();
      const integrations = await settingsMediator.getSettingsByCategory('integrations');
      
      // Check if email service is connected
      // SettingsMediator parses boolean values, but TypeScript sees string | null
      // So we check for string 'true' or any truthy value (handles parsed booleans at runtime)
      const emailServiceValue = integrations.email_service_connected?.value;
      const emailServiceConnected = emailServiceValue === 'true' || 
                                     (emailServiceValue !== null && emailServiceValue !== 'false' && String(emailServiceValue).toLowerCase() === 'true');
      
      if (!emailServiceConnected) {
        MyLogger.info('EmailService.initialize', { 
          message: 'Email service not connected in settings' 
        });
        this.isConfigured = false;
        return;
      }

      // Try to get email_service_config as JSON first
      let smtpConfig: any = null;
      const emailConfigSetting = integrations.email_service_config;
      
      if (emailConfigSetting?.data_type === 'json' && emailConfigSetting.value) {
        try {
          smtpConfig = typeof emailConfigSetting.value === 'string' 
            ? JSON.parse(emailConfigSetting.value)
            : emailConfigSetting.value;
        } catch (e) {
          MyLogger.warn('EmailService.initialize', { 
            message: 'Failed to parse email_service_config JSON' 
          });
        }
      }

      // Extract SMTP config - try JSON config first, then individual settings
      const host = smtpConfig?.smtp_host || 
                   integrations['email_service_config.smtp_host']?.value ||
                   integrations.smtp_host?.value;
      const port = smtpConfig?.smtp_port || 
                   (integrations['email_service_config.smtp_port']?.value 
                     ? parseInt(String(integrations['email_service_config.smtp_port'].value))
                     : (integrations.smtp_port?.value 
                        ? parseInt(String(integrations.smtp_port.value))
                        : null));
      const user = smtpConfig?.smtp_user || 
                   integrations['email_service_config.smtp_user']?.value ||
                   integrations.smtp_user?.value;
      const password = smtpConfig?.smtp_password || 
                       integrations['email_service_config.smtp_password']?.value ||
                       integrations.smtp_password?.value || '';
      
      if (!host || !port || !user) {
        MyLogger.warn('EmailService.initialize', { 
          message: 'SMTP configuration incomplete',
          hasHost: !!host,
          hasPort: !!port,
          hasUser: !!user
        });
        this.isConfigured = false;
        return;
      }

      const transporterConfig = {
        host: String(host),
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user: String(user),
          pass: String(password),
        },
      };
      
      this.transporter = nodemailer.createTransport(transporterConfig);
      this.fromEmail = String(user); // Store the email for use in sendMail

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      
      MyLogger.success('EmailService.initialize', { 
        host: host,
        port: port
      });
    } catch (error) {
      MyLogger.error('EmailService.initialize', error);
      this.isConfigured = false;
      this.transporter = null;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      MyLogger.warn('EmailService.sendEmail', { 
        message: 'Email service not configured, skipping email send',
        to: options.to
      });
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      MyLogger.success('EmailService.sendEmail', { 
        to: options.to,
        subject: options.subject
      });
      return true;
    } catch (error) {
      MyLogger.error('EmailService.sendEmail', error, { 
        to: options.to 
      });
      return false;
    }
  }

  /**
   * Send welcome email with generated password to new user
   */
  async sendWelcomeEmail(
    email: string,
    fullName: string,
    username: string,
    password: string
  ): Promise<boolean> {
    const subject = 'Welcome to ERP System - Your Account Credentials';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .credentials { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .password { font-family: monospace; font-size: 16px; font-weight: bold; color: #DC2626; background-color: #FEE2E2; padding: 10px; border-radius: 4px; }
            .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ERP System</h1>
            </div>
            <div class="content">
              <p>Hello ${fullName},</p>
              <p>Your account has been created successfully. Please find your login credentials below:</p>
              
              <div class="credentials">
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password">${password}</div>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Important:</strong> This is a temporary password. Please change it immediately after your first login for security purposes.</p>
              </div>
              
              <p>You can log in using these credentials and update your password from your profile settings.</p>
              
              <p>If you have any questions, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to ERP System

Hello ${fullName},

Your account has been created successfully. Please find your login credentials below:

Username: ${username}
Temporary Password: ${password}

⚠️ IMPORTANT: This is a temporary password. Please change it immediately after your first login for security purposes.

You can log in using these credentials and update your password from your profile settings.

If you have any questions, please contact your system administrator.

---
This is an automated message. Please do not reply to this email.
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

/**
 * Get or create email service instance
 */
export async function getEmailService(): Promise<EmailService> {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
    await emailServiceInstance.initialize();
  }
  return emailServiceInstance;
}

export default EmailService;

