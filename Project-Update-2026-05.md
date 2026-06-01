# Project Update

**Period:** 17 May 2026 – 1 June 2026

This update summarises the new features, enhancements, and fixes delivered to the packaging factory management system over the past two weeks.

---

## Customer Orders & Sales

- **Customer PO capture.** Customer purchase order number and date can now be recorded on an order and are shown on order documents.
- **Richer order list.** The customer orders table now displays PO details alongside ordered and shipped quantities so the sales team can see fulfilment progress at a glance.
- **Clearer order totals.** Order detail screens now show the VAT and subtotal breakdown instead of only the gross total.
- **Manual payment recording** against customer orders, with the ability to record payments directly while viewing an invoice.
- **Customer payment reminders report** for the collections workflow.
- **CSV export** from the customer orders screen.

## Deliveries & Shipping

- **Multi-order deliveries.** A single shipment can now cover line items from multiple orders for the same customer.
- **Customer-centric delivery view.** All shipments for a customer can be browsed from one place.
- **Distribution-centre selection** when processing delivery returns.
- **Item-level overrides and VAT handling** on deliveries (unit price, quantity, and tax can be adjusted per shipment line).
- **Improved delivery cancellation logic** for financial accuracy.

## Production

- **BOM variants and manual pre-production entries** to support flexible recipes and ad-hoc material adjustments.
- **Cascading completion.** Completing a work order now propagates completion to its production runs automatically.
- **Spare parts management** with inventory tracking.
- **Machine parts linked to inventory**, so stock movements for parts are traceable.
- **Printing-plate usage and breakage tracking.**
- **Carton labeling and BOM component filtering** in the production UI.

## Inventory & Warehousing

- **Per-distribution-centre stock management.** Inventory levels are now tracked per distribution centre rather than as a single global pool. This is a structural change that allows accurate stock visibility across locations.
- **Goods Receipt Notes (GRN)** tracking with PDF generation.
- **Purchase Returns** module, including permissions and supporting workflow.
- **Bulk stock adjustments** with a batch history view for audit and review.
- **Carton-specific product attributes** with PDF support.
- **Expanded supplier records** with a detailed view.
- **Supplier VAT ID** field (renamed from "Tax ID" to align with VAT terminology).
- **Searchable select fields** across inventory screens for faster data entry.
- **Refined product form** with smarter visibility of pricing fields.
- **Print support and category filtering** on the product detail page.

## Accounting & Finance

- **Income Statement and Balance Sheet accuracy.** Sign handling for revenue, liabilities, and equity has been corrected; account classification is now driven by chart-of-account codes; balance-sheet balance check is corrected; cumulative net income now rolls into equity as retained earnings.
- **Bank reconciliation** workflow.
- **Cheque register** for tracking issued and received cheques.
- **Supplier due report** for outstanding payables.
- **Delivery returns** posted through to the ledger.
- **VAT Register report** with customer-level filtering.
- **Tax terminology aligned to VAT** across the system for consistency.
- **Monthly consolidated bill generation** for factory customers.
- **Supplier payments**: export and print capabilities added.

## Documents & PDFs

- **Custom letterhead backgrounds** for purchase orders.
- **Bill background image support.**
- **Modernised Purchase Order template** with a cleaner field set.
- **Ply information and improved address formatting** on shipping/billing documents.
- **Quotation asset tracking**; the asset-copy step is hardened to prevent orphaned files.
- **Invoice PDF financial precision** improved (rounding and totals).

## User Interface

- **Sidebar reorganisation** with menu grouping and updated navigation links for easier discovery of modules.
- **Consistent currency formatting** across the application via a shared hook.

---

## Notes for Operations

- The shift to per-distribution-centre stock affects how on-hand quantities are queried and reported. Existing reports continue to work, but stock balances will now break down per DC where applicable.
- The tax-to-VAT terminology change is system-wide. Existing data has been preserved; only labels and field names have changed where appropriate.

For questions on any of the items above or to schedule a walk-through, please get in touch.
