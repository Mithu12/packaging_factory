"use client";

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database,
  Users,
  Mail,
  Save,
  Loader2,
  FileImage,
  Upload,
  Trash2,
  X,
  DollarSign,
  Globe,
  Facebook,
  CreditCard,
  Building2
} from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/sonner"
import { SettingsApi } from "@/services/settings-api"
import { 
  CompanySettings, 
  SystemSettings, 
  PayrollSettings,
  NotificationSettings, 
  SecuritySettings, 
  EcommerceSettings,
  IntegrationSettings 
} from "@/services/settings-types"

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingSystemLogo, setUploadingSystemLogo] = useState(false)
  const [systemLogoPreview, setSystemLogoPreview] = useState<string | null>(null)
  
  // Settings state
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    company_email: '',
    company_address: 'Dhaka, Bangladesh',
    phone: '+880 1234 567890',
    tax_id: 'VAT-123456789',
    invoice_logo: '',
    system_logo: '',
    website: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    bank_branch: '',
    routing_number: '',
    facebook_url: ''
  })
  
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    default_currency: 'bdt',
    timezone: 'bdt',
    date_format: 'dd/mm/yyyy',
    number_format: 'bd'
  })

  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>({
    payroll_salary_mode: 'hourly',
    payroll_overtime_enabled: true
  })
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    low_stock_alerts: true,
    purchase_order_approvals: true,
    payment_due_reminders: true,
    supplier_performance: false,
    system_updates: true,
    security_alerts: true,
    notification_emails: ''
  })
  
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    require_2fa: false,
    session_timeout: true,
    session_duration: 60,
    allow_user_registration: false,
    email_verification_required: true,
    default_user_role: 'viewer'
  })
  
  const [ecommerceSettings, setEcommerceSettings] = useState<EcommerceSettings>({
    auto_customer_signup: false
  })
  
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    email_service_connected: true,
    email_service_config: {
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_password: ''
    },
    accounting_software_connected: false,
    accounting_software_config: {
      api_key: '',
      api_url: ''
    },
    erp_system_connected: false,
    erp_system_config: {
      api_key: '',
      api_url: ''
    },
    api_access_enabled: false,
    api_key: 'sk_test_...',
    webhook_url: ''
  })

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // Try to load all settings, if they don't exist, initialize defaults
      try {
        const [company, system, payroll, notifications, security, ecommerce, integrations] = await Promise.all([
          SettingsApi.getCompanySettings(),
          SettingsApi.getSystemSettings(),
          SettingsApi.getPayrollSettings().catch((): PayrollSettings => ({
            payroll_salary_mode: 'hourly',
            payroll_overtime_enabled: true,
          })),
          SettingsApi.getNotificationSettings(),
          SettingsApi.getSecuritySettings(),
          SettingsApi.getEcommerceSettings(),
          SettingsApi.getIntegrationSettings()
        ])
        
        setCompanySettings(company)
        setSystemSettings(system)
        setPayrollSettings({
          payroll_salary_mode: ((payroll?.payroll_salary_mode as string) || 'hourly') as 'hourly' | 'monthly',
          payroll_overtime_enabled: payroll?.payroll_overtime_enabled !== false
        })
        setNotificationSettings(notifications)
        setSecuritySettings(security)
        setEcommerceSettings(ecommerce)
        setIntegrationSettings(integrations)
      } catch (error) {
        // If settings don't exist, initialize defaults
        console.log('Settings not found, initializing defaults...')
        await SettingsApi.initializeDefaultSettings()
        
        // Reload settings after initialization
        const [company, system, payroll, notifications, security, ecommerce, integrations] = await Promise.all([
          SettingsApi.getCompanySettings(),
          SettingsApi.getSystemSettings(),
          SettingsApi.getPayrollSettings().catch((): PayrollSettings => ({
            payroll_salary_mode: 'hourly',
            payroll_overtime_enabled: true,
          })),
          SettingsApi.getNotificationSettings(),
          SettingsApi.getSecuritySettings(),
          SettingsApi.getEcommerceSettings(),
          SettingsApi.getIntegrationSettings()
        ])
        
        setCompanySettings(company)
        setSystemSettings(system)
        setPayrollSettings({
          payroll_salary_mode: ((payroll?.payroll_salary_mode as string) || 'hourly') as 'hourly' | 'monthly',
          payroll_overtime_enabled: payroll?.payroll_overtime_enabled !== false
        })
        setNotificationSettings(notifications)
        setSecuritySettings(security)
        setEcommerceSettings(ecommerce)
        setIntegrationSettings(integrations)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Failed to load settings', {
        description: 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      
      // Save all settings based on active tab
      switch (activeTab) {
        case 'general':
          await Promise.all([
            SettingsApi.updateCompanySettings(companySettings),
            SettingsApi.updateSystemSettings(systemSettings)
          ])
          break
        case 'notifications':
          await SettingsApi.updateNotificationSettings(notificationSettings)
          break
        case 'security':
          await Promise.all([
            SettingsApi.updateSecuritySettings(securitySettings),
            SettingsApi.updateEcommerceSettings(ecommerceSettings)
          ])
          break
        case 'payroll':
          await SettingsApi.updatePayrollSettings(payrollSettings)
          break
        case 'integrations':
          await SettingsApi.updateIntegrationSettings(integrationSettings)
          break
      }
      
      toast.success('Settings saved successfully!', {
        description: 'Your preferences have been updated.'
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings', {
        description: 'Please try again later.'
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle invoice logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (PNG, JPG, JPEG, SVG)'
      })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Logo file size must be less than 2MB'
      })
      return
    }

    try {
      setUploadingLogo(true)
      
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload the logo
      const result = await SettingsApi.uploadInvoiceLogo(file)
      
      setCompanySettings(prev => ({ ...prev, invoice_logo: result.logoUrl }))
      setLogoPreview(null)
      
      toast.success('Invoice logo uploaded successfully!', {
        description: 'Your logo will appear on invoices.'
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      setLogoPreview(null)
      toast.error('Failed to upload logo', {
        description: 'Please try again later.'
      })
    } finally {
      setUploadingLogo(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // Handle invoice logo delete
  const handleLogoDelete = async () => {
    try {
      setUploadingLogo(true)
      await SettingsApi.deleteInvoiceLogo()
      
      setCompanySettings(prev => ({ ...prev, invoice_logo: '' }))
      setLogoPreview(null)
      
      toast.success('Invoice logo removed', {
        description: 'Your invoices will no longer show a logo.'
      })
    } catch (error) {
      console.error('Error deleting logo:', error)
      toast.error('Failed to remove logo', {
        description: 'Please try again later.'
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle system logo upload
  const handleSystemLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (PNG, JPG, JPEG, SVG)'
      })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Logo file size must be less than 2MB'
      })
      return
    }

    try {
      setUploadingSystemLogo(true)
      
      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setSystemLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload the logo
      const result = await SettingsApi.uploadSystemLogo(file)
      
      setCompanySettings(prev => ({ ...prev, system_logo: result.logoUrl }))
      setSystemLogoPreview(null)
      
      toast.success('System logo uploaded successfully!', {
        description: 'Your logo will appear in the system sidebar.'
      })
    } catch (error) {
      console.error('Error uploading system logo:', error)
      setSystemLogoPreview(null)
      toast.error('Failed to upload system logo', {
        description: 'Please try again later.'
      })
    } finally {
      setUploadingSystemLogo(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // Handle system logo delete
  const handleSystemLogoDelete = async () => {
    try {
      setUploadingSystemLogo(true)
      await SettingsApi.deleteSystemLogo()
      
      setCompanySettings(prev => ({ ...prev, system_logo: '' }))
      setSystemLogoPreview(null)
      
      toast.success('System logo removed', {
        description: 'The system will default to the standard logo.'
      })
    } catch (error) {
      console.error('Error deleting system logo:', error)
      toast.error('Failed to remove system logo', {
        description: 'Please try again later.'
      })
    } finally {
      setUploadingSystemLogo(false)
    }
  }

  // Get the full logo URL for display
  const getLogoUrl = (type: 'invoice' | 'system' = 'invoice'): string | null => {
    if (type === 'invoice') {
      if (logoPreview) return logoPreview
      if (!companySettings.invoice_logo) return null
      
      if (companySettings.invoice_logo.startsWith('http')) {
        return companySettings.invoice_logo
      }
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000'
      return `${apiUrl}${companySettings.invoice_logo}`
    } else {
      if (systemLogoPreview) return systemLogoPreview
      if (!companySettings.system_logo) return null
      
      if (companySettings.system_logo.startsWith('http')) {
        return companySettings.system_logo
      }
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000'
      return `${apiUrl}${companySettings.system_logo}`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your system preferences and manage account settings</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90" 
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  <CardTitle>Company Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input 
                      id="company-name" 
                      value={companySettings.company_name}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Company Email</Label>
                    <Input 
                      id="company-email" 
                      type="email" 
                      value={companySettings.company_email}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Address</Label>
                  <Input 
                    id="company-address" 
                    value={companySettings.company_address}
                    onChange={(e) => setCompanySettings(prev => ({ ...prev, company_address: e.target.value }))}
                    placeholder="House/Road, Area, City, Bangladesh"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+880 1234 567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-id">Tax ID</Label>
                    <Input 
                      id="tax-id" 
                      value={companySettings.tax_id}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, tax_id: e.target.value }))}
                      placeholder="VAT-123456789"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      <Globe className="w-4 h-4" />
                    </span>
                    <Input 
                      id="website" 
                      className="rounded-l-none"
                      value={companySettings.website}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="www.yourcompany.com"
                    />
                  </div>
                </div>

                {/* Invoice Logo Upload Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-muted-foreground" />
                    <Label className="text-base font-medium">Invoice Logo</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a logo to display on your invoices. Recommended size: 200x80 pixels. Max file size: 2MB.
                  </p>
                  
                  <div className="flex items-start gap-6">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      {getLogoUrl() ? (
                        <div className="relative group">
                          <div className="w-48 h-20 border rounded-lg overflow-hidden bg-white flex items-center justify-center p-2">
                            <img 
                              src={getLogoUrl()!} 
                              alt="Invoice Logo" 
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          {/* Delete button overlay */}
                          <button
                            type="button"
                            onClick={handleLogoDelete}
                            disabled={uploadingLogo}
                            className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
                            title="Remove logo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-48 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                          <FileImage className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor="invoice-logo-upload">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingLogo}
                            className="cursor-pointer"
                            asChild
                          >
                            <span>
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  {companySettings.invoice_logo ? 'Change Logo' : 'Upload Logo'}
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                        <input
                          id="invoice-logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                        
                        {companySettings.invoice_logo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleLogoDelete}
                            disabled={uploadingLogo}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PNG, JPG, JPEG, SVG
                      </p>
                    </div>
                  </div>
                </div>

                {/* System Logo Upload Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-muted-foreground" />
                    <Label className="text-base font-medium">System Logo</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload a logo for the system sidebar and branding. Recommended size: 40x40 pixels. Max file size: 2MB.
                  </p>
                  
                  <div className="flex items-start gap-6">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      {getLogoUrl('system') ? (
                        <div className="relative group">
                          <div className="w-20 h-20 border rounded-lg overflow-hidden bg-white flex items-center justify-center p-2">
                            <img 
                              src={getLogoUrl('system')!} 
                              alt="System Logo" 
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          {/* Delete button overlay */}
                          <button
                            type="button"
                            onClick={handleSystemLogoDelete}
                            disabled={uploadingSystemLogo}
                            className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
                            title="Remove logo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                          <SettingsIcon className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor="system-logo-upload">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingSystemLogo}
                            className="cursor-pointer"
                            asChild
                          >
                            <span>
                              {uploadingSystemLogo ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  {companySettings.system_logo ? 'Change Logo' : 'Upload Logo'}
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                        <input
                          id="system-logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleSystemLogoUpload}
                          disabled={uploadingSystemLogo}
                          className="hidden"
                        />
                        
                        {companySettings.system_logo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSystemLogoDelete}
                            disabled={uploadingSystemLogo}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PNG, JPG, JPEG, SVG
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <CardTitle>Bank Account Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input 
                      id="bank-name" 
                      value={companySettings.bank_name}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, bank_name: e.target.value }))}
                      placeholder="Brac-Bank PLC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-branch">Branch</Label>
                    <Input 
                      id="bank-branch" 
                      value={companySettings.bank_branch}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, bank_branch: e.target.value }))}
                      placeholder="Kawran Bazar Branch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input 
                      id="account-name" 
                      value={companySettings.account_name}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, account_name: e.target.value }))}
                      placeholder="MICROMEDIA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input 
                      id="account-number" 
                      value={companySettings.account_number}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, account_number: e.target.value }))}
                      placeholder="2075898530001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routing-number">Routing Number</Label>
                    <Input 
                      id="routing-number" 
                      value={companySettings.routing_number}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, routing_number: e.target.value }))}
                      placeholder="060261397"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    <CardTitle>Online Presence</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="facebook-url">Facebook Page URL</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        <Facebook className="w-4 h-4" />
                      </span>
                      <Input 
                        id="facebook-url" 
                        className="rounded-l-none"
                        value={companySettings.facebook_url}
                        onChange={(e) => setCompanySettings(prev => ({ ...prev, facebook_url: e.target.value }))}
                        placeholder="fb.com/micromediabd"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm text-primary font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Tip
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      These details are used to dynamically generate your Quotation Pad design and invoices. Ensure they are accurate before printing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select 
                      value={systemSettings.default_currency}
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, default_currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bdt">BDT (৳) - Bangladeshi Taka</SelectItem>
                        <SelectItem value="usd">USD ($) - US Dollar</SelectItem>
                        <SelectItem value="eur">EUR (€) - Euro</SelectItem>
                        <SelectItem value="gbp">GBP (£) - British Pound</SelectItem>
                        <SelectItem value="inr">INR (₹) - Indian Rupee</SelectItem>
                        <SelectItem value="pkr">PKR (₨) - Pakistani Rupee</SelectItem>
                        <SelectItem value="cad">CAD (C$) - Canadian Dollar</SelectItem>
                        <SelectItem value="aud">AUD (A$) - Australian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={systemSettings.timezone}
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bdt">BDT - Bangladesh Standard Time (UTC+6)</SelectItem>
                        <SelectItem value="ist">IST - India Standard Time (UTC+5:30)</SelectItem>
                        <SelectItem value="pkt">PKT - Pakistan Standard Time (UTC+5)</SelectItem>
                        <SelectItem value="utc">UTC - Coordinated Universal Time</SelectItem>
                        <SelectItem value="gmt">GMT - Greenwich Mean Time</SelectItem>
                        <SelectItem value="est">EST - Eastern Time (UTC-5)</SelectItem>
                        <SelectItem value="pst">PST - Pacific Time (UTC-8)</SelectItem>
                        <SelectItem value="cst">CST - Central Time (UTC-6)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select 
                      value={systemSettings.date_format}
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, date_format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY (Bangladesh Standard)</SelectItem>
                        <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY (US Format)</SelectItem>
                        <SelectItem value="mm-dd-yyyy">MM-DD-YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD (ISO Format)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number-format">Number Format</Label>
                    <Select 
                      value={systemSettings.number_format}
                      onValueChange={(value) => setSystemSettings(prev => ({ ...prev, number_format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bd">BD (1,23,456.78) - Bangladesh Format</SelectItem>
                        <SelectItem value="us">US (1,234.56) - US Format</SelectItem>
                        <SelectItem value="eu">EU (1.234,56) - European Format</SelectItem>
                        <SelectItem value="in">IN (1,23,456.78) - Indian Format</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payroll Settings */}
        <TabsContent value="payroll">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <CardTitle>Payroll Salary Calculation</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose how employee salary is calculated. Only one mode can be active.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Salary Calculation Mode</Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div
                      className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                        payrollSettings.payroll_salary_mode === 'hourly'
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:bg-muted/50'
                      }`}
                      onClick={() => setPayrollSettings(prev => ({ ...prev, payroll_salary_mode: 'hourly' }))}
                    >
                      <div className="font-medium flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                          {payrollSettings.payroll_salary_mode === 'hourly' && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </span>
                        Hour Count
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Salary is calculated by actual hours worked from attendance records.
                      </p>
                    </div>
                    <div
                      className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${
                        payrollSettings.payroll_salary_mode === 'monthly'
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:bg-muted/50'
                      }`}
                      onClick={() => setPayrollSettings(prev => ({ ...prev, payroll_salary_mode: 'monthly' }))}
                    >
                      <div className="font-medium flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center">
                          {payrollSettings.payroll_salary_mode === 'monthly' && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </span>
                        Month Count
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Salary is calculated monthly, deducting for absent days based on attendance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Overtime Count</Label>
                      <p className="text-sm text-muted-foreground">Include overtime hours in payroll (paid at 1.5x rate)</p>
                    </div>
                    <Switch
                      checked={payrollSettings.payroll_overtime_enabled !== false}
                      onCheckedChange={(checked) => setPayrollSettings(prev => ({ ...prev, payroll_overtime_enabled: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Low Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when items fall below minimum stock</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.low_stock_alerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, low_stock_alerts: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Purchase Order Approvals</Label>
                      <p className="text-sm text-muted-foreground">Notifications for PO approval requests</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.purchase_order_approvals}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, purchase_order_approvals: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Payment Due Reminders</Label>
                      <p className="text-sm text-muted-foreground">Reminders for upcoming payment due dates</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.payment_due_reminders}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, payment_due_reminders: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Supplier Performance</Label>
                      <p className="text-sm text-muted-foreground">Weekly supplier performance reports</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.supplier_performance}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, supplier_performance: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">System Updates</Label>
                      <p className="text-sm text-muted-foreground">Notifications about system maintenance and updates</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.system_updates}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, system_updates: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">Important security notifications</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.security_alerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, security_alerts: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Recipients</h3>
                <div className="space-y-2">
                  <Label htmlFor="notification-emails">Additional Email Recipients</Label>
                  <Input 
                    id="notification-emails" 
                    placeholder="email1@company.com, email2@company.com"
                    value={notificationSettings.notification_emails}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, notification_emails: e.target.value }))}
                  />
                  <p className="text-sm text-muted-foreground">Comma-separated list of email addresses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <CardTitle>Access Control</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Require Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Enable 2FA for all user accounts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.require_2fa}
                      onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, require_2fa: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Session Timeout</Label>
                      <p className="text-sm text-muted-foreground">Automatically log out inactive users</p>
                    </div>
                    <Switch 
                      checked={securitySettings.session_timeout}
                      onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, session_timeout: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-duration">Session Duration (minutes)</Label>
                    <Input 
                      id="session-duration" 
                      type="number" 
                      value={securitySettings.session_duration}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, session_duration: parseInt(e.target.value) || 60 }))}
                      className="w-32" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <CardTitle>User Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Allow User Registration</Label>
                      <p className="text-sm text-muted-foreground">Allow new users to register accounts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.allow_user_registration}
                      onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, allow_user_registration: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Verification Required</Label>
                      <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
                    </div>
                    <Switch 
                      checked={securitySettings.email_verification_required}
                      onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, email_verification_required: checked }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-role">Default User Role</Label>
                    <Select 
                      value={securitySettings.default_user_role}
                      onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, default_user_role: value }))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  <CardTitle>External Integrations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Email Service</div>
                        <div className="text-sm text-muted-foreground">SMTP configuration for email notifications</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${integrationSettings.email_service_connected ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {integrationSettings.email_service_connected ? 'Connected' : 'Not Connected'}
                      </span>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Accounting Software</div>
                        <div className="text-sm text-muted-foreground">QuickBooks integration for financial data</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${integrationSettings.accounting_software_connected ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {integrationSettings.accounting_software_connected ? 'Connected' : 'Not Connected'}
                      </span>
                      <Button variant="outline" size="sm">Setup</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <SettingsIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">ERP System</div>
                        <div className="text-sm text-muted-foreground">Enterprise resource planning integration</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${integrationSettings.erp_system_connected ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {integrationSettings.erp_system_connected ? 'Connected' : 'Not Connected'}
                      </span>
                      <Button variant="outline" size="sm">Setup</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="api-key" 
                      type="password" 
                      value={integrationSettings.api_key}
                      onChange={(e) => setIntegrationSettings(prev => ({ ...prev, api_key: e.target.value }))}
                      className="flex-1" 
                    />
                    <Button variant="outline">Regenerate</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input 
                    id="webhook-url" 
                    placeholder="https://your-domain.com/webhook"
                    value={integrationSettings.webhook_url}
                    onChange={(e) => setIntegrationSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable API Access</Label>
                    <p className="text-sm text-muted-foreground">Allow external applications to access your data</p>
                  </div>
                  <Switch 
                    checked={integrationSettings.api_access_enabled}
                    onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, api_access_enabled: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
