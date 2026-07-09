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
  CostingSummary,
  BomDetail,
  MaterialCost,
} from "@/modules/factory/services/costing-report-api";

export interface CostingReportPDFProps {
  companySettings: CompanySettings | null;
  logoBase64: string | null;
  summary: CostingSummary | null;
  bomDetails: BomDetail[];
  materialCosts: MaterialCost[];
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

const bCol = StyleSheet.create({
  name: { width: "25%" },
  sku: { width: "12%" },
  version: { width: "10%" },
  cost: { width: "15%", textAlign: "right" },
  selling: { width: "15%", textAlign: "right" },
  margin: { width: "12%", textAlign: "right" },
  components: { width: "11%", textAlign: "right" },
});

const mCol = StyleSheet.create({
  name: { width: "22%" },
  sku: { width: "12%" },
  cost: { width: "12%", textAlign: "right" },
  boms: { width: "10%", textAlign: "right" },
  required: { width: "12%", textAlign: "right" },
  totalCost: { width: "16%", textAlign: "right" },
  supplier: { width: "16%" },
});

export const CostingReportPDF = ({
  companySettings,
  logoBase64,
  summary,
  bomDetails,
  materialCosts,
  activeTab,
  formatCurrency,
}: CostingReportPDFProps) => {
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const renderSummaryTab = () => {
    if (!summary) return null;
    return (
      <View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total BOMs</Text>
            <Text style={styles.summaryValue}>{summary.total_boms}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Products with BOM</Text>
            <Text style={styles.summaryValue}>{summary.products_with_bom}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Unique Materials</Text>
            <Text style={styles.summaryValue}>{summary.unique_materials}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg BOM Cost</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.avg_bom_cost)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Max BOM Cost</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{formatCurrency(summary.max_bom_cost)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Min BOM Cost</Text>
            <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{formatCurrency(summary.min_bom_cost)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Product</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%" }]}>SKU</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "right" }]}>BOM Cost</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Version</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Components</Text>
          </View>
          {summary.top_cost_products.map((p, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellBold, { width: "30%" }]}>{p.product_name}</Text>
              <Text style={[styles.tableCell, { width: "15%" }]}>{p.sku}</Text>
              <Text style={[styles.tableCellBold, { width: "15%", textAlign: "right" }]}>{formatCurrency(p.total_cost)}</Text>
              <Text style={[styles.tableCell, { width: "12%" }]}>{p.version}</Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{p.component_count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBomTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, bCol.name]}>Product</Text>
        <Text style={[styles.tableHeaderCell, bCol.sku]}>SKU</Text>
        <Text style={[styles.tableHeaderCell, bCol.version]}>Version</Text>
        <Text style={[styles.tableHeaderCell, bCol.cost]}>BOM Cost</Text>
        <Text style={[styles.tableHeaderCell, bCol.selling]}>Selling</Text>
        <Text style={[styles.tableHeaderCell, bCol.margin]}>Margin</Text>
        <Text style={[styles.tableHeaderCell, bCol.components]}>Parts</Text>
      </View>
      {bomDetails.map((b, i) => (
        <View key={b.bom_id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCellBold, bCol.name]}>{b.product_name}</Text>
          <Text style={[styles.tableCell, bCol.sku]}>{b.sku}</Text>
          <Text style={[styles.tableCell, bCol.version]}>{b.version}</Text>
          <Text style={[styles.tableCellBold, bCol.cost]}>{formatCurrency(b.total_cost)}</Text>
          <Text style={[styles.tableCell, bCol.selling]}>{formatCurrency(b.selling_price)}</Text>
          <Text style={[styles.tableCellBold, bCol.margin, { color: b.margin > 0 ? "#16a34a" : "#dc2626" }]}>{b.margin.toFixed(1)}%</Text>
          <Text style={[styles.tableCell, bCol.components]}>{i + 1}</Text>
        </View>
      ))}
    </View>
  );

  const renderMaterialsTab = () => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, mCol.name]}>Material</Text>
        <Text style={[styles.tableHeaderCell, mCol.sku]}>SKU</Text>
        <Text style={[styles.tableHeaderCell, mCol.cost]}>Unit Cost</Text>
        <Text style={[styles.tableHeaderCell, mCol.boms]}>Used In</Text>
        <Text style={[styles.tableHeaderCell, mCol.totalCost]}>Total Cost</Text>
        <Text style={[styles.tableHeaderCell, mCol.supplier]}>Supplier</Text>
      </View>
      {materialCosts.map((m, i) => (
        <View key={m.material_id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCellBold, mCol.name]}>{m.material_name}</Text>
          <Text style={[styles.tableCell, mCol.sku]}>{m.sku}</Text>
          <Text style={[styles.tableCell, mCol.cost]}>{formatCurrency(m.cost_price)}</Text>
          <Text style={[styles.tableCell, mCol.boms]}>{m.used_in_boms}</Text>
          <Text style={[styles.tableCellBold, mCol.totalCost]}>{formatCurrency(m.total_cost_in_boms)}</Text>
          <Text style={[styles.tableCell, mCol.supplier]}>{m.supplier_name || "—"}</Text>
        </View>
      ))}
    </View>
  );

  const tabTitles: Record<string, string> = {
    summary: "Costing Summary",
    bom: "BOM Details",
    materials: "Material Costs",
  };

  return (
    <Document title="Costing Report">
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
            <Text style={styles.reportTitle}>Costing Report</Text>
            <Text style={styles.reportSubtitle}>{tabTitles[activeTab] || "Costing Summary"}</Text>
            <Text style={styles.reportSubtitle}>Generated: {generatedDate}</Text>
          </View>
        </View>

        {activeTab === "summary" && renderSummaryTab()}
        {activeTab === "bom" && renderBomTab()}
        {activeTab === "materials" && renderMaterialsTab()}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ERP System - Costing Report</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
