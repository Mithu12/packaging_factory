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

// Types for report data
export interface SalesSummaryData {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  unique_customers: number;
  paid_orders: number;
  completed_orders: number;
  payment_rate: number;
  completion_rate: number;
}

export interface CustomerPerformanceData {
  id: number;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  last_order_date: string;
}

export interface PaymentMethodData {
  method: string;
  order_count: number;
  total_amount: number;
}

export interface PaymentAnalysisData {
  payment_methods: PaymentMethodData[];
  outstanding_payments: {
    total_outstanding: number;
    outstanding_orders: number;
  };
}

export interface OrderStatusData {
  status: string;
  order_count: number;
  total_amount: number;
}

export interface OrderFulfillmentData {
  status_distribution: OrderStatusData[];
  fulfillment_metrics: {
    avg_fulfillment_days: number;
    total_orders: number;
    completed_orders: number;
    fulfillment_rate: number;
  };
}

// Sales Order type for detailed report
export interface SalesOrderData {
  id: number;
  order_number: string;
  order_date: string;
  customer_name: string;
  product_count: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  cash_received: number;
}

// Returns Analysis types
export interface ReturnsReasonData {
  reason: string;
  return_count: number;
  total_amount: number;
}

export interface ReturnsAnalysisData {
  summary: {
    total_returns: number;
    total_refund_amount: number;
    avg_refund_amount: number;
    return_rate: number;
  };
  reasons_distribution: ReturnsReasonData[];
}

export interface SalesReportPDFProps {
  reportType: 'sales-summary' | 'sales-details' | 'customer-performance' | 'payment-analysis' | 'order-fulfillment' | 'returns-analysis';
  dateRange?: { from?: string; to?: string };
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  salesSummary?: SalesSummaryData | null;
  salesOrders?: SalesOrderData[];
  salesOrdersTotal?: number;
  customerPerformance?: CustomerPerformanceData[];
  paymentAnalysis?: PaymentAnalysisData | null;
  orderFulfillment?: OrderFulfillmentData | null;
  returnsAnalysis?: ReturnsAnalysisData | null;
  formatCurrency: (val: number) => string;
}

// PDF Styles
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
  // Column widths for different tables
  colNo: { width: '8%', textAlign: 'center' },
  colName: { width: '25%' },
  colCode: { width: '15%' },
  colEmail: { width: '22%' },
  colOrders: { width: '10%', textAlign: 'center' },
  colRevenue: { width: '20%', textAlign: 'right' },
  // Payment table columns
  colMethod: { width: '40%' },
  colCount: { width: '25%', textAlign: 'center' },
  colAmount: { width: '35%', textAlign: 'right' },
  // Status table columns
  colStatus: { width: '40%' },
  // Sales Details table columns
  colInvoice: { width: '12%' },
  colDate: { width: '10%' },
  colCustomer: { width: '18%' },
  colItems: { width: '8%', textAlign: 'center' },
  colSubtotal: { width: '11%', textAlign: 'right' },
  colDiscount: { width: '11%', textAlign: 'right' },
  colTotal: { width: '11%', textAlign: 'right' },
  colPaid: { width: '10%', textAlign: 'right' },
  colDue: { width: '9%', textAlign: 'right' },
  // Returns table columns
  colReason: { width: '50%' },
  colReturns: { width: '20%', textAlign: 'center' },
  colRefund: { width: '30%', textAlign: 'right' },
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
  // Totals row for sales details
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
  // Grand total box
  grandTotalBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#1D357B',
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  grandTotalItem: {
    textAlign: 'center',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  grandTotalLabel: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 3,
  },
  // Returns box
  returnsBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef2f2',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  returnsItem: {
    textAlign: 'center',
  },
  returnsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  returnsLabel: {
    fontSize: 9,
    color: '#991b1b',
    marginTop: 3,
  },
  // Due amount style
  dueText: {
    color: '#dc2626',
  },
  paidText: {
    color: '#16a34a',
  },
});

// Helper function
const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

// Report Title Mapping
const reportTitles: Record<string, string> = {
  'sales-summary': 'Sales Summary Report',
  'sales-details': 'Sales Details Report',
  'customer-performance': 'Customer Performance Report',
  'payment-analysis': 'Payment Analysis Report',
  'order-fulfillment': 'Order Fulfillment Report',
  'returns-analysis': 'Returns Analysis Report',
};

