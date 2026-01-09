"use client";

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { CompanySettings } from '@/services/settings-types';
import { Expense, ExpenseStats } from '@/services/types';

export interface ExpenseReportPDFProps {
  reportType: 'expense-summary' | 'expense-details' | 'category-analysis';
  dateRange?: { from?: string; to?: string };
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  expenseStats?: ExpenseStats | null;
  expenses?: Expense[];
  expensesTotal?: number;
  formatCurrency: (val: number) => string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1D357B',
    paddingBottom: 15,
  },
  logoSection: {
    width: '38%',
  },
  logo: {
    width: 120,
    height: 'auto',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D357B',
  },
  companyInfo: {
    fontSize: 8,
    color: '#666',
    marginTop: 3,
  },
  titleSection: {
    textAlign: 'right',
    width: '60%',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D357B',
    marginBottom: 5,
    lineHeight: 1.1,
  },
  reportSubtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 9,
    color: '#333',
    marginTop: 5,
    backgroundColor: '#f3f4f6',
    padding: 5,
    borderRadius: 3,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  summaryCardHighlight: {
    width: '48%',
    padding: 15,
    backgroundColor: '#1D357B',
    borderRadius: 5,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 5,
  },
  cardLabelLight: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cardValueLight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardSubtext: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 3,
  },
  table: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1D357B',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  tableCellBold: {
    fontSize: 9,
    color: '#111827',
    fontWeight: 'bold',
  },
  // Column widths
  colNo: { width: '15%' },
  colDate: { width: '15%' },
  colCategory: { width: '20%' },
  colAmount: { width: '20%', textAlign: 'right' },
  colStatus: { width: '15%', textAlign: 'center' },
  colVendor: { width: '15%' },
  
  colCatName: { width: '40%' },
  colCount: { width: '20%', textAlign: 'center' },
  colTotalAmount: { width: '40%', textAlign: 'right' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1D357B',
    marginTop: 25,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#666',
  },
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#1D357B',
    alignItems: 'center',
  },
  totalsCell: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const reportTitles: Record<string, string> = {
  'expense-summary': 'Expense Summary Report',
  'expense-details': 'Detailed Expense Report',
  'category-analysis': 'Category-wise Expense Analysis',
};

export const ExpenseReportPDF = ({
  reportType,
  dateRange,
  companySettings,
  logoBase64,
  expenseStats,
  expenses = [],
  expensesTotal = 0,
  formatCurrency,
}: ExpenseReportPDFProps) => {
  const reportTitle = reportTitles[reportType] || 'Expense Report';
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document title={reportTitle}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>
                {companySettings?.company_name || 'ERP System'}
              </Text>
            )}
            <Text style={styles.companyInfo}>
              {companySettings?.company_address || ''}
            </Text>
            <Text style={styles.companyInfo}>
              {companySettings?.phone || ''} | {companySettings?.company_email || ''}
            </Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
            {dateRange && (dateRange.from || dateRange.to) && (
              <Text style={styles.dateRange}>
                Period: {dateRange.from || 'Start'} to {dateRange.to || 'Present'}
              </Text>
            )}
          </View>
        </View>

        {/* Expense Summary Content */}
        {reportType === 'expense-summary' && expenseStats && (
          <>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCardHighlight}>
                <Text style={styles.cardLabelLight}>Total Expenses</Text>
                <Text style={styles.cardValueLight}>{formatCurrency(expenseStats.total_amount)}</Text>
                <Text style={styles.cardSubtext}>{expenseStats.total_expenses} total requests</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Paid Amount</Text>
                <Text style={styles.cardValue}>{formatCurrency(expenseStats.paid_amount)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Pending Approval</Text>
                <Text style={styles.cardValue}>{formatCurrency(expenseStats.pending_amount)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Approved (Unpaid)</Text>
                <Text style={styles.cardValue}>{formatCurrency(expenseStats.approved_amount)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Status Distribution</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'center' }]}>Count</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Amount</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '40%' }]}>Paid</Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'center' }]}>{expenseStats.paid_expenses}</Text>
                <Text style={[styles.tableCellBold, { width: '30%', textAlign: 'right' }]}>{formatCurrency(expenseStats.paid_amount)}</Text>
              </View>
              <View style={styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: '40%' }]}>Pending</Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'center' }]}>{expenseStats.pending_expenses}</Text>
                <Text style={[styles.tableCellBold, { width: '30%', textAlign: 'right' }]}>{formatCurrency(expenseStats.pending_amount)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '40%' }]}>Approved</Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'center' }]}>{expenseStats.approved_expenses}</Text>
                <Text style={[styles.tableCellBold, { width: '30%', textAlign: 'right' }]}>{formatCurrency(expenseStats.approved_amount)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Expense Details Content */}
        {reportType === 'expense-details' && expenses && expenses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Expense Transaction Details</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, colStyles.colDate]}>Date</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colNo]}>Expense #</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colVendor]}>Title / Vendor</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colCategory]}>Category</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colAmount]}>Amount</Text>
              </View>
              {expenses.map((expense, index) => (
                <View key={expense.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, colStyles.colDate]}>{formatDate(expense.expense_date)}</Text>
                  <Text style={[styles.tableCellBold, colStyles.colNo]}>{expense.expense_number}</Text>
                  <View style={colStyles.colVendor}>
                    <Text style={styles.tableCellBold}>{expense.title}</Text>
                    <Text style={{ fontSize: 7, color: '#666' }}>{expense.vendor_name || 'N/A'}</Text>
                  </View>
                  <Text style={[styles.tableCell, colStyles.colCategory]}>{expense.category_name}</Text>
                  <View style={colStyles.colStatus}>
                    <Text style={[styles.tableCell, { color: getStatusColor(expense.status), fontWeight: 'bold' }]}>
                      {expense.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.tableCellBold, colStyles.colAmount]}>{formatCurrency(expense.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Category Analysis Content */}
        {reportType === 'category-analysis' && expenseStats?.top_categories && (
          <>
            <Text style={styles.sectionTitle}>Category-wise Spending Analysis</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colCatName]}>Expense Category</Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>Count</Text>
                <Text style={[styles.tableHeaderCell, styles.colTotalAmount]}>Total Spend</Text>
              </View>
              {expenseStats.top_categories.map((cat, index) => (
                <View key={cat.category_id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, styles.colCatName]}>{cat.category_name}</Text>
                  <Text style={[styles.tableCell, styles.colCount]}>{cat.count}</Text>
                  <Text style={[styles.tableCellBold, styles.colTotalAmount]}>{formatCurrency(cat.total_amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            ERP System - Expense Management Module
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

const colStyles = StyleSheet.create({
  colDate: { width: '12%' },
  colNo: { width: '15%' },
  colVendor: { width: '28%' },
  colCategory: { width: '18%' },
  colStatus: { width: '12%', textAlign: 'center' },
  colAmount: { width: '15%', textAlign: 'right' },
});

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid': return '#16a34a';
    case 'approved': return '#0284c7';
    case 'pending': return '#d97706';
    case 'rejected': return '#dc2626';
    default: return '#666';
  }
};
