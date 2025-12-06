"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  DollarSign,
  Package,
  Info
} from 'lucide-react';
import { accountsIntegrationService } from '@/services/accountsIntegration';

interface ModuleStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

interface ModuleStatus {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  available: boolean;
  description: string;
}

export const ModuleStatusIndicator: React.FC<ModuleStatusIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const [moduleStatuses, setModuleStatuses] = useState<ModuleStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const checkModuleStatuses = async () => {
      setIsLoading(true);
      try {
        // Check accounts module
        const accountsAvailable = await accountsIntegrationService.isAccountsModuleAvailable();
        
        const statuses: ModuleStatus[] = [
          {
            name: 'accounts',
            displayName: 'Accounts',
            icon: <DollarSign className="w-4 h-4" />,
            available: accountsAvailable,
            description: 'Financial accounting, vouchers, and chart of accounts'
          },
          {
            name: 'expenses',
            displayName: 'Expenses',
            icon: <Package className="w-4 h-4" />,
            available: true, // Expenses is always available
            description: 'Expense management and tracking'
          }
        ];

        setModuleStatuses(statuses);
      } catch (error) {
        console.error('Failed to check module statuses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkModuleStatuses();
  }, []);

  if (isLoading) {
    return (
      <Badge variant="secondary" className={className}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  const availableCount = moduleStatuses.filter(m => m.available).length;
  const totalCount = moduleStatuses.length;
  const allAvailable = availableCount === totalCount;

  const indicator = (
    <Badge 
      variant={allAvailable ? 'default' : 'outline'} 
      className={`cursor-pointer ${className}`}
    >
      {allAvailable ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : (
        <AlertTriangle className="w-3 h-3 mr-1" />
      )}
      Modules ({availableCount}/{totalCount})
    </Badge>
  );

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Module Status</p>
              {moduleStatuses.map(module => (
                <div key={module.name} className="flex items-center gap-2 text-xs">
                  {module.available ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span>{module.displayName}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-0">
            {indicator}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Module Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {moduleStatuses.map(module => (
              <Card key={module.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {module.icon}
                    {module.displayName}
                    <Badge variant={module.available ? 'default' : 'secondary'} className="ml-auto">
                      {module.available ? 'Available' : 'Not Available'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{module.description}</p>
                  {!module.available && module.name === 'accounts' && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="flex items-start gap-2">
                        <Info className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-800">Accounts Module Not Available</p>
                          <p className="text-yellow-700 mt-1">
                            Expenses will work normally, but accounting integration features will be disabled.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Modules can be enabled/disabled independently</p>
              <p>• Features gracefully degrade when modules are unavailable</p>
              <p>• Integration happens automatically when all required modules are available</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
