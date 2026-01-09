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
import { Payment, Invoice, PaymentStats } from '@/services/types';

export interface SupplierPaymentsReportPDFProps {
  reportType: 'payments-summary' | 'payments-details' | 'invoices-outstanding';
  dateRange?: { from?: string; to?: string };
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  paymentStats?: PaymentStats | null;
  payments?: Payment[];
  invoices?: Invoice[];
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
  logoSection: { width: '38%' },
  logo: { width: 120, height: 'auto', marginBottom: 5 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#1D357B' },
  companyInfo: { fontSize: 8, color: '#666', marginTop: 3 },
  titleSection: { textAlign: 'right', width: '60%' },
  reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D357B', marginBottom: 5, lineHeight: 1.1 },
  reportSubtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  dateRange: { fontSize: 9, color: '#333', marginTop: 5, backgroundColor: '#f3f4f6', padding: 5, borderRadius: 3 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, gap: 10 },
  summaryCard: { width: '48%', padding: 15, backgroundColor: '#f8fafc', borderRadius: 5, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  summaryCardHighlight: { width: '48%', padding: 15, backgroundColor: '#1D357B', borderRadius: 5, marginBottom: 10 },
  cardLabel: { fontSize: 9, color: '#64748b', marginBottom: 5 },
  cardLabelLight: { fontSize: 9, color: '#94a3b8', marginBottom: 5 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  cardValueLight: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  cardSubtext: { fontSize: 8, color: '#94a3b8', marginTop: 3 },
  table: { marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1D357B', paddingVertical: 10, paddingHorizontal: 8 },
  tableHeaderCell: { color: '#ffffff', fontSize: 9, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 9, color: '#374151' },
  tableCellBold: { fontSize: 9, color: '#111827', fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1D357B', marginTop: 25, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#666' },
});

const colStyles = StyleSheet.create({
  colDate: { width: '12%' },
  colNo: { width: '15%' },
  colSupplier: { width: '25%' },
  colMethod: { width: '15%' },
  colStatus: { width: '13%', textAlign: 'center' },
  colAmount: { width: '20%', textAlign: 'right' },
});

const invoiceColStyles = StyleSheet.create({
  colNo: { width: '15%' },
  colSupplier: { width: '25%' },
  colDate: { width: '12%' },
  colDue: { width: '12%' },
  colTotal: { width: '12%', textAlign: 'right' },
  colPaid: { width: '12%', textAlign: 'right' },
  colOutstanding: { width: '12%', textAlign: 'right' },
});

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const reportTitles: Record<string, string> = {
  'payments-summary': 'Supplier Payments Summary',
  'payments-details': 'Detailed Payment Transactions',
  'invoices-outstanding': 'Outstanding Invoices Report',
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': case 'paid': return '#16a34a';
    case 'partial': case 'pending': return '#d97706';
    case 'overdue': case 'failed': return '#dc2626';
    default: return '#666';
  }
};

export const SupplierPaymentsReportPDF = ({
  reportType,
  dateRange,
  companySettings,
  logoBase64,
  paymentStats,
  payments = [],
  invoices = [],
  formatCurrency,
}: SupplierPaymentsReportPDFProps) => {
  const reportTitle = reportTitles[reportType] || 'Supplier Payments Report';
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
              <Text style={styles.companyName}>{companySettings?.company_name || 'ERP System'}</Text>
            )}
            <Text style={styles.companyInfo}>{companySettings?.company_address || ''}</Text>
            <Text style={styles.companyInfo}>{companySettings?.phone || ''} | {companySettings?.company_email || ''}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
            {dateRange && (dateRange.from || dateRange.to) && (
              <Text style={styles.dateRange}>Period: {dateRange.from || 'Start'} to {dateRange.to || 'Present'}</Text>
            )}
          </View>
        </View>

        {/* Payments Summary */}
        {reportType === 'payments-summary' && paymentStats && (
          <>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCardHighlight}>
                <Text style={styles.cardLabelLight}>Total Paid</Text>
                <Text style={styles.cardValueLight}>{formatCurrency(paymentStats.total_paid_amount)}</Text>
                <Text style={styles.cardSubtext}>{paymentStats.paid_invoices} invoices paid</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Outstanding Amount</Text>
                <Text style={styles.cardValue}>{formatCurrency(paymentStats.total_outstanding_amount)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Overdue Amount</Text>
                <Text style={[styles.cardValue, { color: '#dc2626' }]}>{formatCurrency(paymentStats.overdue_amount)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>Total Invoices</Text>
                <Text style={styles.cardValue}>{paymentStats.total_invoices}</Text>
              </View>
            </View>
          </>
        )}

        {/* Payments Details */}
        {reportType === 'payments-details' && payments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Payment Transactions</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, colStyles.colDate]}>Date</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colNo]}>Payment #</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colSupplier]}>Supplier</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colMethod]}>Method</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderCell, colStyles.colAmount]}>Amount</Text>
              </View>
              {payments.map((payment, index) => (
                <View key={payment.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, colStyles.colDate]}>{formatDate(payment.payment_date)}</Text>
                  <Text style={[styles.tableCellBold, colStyles.colNo]}>{payment.payment_number}</Text>
                  <Text style={[styles.tableCell, colStyles.colSupplier]}>{payment.supplier_name}</Text>
                  <Text style={[styles.tableCell, colStyles.colMethod]}>{payment.payment_method}</Text>
                  <Text style={[styles.tableCell, colStyles.colStatus, { color: getStatusColor(payment.status) }]}>{payment.status.toUpperCase()}</Text>
                  <Text style={[styles.tableCellBold, colStyles.colAmount]}>{formatCurrency(payment.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Outstanding Invoices */}
        {reportType === 'invoices-outstanding' && invoices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Outstanding Invoices</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colNo]}>Invoice #</Text>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colSupplier]}>Supplier</Text>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colDate]}>Invoice Date</Text>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colDue]}>Due Date</Text>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colTotal]}>Total</Text>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colPaid]}>Paid</Text>
                <Text style={[styles.tableHeaderCell, invoiceColStyles.colOutstanding]}>Outstanding</Text>
              </View>
              {invoices.map((inv, index) => (
                <View key={inv.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCellBold, invoiceColStyles.colNo]}>{inv.invoice_number}</Text>
                  <Text style={[styles.tableCell, invoiceColStyles.colSupplier]}>{inv.supplier_name}</Text>
                  <Text style={[styles.tableCell, invoiceColStyles.colDate]}>{formatDate(inv.invoice_date)}</Text>
                  <Text style={[styles.tableCell, invoiceColStyles.colDue]}>{formatDate(inv.due_date)}</Text>
                  <Text style={[styles.tableCell, invoiceColStyles.colTotal]}>{formatCurrency(inv.total_amount)}</Text>
                  <Text style={[styles.tableCell, invoiceColStyles.colPaid, { color: '#16a34a' }]}>{formatCurrency(inv.paid_amount)}</Text>
                  <Text style={[styles.tableCellBold, invoiceColStyles.colOutstanding, { color: inv.outstanding_amount > 0 ? '#dc2626' : '#16a34a' }]}>
                    {formatCurrency(inv.outstanding_amount)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Supplier Payments Module</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