// Main PDF Component
export const SalesReportPDF = ({
  reportType,
  dateRange,
  companySettings,
  logoBase64,
  salesSummary,
  salesOrders = [],
  salesOrdersTotal = 0,
  customerPerformance,
  paymentAnalysis,
  orderFulfillment,
  returnsAnalysis,
  formatCurrency,
}: SalesReportPDFProps) => {
  const reportTitle = reportTitles[reportType] || 'Sales Report';
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate totals for sales orders
  const calculateTotals = () => {
    return salesOrders.reduce(
      (acc, order) => {
        const subtotal = Number(order.subtotal) || 0;
        const discount = Number(order.discount_amount) || 0;
        const total = Number(order.total_amount) || 0;
        const paid = Number(order.cash_received) || 0;
        const due = total - paid;
        
        return {
          subtotal: acc.subtotal + subtotal,
          discount: acc.discount + discount,
          total: acc.total + total,
          paid: acc.paid + paid,
          due: acc.due + due,
          items: acc.items + (order.product_count || 0),
        };
      },
      { subtotal: 0, discount: 0, total: 0, paid: 0, due: 0, items: 0 }
    );
  };

  const totals = calculateTotals();

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

        {/* Sales Summary Content */}
        {reportType === 'sales-summary' && salesSummary && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCardHighlight}>
                <Text style={styles.cardLabelLight}>Total Revenue</Text>
                <Text style={styles.cardValueLight}>{formatCurrency(salesSummary.total_revenue)}</Text>
                <Text style={styles.cardSubtext}>{salesSummary.total_orders} total orders</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Average Order Value</Text>
                <Text style={styles.cardValue}>{formatCurrency(salesSummary.avg_order_value)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Unique Customers</Text>
                <Text style={styles.cardValue}>{salesSummary.unique_customers}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Total Orders</Text>
                <Text style={styles.cardValue}>{salesSummary.total_orders}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{salesSummary.paid_orders}</Text>
                <Text style={styles.metricLabel}>Paid Orders</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{formatPercentage(salesSummary.payment_rate)}</Text>
                <Text style={styles.metricLabel}>Payment Rate</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{salesSummary.completed_orders}</Text>
                <Text style={styles.metricLabel}>Completed Orders</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{formatPercentage(salesSummary.completion_rate)}</Text>
                <Text style={styles.metricLabel}>Completion Rate</Text>
              </View>
            </View>
          </>
        )}

        {/* Sales Details Content */}
        {reportType === 'sales-details' && salesOrders && salesOrders.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sales Orders ({salesOrdersTotal} total)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colInvoice]}>Invoice No</Text>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
                <Text style={[styles.tableHeaderCell, styles.colCustomer]}>Customer</Text>
                <Text style={[styles.tableHeaderCell, styles.colItems]}>Items</Text>
                <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
                <Text style={[styles.tableHeaderCell, styles.colDiscount]}>Discount</Text>
                <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
                <Text style={[styles.tableHeaderCell, styles.colPaid]}>Paid</Text>
                <Text style={[styles.tableHeaderCell, styles.colDue]}>Due</Text>
              </View>
              {salesOrders.map((order, index) => {
                const subtotal = Number(order.subtotal) || 0;
                const discount = Number(order.discount_amount) || 0;
                const total = Number(order.total_amount) || 0;
                const paid = Number(order.cash_received) || 0;
                const due = total - paid;

                return (
                  <View key={order.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCellBold, styles.colInvoice]}>{order.order_number}</Text>
                    <Text style={[styles.tableCell, styles.colDate]}>{formatDate(order.order_date)}</Text>
                    <Text style={[styles.tableCell, styles.colCustomer]}>{order.customer_name || 'Walk-in'}</Text>
                    <Text style={[styles.tableCell, styles.colItems]}>{order.product_count || 0}</Text>
                    <Text style={[styles.tableCell, styles.colSubtotal]}>{formatCurrency(subtotal)}</Text>
                    <Text style={[styles.tableCell, styles.colDiscount]}>{formatCurrency(discount)}</Text>
                    <Text style={[styles.tableCellBold, styles.colTotal]}>{formatCurrency(total)}</Text>
                    <Text style={[styles.tableCell, styles.paidText, styles.colPaid]}>{formatCurrency(paid)}</Text>
                    <Text style={[styles.tableCellBold, due > 0 ? styles.dueText : styles.paidText, styles.colDue]}>
                      {formatCurrency(due)}
                    </Text>
                  </View>
                );
              })}
              {/* Totals Row */}
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsCell, styles.colInvoice]}>TOTAL</Text>
                <Text style={[styles.totalsCell, styles.colDate]}></Text>
                <Text style={[styles.totalsCell, styles.colCustomer]}>{salesOrders.length} orders</Text>
                <Text style={[styles.totalsCell, styles.colItems]}>{totals.items}</Text>
                <Text style={[styles.totalsCell, styles.colSubtotal]}>{formatCurrency(totals.subtotal)}</Text>
                <Text style={[styles.totalsCell, styles.colDiscount]}>{formatCurrency(totals.discount)}</Text>
                <Text style={[styles.totalsCell, styles.colTotal]}>{formatCurrency(totals.total)}</Text>
                <Text style={[styles.totalsCell, styles.colPaid]}>{formatCurrency(totals.paid)}</Text>
                <Text style={[styles.totalsCell, styles.colDue]}>{formatCurrency(totals.due)}</Text>
              </View>
            </View>

            {/* Grand Totals Box */}
            <View style={styles.grandTotalBox}>
              <View style={styles.grandTotalItem}>
                <Text style={styles.grandTotalValue}>{formatCurrency(totals.total)}</Text>
                <Text style={styles.grandTotalLabel}>Total Sales</Text>
              </View>
              <View style={styles.grandTotalItem}>
                <Text style={styles.grandTotalValue}>{formatCurrency(totals.paid)}</Text>
                <Text style={styles.grandTotalLabel}>Total Collected</Text>
              </View>
              <View style={styles.grandTotalItem}>
                <Text style={styles.grandTotalValue}>{formatCurrency(totals.due)}</Text>
                <Text style={styles.grandTotalLabel}>Total Due</Text>
              </View>
              <View style={styles.grandTotalItem}>
                <Text style={styles.grandTotalValue}>{formatCurrency(totals.discount)}</Text>
                <Text style={styles.grandTotalLabel}>Total Discount</Text>
              </View>
            </View>
          </>
        )}

        {/* Customer Performance Content */}
        {reportType === 'customer-performance' && customerPerformance && (
          <>
            <Text style={styles.sectionTitle}>Top Customers by Revenue</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colNo]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.colName]}>Customer Name</Text>
                <Text style={[styles.tableHeaderCell, styles.colCode]}>Code</Text>
                <Text style={[styles.tableHeaderCell, styles.colOrders]}>Orders</Text>
                <Text style={[styles.tableHeaderCell, styles.colRevenue]}>Total Revenue</Text>
                <Text style={[styles.tableHeaderCell, styles.colRevenue]}>Avg Order</Text>
              </View>
              {customerPerformance.slice(0, 15).map((customer, index) => (
                <View key={customer.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
                  <Text style={[styles.tableCellBold, styles.colName]}>{customer.name}</Text>
                  <Text style={[styles.tableCell, styles.colCode]}>{customer.customer_code}</Text>
                  <Text style={[styles.tableCell, styles.colOrders]}>{customer.total_orders}</Text>
                  <Text style={[styles.tableCellBold, styles.colRevenue]}>{formatCurrency(customer.total_revenue)}</Text>
                  <Text style={[styles.tableCell, styles.colRevenue]}>{formatCurrency(customer.avg_order_value)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Payment Analysis Content */}
        {reportType === 'payment-analysis' && paymentAnalysis && (
          <>
            <Text style={styles.sectionTitle}>Payment Methods Breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colMethod]}>Payment Method</Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>Order Count</Text>
                <Text style={[styles.tableHeaderCell, styles.colAmount]}>Total Amount</Text>
              </View>
              {paymentAnalysis.payment_methods.map((method, index) => (
                <View key={method.method} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, styles.colMethod]}>{method.method}</Text>
                  <Text style={[styles.tableCell, styles.colCount]}>{method.order_count}</Text>
                  <Text style={[styles.tableCellBold, styles.colAmount]}>{formatCurrency(method.total_amount)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Outstanding Payments</Text>
            <View style={styles.outstandingBox}>
              <View style={styles.outstandingItem}>
                <Text style={styles.outstandingValue}>
                  {formatCurrency(paymentAnalysis.outstanding_payments.total_outstanding)}
                </Text>
                <Text style={styles.outstandingLabel}>Total Outstanding</Text>
              </View>
              <View style={styles.outstandingItem}>
                <Text style={styles.outstandingValue}>
                  {paymentAnalysis.outstanding_payments.outstanding_orders}
                </Text>
                <Text style={styles.outstandingLabel}>Outstanding Orders</Text>
              </View>
            </View>
          </>
        )}

        {/* Order Fulfillment Content */}
        {reportType === 'order-fulfillment' && orderFulfillment && (
          <>
            <Text style={styles.sectionTitle}>Order Status Distribution</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderCell, styles.colCount]}>Order Count</Text>
                <Text style={[styles.tableHeaderCell, styles.colAmount]}>Total Amount</Text>
              </View>
              {orderFulfillment.status_distribution.map((status, index) => (
                <View key={status.status} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, styles.colStatus]}>{status.status.toUpperCase()}</Text>
                  <Text style={[styles.tableCell, styles.colCount]}>{status.order_count}</Text>
                  <Text style={[styles.tableCellBold, styles.colAmount]}>{formatCurrency(status.total_amount)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Fulfillment Metrics</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {orderFulfillment.fulfillment_metrics.avg_fulfillment_days.toFixed(1)} days
                </Text>
                <Text style={styles.metricLabel}>Avg Fulfillment Time</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{orderFulfillment.fulfillment_metrics.total_orders}</Text>
                <Text style={styles.metricLabel}>Total Orders</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{orderFulfillment.fulfillment_metrics.completed_orders}</Text>
                <Text style={styles.metricLabel}>Completed Orders</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {formatPercentage(orderFulfillment.fulfillment_metrics.fulfillment_rate)}
                </Text>
                <Text style={styles.metricLabel}>Fulfillment Rate</Text>
              </View>
            </View>
          </>
        )}

        {/* Returns Analysis Content */}
        {reportType === 'returns-analysis' && returnsAnalysis && (
          <>
            <Text style={styles.sectionTitle}>Returns Summary</Text>
            <View style={styles.returnsBox}>
              <View style={styles.returnsItem}>
                <Text style={styles.returnsValue}>{returnsAnalysis.summary.total_returns}</Text>
                <Text style={styles.returnsLabel}>Total Returns</Text>
              </View>
              <View style={styles.returnsItem}>
                <Text style={styles.returnsValue}>{formatCurrency(returnsAnalysis.summary.total_refund_amount)}</Text>
                <Text style={styles.returnsLabel}>Total Refunds</Text>
              </View>
              <View style={styles.returnsItem}>
                <Text style={styles.returnsValue}>{formatCurrency(returnsAnalysis.summary.avg_refund_amount)}</Text>
                <Text style={styles.returnsLabel}>Avg Refund</Text>
              </View>
              <View style={styles.returnsItem}>
                <Text style={styles.returnsValue}>{formatPercentage(returnsAnalysis.summary.return_rate)}</Text>
                <Text style={styles.returnsLabel}>Return Rate</Text>
              </View>
            </View>

            {returnsAnalysis.reasons_distribution && returnsAnalysis.reasons_distribution.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Return Reasons Breakdown</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.colReason]}>Reason</Text>
                    <Text style={[styles.tableHeaderCell, styles.colReturns]}>Returns</Text>
                    <Text style={[styles.tableHeaderCell, styles.colRefund]}>Total Amount</Text>
                  </View>
                  {returnsAnalysis.reasons_distribution.map((reason, index) => (
                    <View key={reason.reason || index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={[styles.tableCellBold, styles.colReason]}>{reason.reason || 'Not Specified'}</Text>
                      <Text style={[styles.tableCell, styles.colReturns]}>{reason.return_count}</Text>
                      <Text style={[styles.tableCellBold, styles.colRefund]}>{formatCurrency(reason.total_amount)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
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

export default SalesReportPDF;

