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
import { SupplierDueRow, SupplierDueTotals } from '@/modules/inventory/services/supplier-due-reports-api';

export interface SupplierDueReportPDFProps {
  asOfDate?: string;
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  suppliers: SupplierDueRow[];
  totals: SupplierDueTotals | null;
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
  tableHeaderCell: { color: '#ffffff', fontSize: 9, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  totalRow: { flexDirection: 'row', backgroundColor: '#eef2ff', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  tableCell: { fontSize: 9, color: '#374151' },
  tableCellBold: { fontSize: 9, color: '#111827', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  footerText: { fontSize: 8, color: '#666' },
});

const col = StyleSheet.create({
  code: { width: '12%' },
  name: { width: '24%' },
  opening: { width: '14%', textAlign: 'right' },
  invoiced: { width: '14%', textAlign: 'right' },
  paid: { width: '14%', textAlign: 'right' },
  due: { width: '14%', textAlign: 'right' },
  overdue: { width: '8%', textAlign: 'center' },
});

export const SupplierDueReportPDF = ({
  asOfDate,
  companySettings,
  logoBase64,
  suppliers,
  totals,
  formatCurrency,
}: SupplierDueReportPDFProps) => {
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Document title="Total Supplier Due Report">
      <Page size="A4" style={styles.page}>
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
            <Text style={styles.reportTitle}>Total Supplier Due Report</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
            <Text style={styles.dateRange}>As of: {asOfDate || 'Today'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, col.code]}>Code</Text>
            <Text style={[styles.tableHeaderCell, col.name]}>Supplier</Text>
            <Text style={[styles.tableHeaderCell, col.opening]}>Opening</Text>
            <Text style={[styles.tableHeaderCell, col.invoiced]}>Invoiced</Text>
            <Text style={[styles.tableHeaderCell, col.paid]}>Paid</Text>
            <Text style={[styles.tableHeaderCell, col.due]}>Due</Text>
            <Text style={[styles.tableHeaderCell, col.overdue]}>Ovd</Text>
          </View>
          {suppliers.map((s, index) => (
            <View key={s.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellBold, col.code]}>{s.supplier_code}</Text>
              <Text style={[styles.tableCell, col.name]}>{s.name}</Text>
              <Text style={[styles.tableCell, col.opening]}>{formatCurrency(s.opening_balance)}</Text>
              <Text style={[styles.tableCell, col.invoiced]}>{formatCurrency(s.total_invoiced)}</Text>
              <Text style={[styles.tableCell, col.paid, { color: '#16a34a' }]}>{formatCurrency(s.total_paid)}</Text>
              <Text style={[styles.tableCellBold, col.due, { color: s.total_due > 0 ? '#dc2626' : '#16a34a' }]}>{formatCurrency(s.total_due)}</Text>
              <Text style={[styles.tableCell, col.overdue, { color: s.overdue_count > 0 ? '#dc2626' : '#666' }]}>{s.overdue_count}</Text>
            </View>
          ))}
          {totals && (
            <View style={styles.totalRow}>
              <Text style={[styles.tableCellBold, col.code]}>TOTAL</Text>
              <Text style={[styles.tableCellBold, col.name]}>{totals.supplier_count} suppliers</Text>
              <Text style={[styles.tableCellBold, col.opening]}>{formatCurrency(totals.opening_balance)}</Text>
              <Text style={[styles.tableCellBold, col.invoiced]}>{formatCurrency(totals.total_invoiced)}</Text>
              <Text style={[styles.tableCellBold, col.paid]}>{formatCurrency(totals.total_paid)}</Text>
              <Text style={[styles.tableCellBold, col.due, { color: '#dc2626' }]}>{formatCurrency(totals.total_due)}</Text>
              <Text style={[styles.tableCellBold, col.overdue]}>{' '}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Supplier Due Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
