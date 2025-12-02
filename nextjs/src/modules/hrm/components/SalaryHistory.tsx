"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Search, Filter, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { SalaryHistoryProps } from '../types';

const SalaryHistory: React.FC<SalaryHistoryProps> = ({
  history,
  employees,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  // Filter and sort history
  const filteredHistory = history
    .filter(record => {
      const employee = employees.find(emp => emp.id === record.employee_id);
      const matchesSearch = !searchTerm ||
        employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || record.action_type === filterType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime();
        case 'amount':
          return b.change_amount - a.change_amount;
        case 'employee':
          const empA = employees.find(emp => emp.id === a.employee_id);
          const empB = employees.find(emp => emp.id === b.employee_id);
          return (empA?.full_name || '').localeCompare(empB?.full_name || '');
        default:
          return 0;
      }
    });

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'increment':
        return 'default';
      case 'promotion':
        return 'secondary';
      case 'adjustment':
        return 'outline';
      case 'initial':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'increment':
        return <TrendingUp className="h-3 w-3" />;
      case 'promotion':
        return <ArrowUpDown className="h-3 w-3" />;
      case 'adjustment':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading salary history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name, ID, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="increment">Increment</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="initial">Initial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Change History</CardTitle>
          <CardDescription>
            {filteredHistory.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No salary history records found</p>
              {searchTerm && (
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Action Type</TableHead>
                    <TableHead>Previous Salary</TableHead>
                    <TableHead>New Salary</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((record) => {
                    const employee = employees.find(emp => emp.id === record.employee_id);
                    const changeColor = record.change_amount >= 0 ? 'text-green-600' : 'text-red-600';

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee?.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.employee_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getActionBadgeVariant(record.action_type)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getActionIcon(record.action_type)}
                            {record.action_type.charAt(0).toUpperCase() + record.action_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.previous_salary ? formatCurrency(record.previous_salary) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(record.new_salary)}
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${changeColor}`}>
                            {record.change_amount >= 0 ? '+' : ''}
                            {formatCurrency(record.change_amount)}
                          </div>
                          {record.change_percentage && (
                            <div className={`text-sm ${changeColor}`}>
                              ({record.change_percentage >= 0 ? '+' : ''}
                              {record.change_percentage.toFixed(2)}%)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDate(record.effective_date)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={record.reason}>
                            {record.reason || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {employee?.full_name || 'System'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(record.created_at)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {filteredHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{filteredHistory.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Salary Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-600">
                +{formatCurrency(filteredHistory.reduce((sum, record) => sum + record.change_amount, 0))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Change
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  filteredHistory.reduce((sum, record) => sum + record.change_amount, 0) / filteredHistory.length
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Most Recent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-bold">
                {formatDate(filteredHistory[0]?.effective_date)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SalaryHistory;
