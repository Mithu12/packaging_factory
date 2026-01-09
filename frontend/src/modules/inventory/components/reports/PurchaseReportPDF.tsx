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
import {
  PurchaseSummary,
  SupplierPerformance,
  PurchasePayments,
} from '@/modules/inventory/services/purchase-reports-api';

// Re-export types for backwards compatibility
export type PurchaseSummaryData = PurchaseSummary;
export type SupplierPerformanceData = SupplierPerformance;
export type PurchasePaymentsData = PurchasePayments;

export interface PurchaseReportPDFProps {
  reportType: 'purchase-summary' | 'supplier-performance' | 'purchase-payments';
  dateRange?: { from?: string; to?: string };
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  purchaseSummary?: PurchaseSummary | null;
  supplierPerformance?: SupplierPerformance[];
  purchasePayments?: PurchasePayments | null;
  formatCurrency: (val: number) => string;
}

// PDF Styles (matching Sales Report design)
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
    width: '45%',
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
    width: '50%',
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D357B',
    marginBottom: 5,
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
  // Summary Section
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
  // Table Styles
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
  colNo: { width: '8%', textAlign: 'center' },
  colName: { width: '25%' },
  colCode: { width: '15%' },
  colContact: { width: '18%' },
  colOrders: { width: '10%', textAlign: 'center' },
  colValue: { width: '22%', textAlign: 'right' },
  // Payment columns
  colStatus: { width: '25%' },
  colCount: { width: '15%', textAlign: 'center' },
  colAmount: { width: '20%', textAlign: 'right' },
  colPaid: { width: '20%', textAlign: 'right' },
  colOutstanding: { width: '20%', textAlign: 'right' },
  // Section title
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
  // Footer
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
  footerPage: {
    fontSize: 8,
    color: '#1D357B',
    fontWeight: 'bold',
  },
  // Metrics row
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricItem: {
    textAlign: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D357B',
  },
  metricLabel: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 3,
  },
  // Outstanding box
  totalBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#1D357B',
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    textAlign: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 3,
  },
  outstandingBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fcd34d',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  outstandingItem: {
    textAlign: 'center',
  },
  outstandingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d97706',
  },
  outstandingLabel: {
    fontSize: 9,
    color: '#92400e',
    marginTop: 3,
  },
});

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

// Report Title Mapping
const reportTitles: Record<string, string> = {
  'purchase-summary': 'Purchase Summary Report',
  'supplier-performance': 'Supplier Performance Report',
  'purchase-payments': 'Purchase Payments Report',
};

// Main PDF Component
export const PurchaseReportPDF = ({
  reportType,
  dateRange,
  companySettings,
  logoBase64,
  purchaseSummary,
  supplierPerformance,
  purchasePayments,
  formatCurrency,
}: PurchaseReportPDFProps) => {
  const reportTitle = reportTitles[reportType] || 'Purchase Report';
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

        {/* Purchase Summary Content */}
        {reportType === 'purchase-summary' && purchaseSummary && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCardHighlight}>
                <Text style={styles.cardLabelLight}>Total Purchase Value</Text>
                <Text style={styles.cardValueLight}>{formatCurrency(purchaseSummary.total_value)}</Text>
                <Text style={styles.cardSubtext}>{purchaseSummary.total_orders} total orders</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Average Order Value</Text>
                <Text style={styles.cardValue}>{formatCurrency(purchaseSummary.avg_order_value)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Unique Suppliers</Text>
                <Text style={styles.cardValue}>{purchaseSummary.unique_suppliers}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Total Orders</Text>
                <Text style={styles.cardValue}>{purchaseSummary.total_orders}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{purchaseSummary.received_orders}</Text>
                <Text style={styles.metricLabel}>Received</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{purchaseSummary.pending_orders}</Text>
                <Text style={styles.metricLabel}>Pending</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{purchaseSummary.cancelled_orders}</Text>
                <Text style={styles.metricLabel}>Cancelled</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{formatPercentage(purchaseSummary.received_rate)}</Text>
                <Text style={styles.metricLabel}>Received Rate</Text>
              </View>
            </View>
          </>
        )}

        {/* Supplier Performance Content */}
        {reportType === 'supplier-performance' && supplierPerformance && (
          <>
            <Text style={styles.sectionTitle}>Top Suppliers by Purchase Value</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colNo]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.colName]}>Supplier Name</Text>
                <Text style={[styles.tableHeaderCell, styles.colCode]}>Code</Text>
                <Text style={[styles.tableHeaderCell, styles.colOrders]}>Orders</Text>
                <Text style={[styles.tableHeaderCell, styles.colValue]}>Total Value</Text>
                <Text style={[styles.tableHeaderCell, styles.colValue]}>Avg Order</Text>
              </View>
              {supplierPerformance.slice(0, 15).map((supplier, index) => (
                <View key={supplier.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
                  <Text style={[styles.tableCellBold, styles.colName]}>{supplier.name}</Text>
                  <Text style={[styles.tableCell, styles.colCode]}>{supplier.supplier_code}</Text>
                  <Text style={[styles.tableCell, styles.colOrders]}>{supplier.total_orders}</Text>
                  <Text style={[styles.tableCellBold, styles.colValue]}>{formatCurrency(supplier.total_purchase_value)}</Text>
                  <Text style={[styles.tableCell, styles.colValue]}>{formatCurrency(supplier.avg_purchase_value)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Purchase Payments Content */}
        {reportType === 'purchase-payments' && purchasePayments && (
          <>
            <Text style={styles.sectionTitle}>Payment Status Distribution</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>Count</Text>
                <Text style={[styles.tableHeaderCell, styles.colAmount]}>Total Amount</Text>
                <Text style={[styles.tableHeaderCell, styles.colPaid]}>Paid</Text>
                <Text style={[styles.tableHeaderCell, styles.colOutstanding]}>Outstanding</Text>
              </View>
              {purchasePayments.status_distribution.map((status, index) => (
                <View key={status.status} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, styles.colStatus]}>{status.status.toUpperCase()}</Text>
                  <Text style={[styles.tableCell, styles.colCount]}>{status.count}</Text>
                  <Text style={[styles.tableCell, styles.colAmount]}>{formatCurrency(status.total_amount)}</Text>
                  <Text style={[styles.tableCell, styles.colPaid]}>{formatCurrency(status.paid_amount)}</Text>
                  <Text style={[styles.tableCellBold, styles.colOutstanding]}>{formatCurrency(status.outstanding_amount)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Payment Totals</Text>
            <View style={styles.totalBox}>
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{purchasePayments.totals.total_invoices}</Text>
                <Text style={styles.totalLabel}>Total Invoices</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{formatCurrency(purchasePayments.totals.total_amount)}</Text>
                <Text style={styles.totalLabel}>Total Amount</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>{formatCurrency(purchasePayments.totals.total_paid)}</Text>
                <Text style={styles.totalLabel}>Total Paid</Text>
              </View>
            </View>
            
            <View style={styles.outstandingBox}>
              <View style={styles.outstandingItem}>
                <Text style={styles.outstandingValue}>{formatCurrency(purchasePayments.totals.total_outstanding)}</Text>
                <Text style={styles.outstandingLabel}>Total Outstanding Amount</Text>
              </View>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {companySettings?.company_name || 'ERP System'} | Confidential Report
          </Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default PurchaseReportPDF;
