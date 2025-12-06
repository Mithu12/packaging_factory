"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Users,
  FileText,
  Palette
} from 'lucide-react';
import { LeaveTypeListProps } from '../types';

const LeaveTypeList: React.FC<LeaveTypeListProps> = ({
  leaveTypes,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false
}) => {
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <ToggleRight className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <ToggleLeft className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getGenderBadge = (genderRestriction?: string) => {
    switch (genderRestriction) {
      case 'male':
        return <Badge variant="outline" className="text-blue-600">Male Only</Badge>;
      case 'female':
        return <Badge variant="outline" className="text-pink-600">Female Only</Badge>;
      default:
        return <Badge variant="outline">Both Genders</Badge>;
    }
  };

  const getAccrualMethodBadge = (method: string) => {
    const methodLabels = {
      beginning_of_year: 'Beginning of Year',
      monthly_accrual: 'Monthly',
      anniversary_based: 'Anniversary',
      custom: 'Custom'
    };

    return (
      <Badge variant="outline" className="text-xs">
        {methodLabels[method as keyof typeof methodLabels] || method}
      </Badge>
    );
  };

  const formatDays = (days: number) => {
    return `${days} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading leave types...</p>
        </div>
      </div>
    );
  }

  if (leaveTypes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No leave types found</p>
        <p className="text-sm mt-1">Create your first leave type to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-6 px-6">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Leave Type</TableHead>
              <TableHead className="w-16">Code</TableHead>
              <TableHead className="w-32">Annual Allocation</TableHead>
              <TableHead className="w-28">Accrual Method</TableHead>
              <TableHead className="w-24">Gender</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-32">Applicability</TableHead>
              <TableHead className="w-28">Documentation</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveTypes.map((leaveType) => (
              <TableRow key={leaveType.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ backgroundColor: leaveType.color_code }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{leaveType.name}</div>
                      {leaveType.description && (
                        <div className="text-sm text-muted-foreground truncate">
                          {leaveType.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    {leaveType.code}
                  </code>
                </TableCell>

                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{formatDays(leaveType.annual_allocation_days)}</div>
                    {leaveType.max_accumulation_days && (
                      <div className="text-muted-foreground">
                        Max: {formatDays(leaveType.max_accumulation_days)}
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {getAccrualMethodBadge(leaveType.accrual_method)}
                </TableCell>

                <TableCell>
                  {getGenderBadge(leaveType.gender_restriction)}
                </TableCell>

                <TableCell>
                  {getStatusBadge(leaveType.is_active)}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(leaveType.applicable_department_ids?.length || 0) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {leaveType.applicable_department_ids?.length} Depts
                      </Badge>
                    )}
                    {(leaveType.applicable_designation_ids?.length || 0) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {leaveType.applicable_designation_ids?.length} Desgs
                      </Badge>
                    )}
                    {(leaveType.employment_type_restrictions?.length || 0) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {leaveType.employment_type_restrictions?.length} Types
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {leaveType.requires_documentation ? (
                    <div className="flex items-center gap-1">
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                      {leaveType.mandatory_document_types?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {leaveType.mandatory_document_types.length} Mandatory
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      Not Required
                    </Badge>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(leaveType)}
                      className="px-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleStatus(leaveType.id, !leaveType.is_active)}
                      className="px-2"
                    >
                      {leaveType.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(leaveType.id)}
                      className="text-red-600 hover:text-red-700 px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{leaveTypes.length}</div>
            <p className="text-xs text-muted-foreground">Total Leave Types</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {leaveTypes.filter(lt => lt.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Types</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {leaveTypes.filter(lt => lt.requires_documentation).length}
            </div>
            <p className="text-xs text-muted-foreground">Require Docs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {leaveTypes.filter(lt => lt.encashment_eligible).length}
            </div>
            <p className="text-xs text-muted-foreground">Encashment Eligible</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaveTypeList;
