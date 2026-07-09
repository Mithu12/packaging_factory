"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { CompanySettings } from "@/services/settings-types";
import {
  StockSummary,
  StockOverviewRow,
  StockByCategoryRow,
  LowStockRow,
} from "@/modules/inventory/services/stock-reports-api";

export interface StockReportPDFProps {
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  summary: StockSummary | null;
  overview: StockOverviewRow[];
  byCategory: StockByCategoryRow[];
  lowStock: LowStockRow[];
  activeTab: string;
  formatCurrency: (val: number) => string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#333", lineHeight: 1.5 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#1D357B", paddingBottom: 15,
  },
  logoSection: { width: "38%" },
  logo: { width: 120, height: "auto", marginBottom: 5 },
  companyName: { fontSize: 18, fontWeight: "bold", color: "#1D357B" },
  companyInfo: { fontSize: 8, color: "#666", marginTop: 3 },
  titleSection: { textAlign: "right", width: "60%" },
  reportTitle: { fontSize: 20, fontWeight: "bold", color: "#1D357B", marginBottom: 5 },
  reportSubtitle: { fontSize: 10, color: "#666", marginBottom: 2 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 15 },
  summaryCard: { width: "30%", padding: 10, backgroundColor: "#f8fafc", borderRadius: 5, borderWidth: 1, borderColor: "#e2e8f0" },
  summaryLabel: { fontSize: 8, color: "#666", marginBottom: 3 },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: "#1D357B" },
  table: { marginTop: 10, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1D357B", paddingVertical: 8, paddingHorizontal: 6 },
  tableHeaderCell: { color: "#ffffff", fontSize: 8, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 6, alignItems: "center" },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 6, alignItems: "center", backgroundColor: "#f8fafc" },
  totalRow: { flexDirection: "row", backgroundColor: "#eef2ff", paddingVertical: 8, paddingHorizontal: 6, alignItems: "center" },
  tableCell: { fontSize: 8, color: "#374151" },
  tableCellBold: { fontSize: 8, color: "#111827", fontWeight: "bold" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 },
  footerText: { fontSize: 8, color: "#666" },
});

const oCol = StyleSheet.create({
  code: { width: "12%" },
  name: { width: "22%" },
  category: { width: "14%" },
  stock: { width: "10%", textAlign: "right" },
  reserved: { width: "10%", textAlign: "right" },
  available: { width: "10%", textAlign: "right" },
  value: { width: "14%", textAlign: "right" },
  status: { width: "8%", textAlign: "center" },
});

const cCol = StyleSheet.create({
  name: { width: "25%" },
  products: { width: "12%", textAlign: "right" },
  stock: { width: "15%", textAlign: "right" },
  value: { width: "18%", textAlign: "right" },
  revenue: { width: "18%", textAlign: "right" },
  oos: { width: "12%", textAlign: "right" },
});

const lCol = StyleSheet.create({
  code: { width: "10%" },
  name: { width: "20%" },
  category: { width: "14%" },
  stock: { width: "10%", textAlign: "right" },
  reorder: { width: "10%", textAlign: "right" },
  shortage: { width: "10%", textAlign: "right" },
  pct: { width: "10%", textAlign: "right" },
  supplier: { width: "16%" },
});

