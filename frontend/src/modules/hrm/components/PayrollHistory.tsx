"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Filter,
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Receipt
} from 'lucide-react';
import { PayrollHistoryProps } from '../types';
import { getPaymentMethodOptions, getPaymentStatusOptions } from '../data/payroll-data';

const PayrollHistory: React.FC<PayrollHistoryProps> = ({
  payrollRecords,
  paymentRecords,
  employees,
  departments,
  filters,
  onFilterChange,
  onExport,
  loading = false,
  currency = "USD"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterData, setFilterData] = useState({
    department_ids: filters?.department_ids || [],
    payment_status: filters?.payment_status || [],
    date_from: filters?.date_from || '',
    date_to: filters?.date_to || '',
    min_salary: filters?.min_salary || 0,
    max_salary: filters?.max_salary || 0,
    search_term: filters?.search_term || ''
  });

  const paymentMethodOptions = getPaymentMethodOptions();
  const paymentStatusOptions = getPaymentStatusOptions();

  // Filter and search logic
  const filteredPaymentRecords = paymentRecords.filter(payment => {
    const employee = employees.find(emp => emp.id === payment.employee_id);
    const payrollRecord = payrollRecords.find(pr => pr.id === payment.payroll_record_id);

    // Search filter
    const matchesSearch = !searchTerm &&
      (!filterData.search_term ||
       employee?.full_name?.toLowerCase().includes(filterData.search_term.toLowerCase()) ||
       employee?.employee_id?.toLowerCase().includes(filterData.search_term.toLowerCase()) ||
       payment.transaction_reference?.toLowerCase().includes(filterData.search_term.toLowerCase()));

    // Department filter
    const matchesDepartment = filterData.department_ids.length === 0 ||
      (employee?.department_id && filterData.department_ids.includes(employee.department_id));

    // Payment status filter
    const matchesStatus = filterData.payment_status.length === 0 ||
      filterData.payment_status.includes(payment.status);

    // Date range filter
    const paymentDate = new Date(payment.payment_date);
    const fromDate = filterData.date_from ? new Date(filterData.date_from) : null;
    const toDate = filterData.date_to ? new Date(filterData.date_to) : null;
    const matchesDateRange = (!fromDate || paymentDate >= fromDate) &&
                            (!toDate || paymentDate <= toDate);

    // Salary range filter
    const netSalary = payrollRecord?.net_salary || 0;
    const matchesSalaryRange = (!filterData.min_salary || netSalary >= filterData.min_salary) &&
                              (!filterData.max_salary || netSalary <= filterData.max_salary);

    return matchesSearch && matchesDepartment && matchesStatus && matchesDateRange && matchesSalaryRange;
  });

  const handleFilterChange = (field: string, value: any) => {
    const updatedFilters = { ...filterData, [field]: value };
    setFilterData(updatedFilters);

    if (onFilterChange) {
      onFilterChange({
        department_ids: updatedFilters.department_ids,
        payment_status: updatedFilters.payment_status,
        date_from: updatedFilters.date_from,
        date_to: updatedFilters.date_to,
        min_salary: updatedFilters.min_salary,
        max_salary: updatedFilters.max_salary,
        search_term: updatedFilters.search_term
      });
    }
  };

  const handleDepartmentFilter = (departmentId: number, checked: boolean) => {
    const updated = checked
      ? [...filterData.department_ids, departmentId]
      : filterData.department_ids.filter(id => id !== departmentId);
    handleFilterChange('department_ids', updated);
  };

  const handleStatusFilter = (status: string, checked: boolean) => {
    const updated = checked
      ? [...filterData.payment_status, status]
      : filterData.payment_status.filter(s => s !== status);
    handleFilterChange('payment_status', updated);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (onExport) {
      onExport(format);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodLabels = {
      bank_transfer: 'Bank Transfer',
      check: 'Check',
      cash: 'Cash',
      other: 'Other'
    };

    return (
      <Badge variant="outline" className="text-xs">
        {methodLabels[method as keyof typeof methodLabels] || method}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateSummaryStats = () => {
    const total = filteredPaymentRecords.length;
    const completed = filteredPaymentRecords.filter(p => p.status === 'completed').length;
    const pending = filteredPaymentRecords.filter(p => p.status === 'pending').length;
    const failed = filteredPaymentRecords.filter(p => p.status === 'failed').length;
    const totalAmount = filteredPaymentRecords
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return { total, completed, pending, failed, totalAmount };
  };

  const summaryStats = calculateSummaryStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{summaryStats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{summaryStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{summaryStats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summaryStats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by employee name, ID, or transaction reference..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange('search_term', e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={filterData.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={filterData.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>

            {/* Salary Range */}
            <div className="space-y-2">
              <Label htmlFor="min_salary">Min Salary</Label>
              <Input
                id="min_salary"
                type="number"
                value={filterData.min_salary || ''}
                onChange={(e) => handleFilterChange('min_salary', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_salary">Max Salary</Label>
              <Input
                id="max_salary"
                type="number"
                value={filterData.max_salary || ''}
                onChange={(e) => handleFilterChange('max_salary', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Department Filters */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Departments</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept.id}`}
                    checked={filterData.department_ids.includes(dept.id)}
                    onCheckedChange={(checked) => handleDepartmentFilter(dept.id, checked as boolean)}
                  />
                  <Label htmlFor={`dept-${dept.id}`} className="text-sm">
                    {dept.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Status Filters */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Payment Status</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {paymentStatusOptions.map(status => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filterData.payment_status.includes(status.value)}
                    onCheckedChange={(checked) => handleStatusFilter(status.value, checked as boolean)}
                  />
                  <Label htmlFor={`status-${status.value}`} className="text-sm">
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {filteredPaymentRecords.length} of {paymentRecords.length} records
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            Detailed payment history and transaction records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPaymentRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment records found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaymentRecords.map((payment) => {
                    const employee = employees.find(emp => emp.id === payment.employee_id);
                    const payrollRecord = payrollRecords.find(pr => pr.id === payment.payroll_record_id);

                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee?.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.employee_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(payment.amount)}
                          </div>
                          {payrollRecord && (
                            <div className="text-xs text-muted-foreground">
                              Net: {formatCurrency(payrollRecord.net_salary)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodBadge(payment.payment_method)}
                        </TableCell>
                        <TableCell>
                          {formatDate(payment.payment_date)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs">
                            {payment.transaction_reference || payment.check_number || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
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
    </div>
  );
};

export default PayrollHistory;
