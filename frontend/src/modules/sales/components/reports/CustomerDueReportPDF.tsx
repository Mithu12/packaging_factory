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
import { CustomerDueItem } from '@/modules/sales/services/sales-reports-api';

export interface CustomerDueReportPDFProps {
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  customers: CustomerDueItem[];
  totals: {
    total_purchased: number;
    total_paid: number;
    total_due: number;
    customer_count: number;
    customers_with_dues: number;
  } | null;
  formatCurrency: (val: number) => string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#333', lineHeight: 1.5 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#1D357B', paddingBottom: 15,
  },
  logoSection: { width: '38%' },
  logo: { width: 120, height: 'auto', marginBottom: 5 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#1D357B' },
  companyInfo: { fontSize: 8, color: '#666', marginTop: 3 },
  titleSection: { textAlign: 'right', width: '60%' },
  reportTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D357B', marginBottom: 5, lineHeight: 1.1 },
  reportSubtitle: { fontSize: 10, color: '#666', marginBottom: 2 },
  dateRange: { fontSize: 9, color: '#333', marginTop: 5, backgroundColor: '#f3f4f6', padding: 5, borderRadius: 3 },
  table: { marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1D357B', paddingVertical: 10, paddingHorizontal: 8 },
  tableHeaderCell: { color: '#ffffff', fontSize: 8, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  totalRow: { flexDirection: 'row', backgroundColor: '#eef2ff', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  tableCell: { fontSize: 8, color: '#374151' },
  tableCellBold: { fontSize: 8, color: '#111827', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#666' },
});

const col = StyleSheet.create({
  code: { width: '10%' },
  name: { width: '20%' },
  phone: { width: '12%' },
  purchased: { width: '14%', textAlign: 'right' },
  paid: { width: '14%', textAlign: 'right' },
  due: { width: '14%', textAlign: 'right' },
  orders: { width: '8%', textAlign: 'center' },
  lastDate: { width: '8%', fontSize: 7 },
});

export const CustomerDueReportPDF = ({
  companySettings,
  logoBase64,
  customers,
  totals,
  formatCurrency,
}: CustomerDueReportPDFProps) => {
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Document title="Customer Due Report">
      <Page size={[841.89, 595.28]} style={styles.page}>
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
            <Text style={styles.reportTitle}>Customer Due Report</Text>
            <Text style={styles.reportSubtitle}>Outstanding receivables per customer</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, col.code]}>Code</Text>
            <Text style={[styles.tableHeaderCell, col.name]}>Customer</Text>
            <Text style={[styles.tableHeaderCell, col.phone]}>Phone</Text>
            <Text style={[styles.tableHeaderCell, col.purchased]}>Total Purchased</Text>
            <Text style={[styles.tableHeaderCell, col.paid]}>Total Paid</Text>
            <Text style={[styles.tableHeaderCell, col.due]}>Total Due</Text>
            <Text style={[styles.tableHeaderCell, col.orders]}>Orders</Text>
            <Text style={[styles.tableHeaderCell, col.lastDate]}>Last Order</Text>
          </View>
          {customers.map((c, index) => (
            <View key={c.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellBold, col.code]}>{c.customer_code}</Text>
              <Text style={[styles.tableCell, col.name]}>{c.name}</Text>
              <Text style={[styles.tableCell, col.phone]}>{c.phone || '—'}</Text>
              <Text style={[styles.tableCell, col.purchased]}>{formatCurrency(c.total_purchased)}</Text>
              <Text style={[styles.tableCell, col.paid, { color: '#16a34a' }]}>{formatCurrency(c.total_paid)}</Text>
              <Text style={[styles.tableCellBold, col.due, { color: c.total_due > 0 ? '#dc2626' : '#16a34a' }]}>{formatCurrency(c.total_due)}</Text>
              <Text style={[styles.tableCell, col.orders, { textAlign: 'center' }]}>{c.order_count}</Text>
              <Text style={[styles.tableCell, col.lastDate]}>{c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</Text>
            </View>
          ))}
          {totals && (
            <View style={styles.totalRow}>
              <Text style={[styles.tableCellBold, col.code]}>TOTAL</Text>
              <Text style={[styles.tableCellBold, col.name]}>{totals.customer_count} customers</Text>
              <Text style={[styles.tableCellBold, col.phone]}>{totals.customers_with_dues} with dues</Text>
              <Text style={[styles.tableCellBold, col.purchased]}>{formatCurrency(totals.total_purchased)}</Text>
              <Text style={[styles.tableCellBold, col.paid]}>{formatCurrency(totals.total_paid)}</Text>
              <Text style={[styles.tableCellBold, col.due, { color: '#dc2626' }]}>{formatCurrency(totals.total_due)}</Text>
              <Text style={[styles.tableCellBold, col.orders]}>{' '}</Text>
              <Text style={[styles.tableCellBold, col.lastDate]}>{' '}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Customer Due Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
