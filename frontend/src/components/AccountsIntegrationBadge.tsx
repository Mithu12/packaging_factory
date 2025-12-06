"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Link, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  FileText,
  DollarSign
} from 'lucide-react';
import { accountsIntegrationService, AccountsIntegrationStatus } from '@/services/accountsIntegration';

interface AccountsIntegrationBadgeProps {
  expenseId: number;
  expenseStatus: string;
  showDetails?: boolean;
  className?: string;
}

export const AccountsIntegrationBadge: React.FC<AccountsIntegrationBadgeProps> = ({
  expenseId,
  expenseStatus,
  showDetails = false,
  className = ''
}) => {
  const [integrationStatus, setIntegrationStatus] = useState<AccountsIntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      setIsLoading(true);
      try {
        const status = await accountsIntegrationService.getExpenseAccountsIntegrationStatus(expenseId);
        setIntegrationStatus(status);
      } catch (error) {
        console.error('Failed to fetch integration status:', error);
        setIntegrationStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegrationStatus();
  }, [expenseId]);

  if (isLoading) {
    return (
      <Badge variant="secondary" className={className}>
        <AlertCircle className="w-3 h-3 mr-1" />
        Checking...
      </Badge>
    );
  }

  if (!integrationStatus) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className={className}>
              <XCircle className="w-3 h-3 mr-1" />
              No Integration
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Accounts module is not available or integration failed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getBadgeContent = () => {
    if (!integrationStatus.available) {
      return {
        variant: 'secondary' as const,
        icon: <XCircle className="w-3 h-3 mr-1" />,
        text: 'Accounts N/A',
        tooltip: 'Accounts module is not available'
      };
    }

    if (!integrationStatus.canIntegrate) {
      return {
        variant: 'outline' as const,
        icon: <AlertCircle className="w-3 h-3 mr-1" />,
        text: 'Cannot Integrate',
        tooltip: 'This expense cannot be integrated with accounts (missing required data)'
      };
    }

    if (integrationStatus.voucherInfo) {
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
        text: 'Integrated',
        tooltip: `Voucher created: ${integrationStatus.voucherInfo.voucherNo}`
      };
    }

    if (expenseStatus === 'approved' || expenseStatus === 'paid') {
      return {
        variant: 'default' as const,
        icon: <Link className="w-3 h-3 mr-1" />,
        text: 'Ready',
        tooltip: 'Ready for accounting integration'
      };
    }

    return {
      variant: 'outline' as const,
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      text: 'Pending',
      tooltip: 'Expense must be approved before accounting integration'
    };
  };

  const badgeContent = getBadgeContent();

  const badge = (
    <Badge variant={badgeContent.variant} className={className}>
      {badgeContent.icon}
      {badgeContent.text}
    </Badge>
  );

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{badgeContent.tooltip}</p>
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
            {badge}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Accounts Integration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Integration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accounts Module</span>
                  <Badge variant={integrationStatus.available ? 'default' : 'secondary'}>
                    {integrationStatus.available ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Can Integrate</span>
                  <Badge variant={integrationStatus.canIntegrate ? 'default' : 'outline'}>
                    {integrationStatus.canIntegrate ? 'Yes' : 'No'}
                  </Badge>
                </div>

                {integrationStatus.voucherInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Voucher</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {integrationStatus.voucherInfo.voucherNo}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {integrationStatus.available && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Approved expenses automatically create accounting vouchers</p>
                <p>• Integration happens in the background when expenses are approved</p>
                <p>• Vouchers can be viewed in the Accounts module</p>
              </div>
            )}

            {!integrationStatus.available && (
              <div className="text-xs text-muted-foreground">
                <p>The Accounts module is not available. Expenses will work normally without accounting integration.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
