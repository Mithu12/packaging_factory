import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { licenseService, type LicenseInfo } from '@/services/licenseService';
import { AlertCircle, CheckCircle2, Copy, Key, Server } from 'lucide-react';
import { toast } from 'sonner';

export default function LicenseManagement() {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [machineId, setMachineId] = useState('');

  useEffect(() => {
    loadLicenseInfo();
    loadMachineId();
  }, []);

  const loadLicenseInfo = async () => {
    setLoading(true);
    try {
      const info = await licenseService.getLicenseInfo(true);
      setLicenseInfo(info);
    } catch (error) {
      console.error('Failed to load license info:', error);
      toast.error('Failed to load license information');
    } finally {
      setLoading(false);
    }
  };

  const loadMachineId = async () => {
    try {
      const result = await licenseService.getMachineId();
      if (result.success) {
        setMachineId(result.machineId);
      }
    } catch (error) {
      console.error('Failed to load machine ID:', error);
    }
  };

  const handleInstallLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }

    setInstalling(true);
    try {
      const result = await licenseService.installLicense(licenseKey);
      
      if (result.success) {
        toast.success('License installed successfully');
        setLicenseKey('');
        await loadLicenseInfo();
      } else {
        toast.error(result.message || 'Failed to install license');
      }
    } catch (error) {
      console.error('Failed to install license:', error);
      toast.error('An error occurred while installing the license');
    } finally {
      setInstalling(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getStatusBadge = () => {
    if (!licenseInfo) return null;

    if (!licenseInfo.valid) {
      return <Badge variant="destructive">Invalid/Expired</Badge>;
    }

    if (licenseInfo.daysRemaining && licenseInfo.daysRemaining <= 30) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
        Expiring Soon
      </Badge>;
    }

    return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
      Active
    </Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading license information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">License Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your software license and view system information
          </p>
        </div>
        <Button onClick={loadLicenseInfo} variant="outline">
          Refresh
        </Button>
      </div>

      {/* License Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>License Status</CardTitle>
                <CardDescription>Current license information</CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!licenseInfo?.valid ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>License Invalid or Expired</AlertTitle>
              <AlertDescription>
                {licenseInfo?.error || 'Please install a valid license to continue using the system.'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {licenseInfo.daysRemaining && licenseInfo.daysRemaining <= 30 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>License Expiring Soon</AlertTitle>
                  <AlertDescription>
                    Your license will expire in {licenseInfo.daysRemaining} days. Please contact your vendor for renewal.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Client Name</Label>
                  <p className="text-lg font-semibold mt-1">{licenseInfo.clientName || 'N/A'}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Client ID</Label>
                  <p className="text-lg font-semibold mt-1">{licenseInfo.clientId || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                  <p className="text-lg font-semibold mt-1">
                    {licenseInfo.issueDate 
                      ? new Date(licenseInfo.issueDate).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Expiry Date</Label>
                  <p className="text-lg font-semibold mt-1">
                    {licenseInfo.expiryDate 
                      ? new Date(licenseInfo.expiryDate).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Days Remaining</Label>
                  <p className="text-lg font-semibold mt-1">
                    {licenseInfo.daysRemaining !== undefined 
                      ? `${licenseInfo.daysRemaining} days` 
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Max Users</Label>
                  <p className="text-lg font-semibold mt-1">
                    {licenseInfo.maxUsers || 'Unlimited'}
                  </p>
                </div>
              </div>

              {licenseInfo.features && licenseInfo.features.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Licensed Features</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {licenseInfo.features.map((feature) => (
                      <Badge key={feature} variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Machine ID */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Machine Information</CardTitle>
              <CardDescription>
                This unique ID identifies your server/machine
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Machine ID</Label>
            <div className="flex gap-2">
              <Input 
                value={machineId} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(machineId, 'Machine ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this ID with your vendor when requesting a machine-locked license
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Install License */}
      <Card>
        <CardHeader>
          <CardTitle>Install New License</CardTitle>
          <CardDescription>
            Enter the license key provided by your vendor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseKey">License Key</Label>
            <Input
              id="licenseKey"
              type="text"
              placeholder="Paste your license key here..."
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono"
            />
          </div>
          
          <Button 
            onClick={handleInstallLicense} 
            disabled={installing || !licenseKey.trim()}
            className="w-full"
          >
            {installing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Installing...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Install License
              </>
            )}
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              After installing a new license, the application will restart automatically.
              Make sure to save any unsaved work before proceeding.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