export const StockReportPDF = ({
  companySettings,
  logoBase64,
  summary,
  overview,
  byCategory,
  lowStock,
  activeTab,
  formatCurrency,
}: StockReportPDFProps) => {
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const renderSummaryTab = () => {
    if (!summary) return null;
    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Products</Text>
            <Text style={styles.summaryValue}>{summary.total_products}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Stock Value</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.total_stock_value)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Low Stock Items</Text>
            <Text style={[styles.summaryValue, { color: "#d97706" }]}>{summary.low_stock}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Out of Stock</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{summary.out_of_stock}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Stock Qty</Text>
            <Text style={styles.summaryValue}>{summary.total_stock_qty.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Distribution Centers</Text>
            <Text style={styles.summaryValue}>{summary.dc_count}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Category</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Products</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%", textAlign: "right" }]}>Total Stock</Text>
            <Text style={[styles.tableHeaderCell, { width: "25%", textAlign: "right" }]}>Total Value</Text>
          </View>
          {summary.categories.map((c, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: "30%" }]}>{c.category_name}</Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{c.product_count}</Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>{c.total_stock.toLocaleString()}</Text>
              <Text style={[styles.tableCellBold, { width: "25%", textAlign: "right" }]}>{formatCurrency(c.total_value)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, oCol.code]}>Code</Text>
        <Text style={[styles.tableHeaderCell, oCol.name]}>Product</Text>
        <Text style={[styles.tableHeaderCell, oCol.category]}>Category</Text>
        <Text style={[styles.tableHeaderCell, oCol.stock]}>Stock</Text>
        <Text style={[styles.tableHeaderCell, oCol.reserved]}>Reserved</Text>
        <Text style={[styles.tableHeaderCell, oCol.available]}>Available</Text>
        <Text style={[styles.tableHeaderCell, oCol.value]}>Value</Text>
        <Text style={[styles.tableHeaderCell, oCol.status]}>Status</Text>
      </View>
      {overview.slice(0, 50).map((p, i) => (
        <View key={p.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCellBold, oCol.code]}>{p.product_code}</Text>
          <Text style={[styles.tableCell, oCol.name]}>{p.name}</Text>
          <Text style={[styles.tableCell, oCol.category]}>{p.category_name}</Text>
          <Text style={[styles.tableCell, oCol.stock]}>{p.stock_qty}</Text>
          <Text style={[styles.tableCell, oCol.reserved]}>{p.reserved_qty}</Text>
          <Text style={[styles.tableCell, oCol.available]}>{p.available_qty}</Text>
          <Text style={[styles.tableCellBold, oCol.value]}>{formatCurrency(p.stock_value)}</Text>
          <Text style={[styles.tableCellBold, oCol.status, { color: p.is_out_of_stock ? "#dc2626" : p.is_low_stock ? "#d97706" : "#16a34a" }]}>
            {p.is_out_of_stock ? "OOS" : p.is_low_stock ? "LOW" : "OK"}
          </Text>
        </View>
      ))}
      {overview.length > 50 && (
        <View style={styles.totalRow}>
          <Text style={[styles.tableCellBold, { width: "100%", textAlign: "center" }]}>Showing first 50 of {overview.length} products</Text>
        </View>
      )}
    </View>
  );

  const renderCategoryTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, cCol.name]}>Category</Text>
        <Text style={[styles.tableHeaderCell, cCol.products]}>Products</Text>
        <Text style={[styles.tableHeaderCell, cCol.stock]}>Total Stock</Text>
        <Text style={[styles.tableHeaderCell, cCol.value]}>Stock Value</Text>
        <Text style={[styles.tableHeaderCell, cCol.revenue]}>Potential Revenue</Text>
        <Text style={[styles.tableHeaderCell, cCol.oos]}>Out of Stock</Text>
      </View>
      {byCategory.map((c, i) => (
        <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCellBold, cCol.name]}>{c.category_name}</Text>
          <Text style={[styles.tableCell, cCol.products]}>{c.product_count}</Text>
          <Text style={[styles.tableCell, cCol.stock]}>{c.total_stock.toLocaleString()}</Text>
          <Text style={[styles.tableCellBold, cCol.value]}>{formatCurrency(c.total_value)}</Text>
          <Text style={[styles.tableCell, cCol.revenue]}>{formatCurrency(c.potential_revenue)}</Text>
          <Text style={[styles.tableCell, cCol.oos, { color: c.out_of_stock_count > 0 ? "#dc2626" : "#666" }]}>{c.out_of_stock_count}</Text>
        </View>
      ))}
    </View>
  );

  const renderLowStockTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, lCol.code]}>Code</Text>
        <Text style={[styles.tableHeaderCell, lCol.name]}>Product</Text>
        <Text style={[styles.tableHeaderCell, lCol.category]}>Category</Text>
        <Text style={[styles.tableHeaderCell, lCol.stock]}>Stock</Text>
        <Text style={[styles.tableHeaderCell, lCol.reorder]}>Reorder</Text>
        <Text style={[styles.tableHeaderCell, lCol.shortage]}>Shortage</Text>
        <Text style={[styles.tableHeaderCell, lCol.pct]}>%</Text>
        <Text style={[styles.tableHeaderCell, lCol.supplier]}>Supplier</Text>
      </View>
      {lowStock.map((p, i) => (
        <View key={p.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCellBold, lCol.code]}>{p.product_code}</Text>
          <Text style={[styles.tableCell, lCol.name]}>{p.name}</Text>
          <Text style={[styles.tableCell, lCol.category]}>{p.category_name}</Text>
          <Text style={[styles.tableCellBold, lCol.stock, { color: p.total_stock === 0 ? "#dc2626" : "#d97706" }]}>{p.total_stock}</Text>
          <Text style={[styles.tableCell, lCol.reorder]}>{p.reorder_point}</Text>
          <Text style={[styles.tableCell, lCol.shortage, { color: "#dc2626" }]}>{p.shortage}</Text>
          <Text style={[styles.tableCell, lCol.pct]}>{p.stock_percentage}%</Text>
          <Text style={[styles.tableCell, lCol.supplier]}>{p.supplier_name || "—"}</Text>
        </View>
      ))}
    </View>
  );

  const tabTitles: Record<string, string> = {
    summary: "Stock Summary",
    overview: "Stock Overview",
    category: "Stock by Category",
    lowStock: "Low Stock Products",
  };

  return (
    <Document title="Stock Report">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {logoBase64 ? (
              <Image src={logoBase64} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{companySettings?.company_name || "ERP System"}</Text>
            )}
            <Text style={styles.companyInfo}>{companySettings?.company_address || ""}</Text>
            <Text style={styles.companyInfo}>{companySettings?.phone || ""} | {companySettings?.company_email || ""}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.reportTitle}>Stock Report</Text>
            <Text style={styles.reportSubtitle}>{tabTitles[activeTab] || "Stock Summary"}</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
          </View>
        </View>

        {activeTab === "summary" && renderSummaryTab()}
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "category" && renderCategoryTab()}
        {activeTab === "lowStock" && renderLowStockTab()}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Stock Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
