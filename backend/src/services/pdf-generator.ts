import puppeteer, { Browser, Page } from 'puppeteer';
import { PurchaseOrderWithDetails } from '@/types/purchaseOrder';
import { SalesInvoice } from '@/types/salesInvoice';
import { FactoryCustomerOrder } from '@/types/factory';
import { MyLogger } from '@/utils/new-logger';
import SettingsMediator from '@/mediators/settings/SettingsMediator';
import fs from 'fs';
import path from 'path';

const QUOTATION_PDF_BACKGROUND_FILE = 'quotation-pdf-background.png';
const QUOTATION_LOGO_FILE = 'quotation-logo.png';

export class PDFGenerator {
  private static browser: Browser | null = null;

  /** Resolved from `src/services` or `dist/services` → `../utils/<file>`. */
  private static getQuotationPdfBackgroundPath(): string {
    return path.join(__dirname, '..', 'utils', QUOTATION_PDF_BACKGROUND_FILE);
  }

  /** Resolved from `src/services` or `dist/services` → `../utils/<file>`. */
  private static getQuotationLogoPath(): string {
    return path.join(__dirname, '..', 'utils', QUOTATION_LOGO_FILE);
  }

  // Initialize browser instance
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  // Generate HTML template for purchase order
  private static generatePurchaseOrderHTML(purchaseOrder: PurchaseOrderWithDetails): string {
    const formatCurrency = (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'draft': return '#6b7280';
        case 'pending': return '#f59e0b';
        case 'approved': return '#3b82f6';
        case 'sent': return '#06b6d4';
        case 'partially_received': return '#f97316';
        case 'received': return '#10b981';
        case 'cancelled': return '#ef4444';
        default: return '#6b7280';
      }
    };

    const subtotal = purchaseOrder.total_amount * 0.9;
    const tax = purchaseOrder.total_amount * 0.1;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order - ${purchaseOrder.po_number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .company-info h1 {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 5px;
        }
        
        .company-info p {
            color: #6b7280;
            font-size: 14px;
        }
        
        .po-info {
            text-align: right;
        }
        
        .po-number {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
            background-color: ${getStatusColor(purchaseOrder.status)};
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
        }
        
        .section h3 {
            color: #1f2937;
            margin-bottom: 15px;
            font-size: 16px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .detail-label {
            color: #6b7280;
            font-weight: 500;
        }
        
        .detail-value {
            color: #1f2937;
            font-weight: 600;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .items-table th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 600;
            padding: 12px;
            text-align: left;
            font-size: 14px;
        }
        
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        
        .items-table tr:last-child td {
            border-bottom: none;
        }
        
        .product-name {
            font-weight: 600;
            color: #1f2937;
        }
        
        .product-sku {
            color: #6b7280;
            font-size: 12px;
        }
        
        .product-description {
            color: #6b7280;
            font-size: 12px;
            margin-top: 2px;
        }
        
        .quantity-info {
            font-weight: 600;
        }
        
        .received-info {
            color: #10b981;
            font-size: 12px;
            margin-top: 2px;
        }
        
        .pending-info {
            color: #f59e0b;
            font-size: 12px;
            margin-top: 2px;
        }
        
        .price {
            font-weight: 600;
            color: #1f2937;
        }
        
        .status-received {
            color: #10b981;
            font-weight: 600;
        }
        
        .status-partial {
            color: #f97316;
            font-weight: 600;
        }
        
        .status-pending {
            color: #f59e0b;
            font-weight: 600;
        }
        
        .totals {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }
        
        .totals-table {
            width: 300px;
        }
        
        .totals-table tr td {
            padding: 8px 12px;
            border: none;
        }
        
        .totals-table tr:last-child {
            border-top: 2px solid #e5e7eb;
            font-weight: bold;
            font-size: 16px;
        }
        
        .totals-table tr:last-child td {
            padding-top: 12px;
        }
        
        .notes {
            margin-top: 30px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }
        
        .notes h3 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .notes p {
            color: #6b7280;
            line-height: 1.6;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <h1>Your Company Name</h1>
                <p>123 Business Street, City, State 12345</p>
                <p>Phone: (555) 123-4567 | Email: info@company.com</p>
            </div>
            <div class="po-info">
                <div class="po-number">${purchaseOrder.po_number}</div>
                <div class="status-badge">${purchaseOrder.status.replace('_', ' ')}</div>
            </div>
        </div>

        <!-- Details Grid -->
        <div class="details-grid">
            <div class="section">
                <h3>Order Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Order Date:</span>
                    <span class="detail-value">${formatDate(purchaseOrder.order_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Expected Delivery:</span>
                    <span class="detail-value">${formatDate(purchaseOrder.expected_delivery_date)}</span>
                </div>
                ${purchaseOrder.actual_delivery_date ? `
                <div class="detail-row">
                    <span class="detail-label">Actual Delivery:</span>
                    <span class="detail-value">${formatDate(purchaseOrder.actual_delivery_date)}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Priority:</span>
                    <span class="detail-value">${purchaseOrder.priority.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Terms:</span>
                    <span class="detail-value">${purchaseOrder.payment_terms}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Delivery Terms:</span>
                    <span class="detail-value">${purchaseOrder.delivery_terms}</span>
                </div>
            </div>

            <div class="section">
                <h3>Supplier Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Company:</span>
                    <span class="detail-value">${purchaseOrder.supplier.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Code:</span>
                    <span class="detail-value">${purchaseOrder.supplier.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contact:</span>
                    <span class="detail-value">${purchaseOrder.supplier.contact_person || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${purchaseOrder.supplier.email || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${purchaseOrder.supplier.phone || 'N/A'}</span>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${purchaseOrder.line_items?.map(item => {
                  const receivedQty = item.received_quantity || 0;
                  const pendingQty = item.quantity - receivedQty;
                  const totalPrice = item.quantity * item.unit_price;
                  
                  let statusClass = 'status-pending';
                  let statusText = 'Pending';
                  
                  if (receivedQty === item.quantity) {
                    statusClass = 'status-received';
                    statusText = 'Received';
                  } else if (receivedQty > 0) {
                    statusClass = 'status-partial';
                    statusText = 'Partial';
                  }
                  
                  return `
                    <tr>
                        <td>
                            <div class="product-name">${item.product_name}</div>
                            <div class="product-sku">SKU: ${item.product_sku || 'N/A'}</div>
                            ${item.description ? `<div class="product-description">${item.description}</div>` : ''}
                        </td>
                        <td>
                            <div class="quantity-info">${item.quantity} ${item.unit_of_measure || 'pcs'}</div>
                            ${receivedQty > 0 ? `<div class="received-info">Received: ${receivedQty}</div>` : ''}
                            ${pendingQty > 0 ? `<div class="pending-info">Pending: ${pendingQty}</div>` : ''}
                        </td>
                        <td class="price">${formatCurrency(item.unit_price, purchaseOrder.currency)}</td>
                        <td class="price">${formatCurrency(totalPrice, purchaseOrder.currency)}</td>
                        <td class="${statusClass}">${statusText}</td>
                    </tr>
                  `;
                }).join('') || '<tr><td colspan="5" style="text-align: center; color: #6b7280;">No items found</td></tr>'}
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td style="text-align: right;">${formatCurrency(subtotal, purchaseOrder.currency)}</td>
                </tr>
                <tr>
                    <td>Tax (10%):</td>
                    <td style="text-align: right;">${formatCurrency(tax, purchaseOrder.currency)}</td>
                </tr>
                <tr>
                    <td>Total:</td>
                    <td style="text-align: right;">${formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency)}</td>
                </tr>
            </table>
        </div>

        <!-- Notes -->
        ${purchaseOrder.notes ? `
        <div class="notes">
            <h3>Order Notes</h3>
            <p>${purchaseOrder.notes}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>Generated on ${formatDate(new Date().toISOString())} | Purchase Order ${purchaseOrder.po_number}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Generate PDF for purchase order
  static async generatePurchaseOrderPDF(purchaseOrder: PurchaseOrderWithDetails): Promise<Buffer> {
    let action = 'Generate Purchase Order PDF';
    try {
      MyLogger.info(action, { poNumber: purchaseOrder.po_number, poId: purchaseOrder.id });

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generatePurchaseOrderHTML(purchaseOrder);

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await page.close();

      MyLogger.success(action, { 
        poNumber: purchaseOrder.po_number, 
        poId: purchaseOrder.id,
        pdfSize: pdfBuffer.length 
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { poNumber: purchaseOrder.po_number, poId: purchaseOrder.id });
      throw error;
    }
  }

  // Generate HTML template for sales invoice
  private static generateSalesInvoiceHTML(invoice: SalesInvoice): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            color: #333;
            line-height: 1.5;
            padding: 30px;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        
        .company-info h1 {
            font-size: 28pt;
            color: #2563eb;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .company-info p {
            color: #666;
            font-size: 10pt;
        }
        
        .invoice-title {
            text-align: right;
        }
        
        .invoice-title h2 {
            font-size: 32pt;
            color: #2563eb;
            font-weight: bold;
        }
        
        .invoice-title p {
            font-size: 10pt;
            color: #666;
        }
        
        .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .bill-to, .invoice-details {
            width: 48%;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .bill-to p, .invoice-details p {
            margin: 5px 0;
            font-size: 10pt;
        }
        
        .invoice-details p strong {
            color: #000;
            font-weight: 600;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-unpaid {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .status-partial {
            background-color: #fef3c7;
            color: #f59e0b;
        }
        
        .status-paid {
            background-color: #d1fae5;
            color: #059669;
        }
        
        .status-overdue {
            background-color: #fecaca;
            color: #b91c1c;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        thead {
            background-color: #2563eb;
            color: white;
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 10pt;
            text-transform: uppercase;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10pt;
        }
        
        tbody tr:hover {
            background-color: #f9fafb;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            width: 350px;
        }
        
        .totals-table tr {
            border-bottom: 1px solid #e5e7eb;
        }
        
        .totals-table td {
            padding: 10px;
        }
        
        .totals-table .total-row {
            font-size: 14pt;
            font-weight: bold;
            color: #2563eb;
            border-top: 3px solid #2563eb;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #666;
            font-size: 9pt;
        }
        
        .payment-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9fafb;
            border-left: 4px solid #2563eb;
        }
        
        .payment-info h3 {
            color: #2563eb;
            font-size: 11pt;
            margin-bottom: 10px;
        }
        
        .payment-info p {
            font-size: 10pt;
            margin: 5px 0;
        }
        
        .notes {
            margin-top: 20px;
            padding: 15px;
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
        }
        
        .notes h3 {
            color: #f59e0b;
            font-size: 11pt;
            margin-bottom: 10px;
        }
        
        .notes p {
            font-size: 10pt;
            color: #78350f;
        }
    </style>
</head>
<body>
    <div class="invoice-header">
        <div class="company-info">
            <h1>Your Company Name</h1>
            <p>123 Business Street</p>
            <p>City, State 12345</p>
            <p>Phone: (123) 456-7890</p>
            <p>Email: sales@yourcompany.com</p>
        </div>
        <div class="invoice-title">
            <h2>INVOICE</h2>
            <p><strong>${invoice.invoice_number}</strong></p>
            ${invoice.factory_name ? `<p>Factory: ${invoice.factory_name}</p>` : ''}
        </div>
    </div>
    
    <div class="invoice-meta">
        <div class="bill-to">
            <div class="section-title">Bill To:</div>
            <p><strong>${invoice.factory_customer_name}</strong></p>
            ${invoice.billing_address ? `
                <p>${invoice.billing_address.street || ''}</p>
                <p>${invoice.billing_address.city || ''}, ${invoice.billing_address.state || ''} ${invoice.billing_address.postal_code || ''}</p>
                ${invoice.billing_address.country ? `<p>${invoice.billing_address.country}</p>` : ''}
                ${invoice.billing_address.contact_phone ? `<p>Phone: ${invoice.billing_address.contact_phone}</p>` : ''}
            ` : ''}
        </div>
        
        <div class="invoice-details">
            <div class="section-title">Invoice Details:</div>
            <p><strong>Invoice Date:</strong> ${formatDate(invoice.invoice_date)}</p>
            <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
            <p><strong>Order Number:</strong> ${invoice.customer_order_number || 'N/A'}</p>
            <p><strong>Payment Terms:</strong> ${invoice.payment_terms || 'Net 30'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span></p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Order ${invoice.customer_order_number || invoice.customer_order_id}</td>
                <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            ${invoice.tax_amount && invoice.tax_amount > 0 ? `
            <tr>
                <td>Tax ${invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}</td>
                <td class="text-right">${formatCurrency(invoice.tax_amount)}</td>
            </tr>
            ` : ''}
            ${invoice.shipping_cost && invoice.shipping_cost > 0 ? `
            <tr>
                <td>Shipping & Handling</td>
                <td class="text-right">${formatCurrency(invoice.shipping_cost)}</td>
            </tr>
            ` : ''}
        </tbody>
    </table>
    
    <div class="totals">
        <table class="totals-table">
            <tr>
                <td><strong>Subtotal:</strong></td>
                <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            ${invoice.tax_amount && invoice.tax_amount > 0 ? `
            <tr>
                <td><strong>Tax:</strong></td>
                <td class="text-right">${formatCurrency(invoice.tax_amount)}</td>
            </tr>
            ` : ''}
            ${invoice.shipping_cost && invoice.shipping_cost > 0 ? `
            <tr>
                <td><strong>Shipping:</strong></td>
                <td class="text-right">${formatCurrency(invoice.shipping_cost)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
                <td><strong>Total:</strong></td>
                <td class="text-right"><strong>${formatCurrency(invoice.total_amount)}</strong></td>
            </tr>
            ${invoice.paid_amount > 0 ? `
            <tr>
                <td><strong>Paid:</strong></td>
                <td class="text-right">${formatCurrency(invoice.paid_amount)}</td>
            </tr>
            <tr>
                <td><strong>Amount Due:</strong></td>
                <td class="text-right"><strong>${formatCurrency(invoice.outstanding_amount)}</strong></td>
            </tr>
            ` : ''}
        </table>
    </div>
    
    ${invoice.notes ? `
    <div class="notes">
        <h3>Notes</h3>
        <p>${invoice.notes}</p>
    </div>
    ` : ''}
    
    <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Bank Name:</strong> Your Bank Name</p>
        <p><strong>Account Name:</strong> Your Company Name</p>
        <p><strong>Account Number:</strong> XXXX-XXXX-XXXX-1234</p>
        <p><strong>Routing Number:</strong> 123456789</p>
        <p><strong>Reference:</strong> ${invoice.invoice_number}</p>
    </div>
    
    <div class="footer">
        <p>Thank you for your business!</p>
        <p>If you have any questions about this invoice, please contact us at sales@yourcompany.com</p>
        <p style="margin-top: 10px;">Invoice generated on ${formatDate(new Date().toISOString())}</p>
    </div>
</body>
</html>
    `;
  }

  // Generate PDF for sales invoice
  static async generateSalesInvoicePDF(invoice: SalesInvoice): Promise<Buffer> {
    const action = 'Generate Sales Invoice PDF';
    try {
      MyLogger.info(action, { invoiceNumber: invoice.invoice_number, invoiceId: invoice.id });

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generateSalesInvoiceHTML(invoice);

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await page.close();

      MyLogger.success(action, { 
        invoiceNumber: invoice.invoice_number, 
        invoiceId: invoice.id,
        pdfSize: pdfBuffer.length 
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { invoiceNumber: invoice.invoice_number, invoiceId: invoice.id });
      throw error;
    }
  }

  // Generate HTML template for quotation (formal letterhead + rate / VAT table)
  private static generateQuotationHTML(order: FactoryCustomerOrder, settings?: any): string {
    const esc = (raw: string | undefined | null): string => {
      if (raw == null) return '';
      return String(raw)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const companyName = settings?.company_name || 'Company';
    const companyNameBn = settings?.company_name_bengali ? String(settings.company_name_bengali) : '';
    const address = settings?.company_address ? String(settings.company_address) : '';
    const phone1 = settings?.phone ? String(settings.phone) : '';
    const phone2 = settings?.company_secondary_phone ? String(settings.company_secondary_phone) : '';
    const mobileLine = [phone1, phone2].filter(Boolean).join(', ');
    const email1 = settings?.company_email ? String(settings.company_email) : '';
    const email2 = settings?.company_secondary_email ? String(settings.company_secondary_email) : '';
    const emailLine = [email1, email2].filter(Boolean).join(', ');

    const refText = settings?.quotation_ref_prefix
      ? String(settings.quotation_ref_prefix)
      : order.order_number || String(order.id);

    const attention = settings?.quotation_attention_line ? String(settings.quotation_attention_line) : '';
    const notesTrim = order.notes?.trim() || '';
    const subjectText = settings?.quotation_subject
      ? String(settings.quotation_subject)
      : notesTrim.startsWith('Sub:')
        ? notesTrim
        : 'Sub: Price quotation for the item(s) listed below.';

    const recipientExtra = settings?.quotation_recipient_lines
      ? String(settings.quotation_recipient_lines)
      : '';

    const opening = settings?.quotation_opening_paragraph
      ? String(settings.quotation_opening_paragraph)
      : 'We are pleased to submit our quotation for your kind consideration.';

    const assurance = settings?.quotation_closing_assurance
      ? String(settings.quotation_closing_assurance)
      : 'We assure that, our quality product and timely supply for all-time best & regards,';

    const signatureName = settings?.quotation_signature_name
      ? String(settings.quotation_signature_name)
      : companyName;
    const signatureTitle = settings?.quotation_signature_title
      ? String(settings.quotation_signature_title)
      : 'Authorized Signatory';
    const signatureOrg = settings?.quotation_signature_org
      ? String(settings.quotation_signature_org)
      : `M/S. ${companyName}`;

    const billing = order.billing_address;
    const billingLines: string[] = [];
    if (billing?.billing_line?.trim()) {
      billing.billing_line.split(/\n+/).forEach((l) => {
        const t = l.trim();
        if (t) billingLines.push(t);
      });
    }
    if (billing?.street?.trim()) billingLines.push(billing.street.trim());
    const cityPart = [billing?.city, billing?.state].filter(Boolean).join(', ');
    const cityLine = [cityPart, billing?.postal_code].filter(Boolean).join(' ').trim();
    if (cityLine) billingLines.push(cityLine);
    if (billing?.country?.trim()) billingLines.push(billing.country.trim());

    const vatPct = order.tax_rate != null && order.tax_rate > 0 ? order.tax_rate : 15;

    const itemsHtml =
      (order.line_items ?? []).length > 0
        ? (order.line_items ?? [])
            .map((item, index) => {
              const spec = item.specifications?.trim();
              const desc = item.description?.trim();
              let descText = '—';
              if (spec && desc) descText = `${spec}\n${desc}`;
              else if (spec) descText = spec;
              else if (desc) descText = desc;
              const plySource = `${item.product_name} ${spec || ''} ${desc || ''}`;
              const plyMatch = plySource.match(/(\d+)\s*[Pp]ly\b/);
              const ply = plyMatch ? `${plyMatch[1]} Ply` : '—';
              const withVat = item.unit_price * (1 + vatPct / 100);
              return `
        <tr>
          <td style="text-align: center; vertical-align: top;">${index + 1}</td>
          <td style="vertical-align: top;">${esc(item.product_name)}</td>
          <td style="vertical-align: top; font-size: 10pt;">${esc(descText).replace(/\n/g, '<br>')}</td>
          <td style="text-align: center; vertical-align: top;">${ply}</td>
          <td style="text-align: right; vertical-align: top;">${formatCurrency(item.unit_price)}</td>
          <td style="text-align: right; vertical-align: top;">${formatCurrency(withVat)}</td>
        </tr>`;
            })
            .join('')
        : '<tr><td colspan="6" style="text-align: center;">No items found</td></tr>';

    const termsRaw = order.terms?.trim();
    const termsLines = termsRaw ? termsRaw.split('\n').filter((l) => l.trim()) : [];
    const termsHtml =
      termsLines.length > 0
        ? `
    <div class="terms-block">
        <div class="terms-title">Terms &amp; conditions</div>
        ${termsLines
          .map(
            (line, i) => `
        <div class="term-line">${i + 1}. ${esc(line.trim())}</div>`
          )
          .join('')}
    </div>`
        : '';

    const hasQuotationBg = Boolean(settings?.quotation_background_base64);

    const logoHtml = settings?.quotation_logo_base64
      ? `<img src="${settings.quotation_logo_base64}" alt="Logo" style="max-height: 48px; max-width: 180px; margin-bottom: 8px;">`
      : settings?.invoice_logo_base64
        ? `<img src="${settings.invoice_logo_base64}" alt="Logo" style="max-height: 48px; max-width: 180px; margin-bottom: 8px;">`
        : '';

    const recipientExtraHtml = recipientExtra
      ? recipientExtra
          .split(/\n+/)
          .map((line) => `<div class="rec-line">${esc(line.trim())}</div>`)
          .join('')
      : '';

    const billingHtml = billingLines.map((l) => `<div class="rec-line">${esc(l)}</div>`).join('');

    const attentionHtml = attention
      ? `<div class="rec-line" style="margin-top: 6px;">Atten. ${esc(attention)}</div>`
      : '';

    return `<!DOCTYPE html>
<html${hasQuotationBg ? ' class="quotation-with-bg"' : ''}>
<head>
    <meta charset="UTF-8">
    <title>Quotation ${esc(order.order_number)}</title>
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ${
          hasQuotationBg
            ? `html.quotation-with-bg { margin: 0; padding: 0; background: #ffffff; }
        .quotation-bg-layer {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%;
            z-index: 0; pointer-events: none; background-color: #ffffff;
            /* background-image: url("${settings.quotation_background_base64}"); */
            background-repeat: no-repeat; background-position: center top; background-size: cover;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        html.quotation-with-bg body > *:not(.quotation-bg-layer) { position: relative; z-index: 1; }`
            : ''
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 10pt;
            color: #000;
            line-height: 1.35;
            padding: 36px 40px 48px;
            background: ${hasQuotationBg ? 'transparent' : '#fff'};
            min-height: 297mm;
            box-sizing: border-box;
        }
        .header-center { text-align: center; margin-bottom: 20px; }
        .co-en { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
        .co-bn { font-size: 11pt; font-weight: bold; margin-bottom: 6px; }
        .co-line { margin-bottom: 2px; }
        .meta { margin-bottom: 16px; }
        .meta div { margin-bottom: 3px; }
        .rec-block { margin-bottom: 14px; }
        .rec-line { margin-bottom: 2px; }
        .subject { font-weight: bold; text-decoration: underline; margin-bottom: 8px; }
        .body-p { margin-bottom: 6px; }
        .q-title { text-align: center; font-weight: bold; text-decoration: underline; font-size: 11pt; margin: 6px 0 10px; }
        table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table.q-table th, table.q-table td {
            border: 1px solid #000; padding: 5px; font-size: 9pt; vertical-align: top;
        }
        table.q-table th { font-weight: bold; text-align: center; }
        .terms-block { margin: 6px 0 10px; }
        .terms-title { font-weight: bold; margin-bottom: 4px; }
        .term-line { font-size: 9pt; margin-bottom: 2px; }
        .closing { margin-bottom: 4px; }
        .sign-block { margin-top: 4px; }
        .sig-name { font-weight: bold; }
    </style>
</head>
<body>
    ${hasQuotationBg ? '<div class="quotation-bg-layer" aria-hidden="true"></div>' : ''}
    <div class="header-center">
        <!-- ${logoHtml} -->
        <div class="co-en">${esc(companyName)}</div>
        ${companyNameBn ? `<div class="co-bn">${esc(companyNameBn)}</div>` : ''}
        ${address ? `<div class="co-line">${esc(address)}</div>` : ''}
        ${mobileLine ? `<div class="co-line">Mobile : ${esc(mobileLine)}</div>` : ''}
        ${emailLine ? `<div class="co-line">E-mail : ${esc(emailLine)}</div>` : ''}
    </div>
    <div class="meta">
        <div>Ref: ${esc(refText)}</div>
        <div>Date: - ${formatDate(order.order_date)}</div>
    </div>
    <div class="rec-block">
        <div class="rec-line">To,</div>
        ${recipientExtraHtml}
        <div class="rec-line">${esc(order.factory_customer_name)}</div>
        ${billingHtml}
        ${attentionHtml}
    </div>
    <div class="subject">${esc(subjectText)}</div>
    <div class="body-p">Dear Sir,</div>
    <div class="body-p">${esc(opening)}</div>
    <div class="q-title">Quotation</div>
    <table class="q-table">
        <thead>
            <tr>
                <th style="width:6%;">SI. No</th>
                <th style="width:18%;">Item Name</th>
                <th style="width:40%;">Description</th>
                <th style="width:10%;">Ply</th>
                <th style="width:13%;">Rate</th>
                <th style="width:13%;">+ ${vatPct}% VAT</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>
    ${termsHtml}
    <div class="closing">${esc(assurance)}</div>
    <div class="body-p">Thanking you,</div>
    <div class="body-p" style="margin-bottom: 28px;">Yours truly</div>
    <div class="sign-block">
        <div class="sig-name">(${esc(signatureName)})</div>
        <div>${esc(signatureTitle)}</div>
        <div>${esc(signatureOrg)}</div>
    </div>
</body>
</html>`;
  }

  // Generate PDF for quotation
  public static async generateQuotationPDF(order: FactoryCustomerOrder): Promise<Buffer> {
    const action = "PDFGenerator.generateQuotationPDF";
    try {
      // Fetch company settings
      const settingsMediator = new SettingsMediator();
      const companySettings = await settingsMediator.getSettingsByCategory('company');
      
      const settingsData: any = {};
      for (const [key, setting] of Object.entries(companySettings)) {
        settingsData[key] = setting.value;
      }

      // Convert logo to base64 if it exists
      if (settingsData.invoice_logo) {
        try {
          const logoPath = path.join(process.cwd(), settingsData.invoice_logo);
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const extension = path.extname(logoPath).substring(1);
            const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
            settingsData.invoice_logo_base64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
          }
        } catch (logoError) {
          MyLogger.warn(`${action}.logoError`, logoError);
        }
      }

      const quotationLogoPath = this.getQuotationLogoPath();
      if (fs.existsSync(quotationLogoPath)) {
        try {
          const logoBuffer = fs.readFileSync(quotationLogoPath);
          settingsData.quotation_logo_base64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        } catch (logoError) {
          MyLogger.warn(`${action}.quotationLogoReadError`, { error: logoError, path: quotationLogoPath });
        }
      }

      const quotationBgPath = this.getQuotationPdfBackgroundPath();
      if (fs.existsSync(quotationBgPath)) {
        try {
          const bgBuffer = fs.readFileSync(quotationBgPath);
          settingsData.quotation_background_base64 = `data:image/png;base64,${bgBuffer.toString('base64')}`;
        } catch (bgError) {
          MyLogger.warn(`${action}.quotationBackgroundReadError`, { error: bgError, path: quotationBgPath });
        }
      } else {
        MyLogger.warn(`${action}.quotationBackgroundMissing`, { path: quotationBgPath });
      }

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generateQuotationHTML(order, settingsData);

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // HTML `body` already sets padding; avoid double top/side gap from Chromium margins.
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });

      await page.close();

      MyLogger.success(action, { 
        orderNumber: order.order_number, 
        orderId: order.id,
        pdfSize: pdfBuffer.length 
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { orderNumber: order.order_number, orderId: order.id });
      throw error;
    }
  }

  // Generate HTML template for invoice (Bill)
  private static generateInvoiceHTML(
    order: FactoryCustomerOrder,
    settings?: any,
    delivery?: import('@/types/factory').Delivery
  ): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`; // Changed to match "03-03-2026" format in the image
    };

    // A simple number to words function for the "In Words" section
    const numberToWords = (num: number) => {
      const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
      const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
      
      let numStr = Math.floor(num).toString();
      if (numStr.length > 9) return 'overflow';
      const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return '';
      let str = '';
      str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
      str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
      str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
      str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
      str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
      return 'In Word: ' + (str.trim() ? str.trim() + ' Taka Only.' : 'Zero Taka Only.');
    };

    // When a delivery is provided, render only that shipment's lines and totals.
    // Otherwise fall back to whole-order rendering for legacy callers.
    const renderRows = delivery?.items?.length
      ? delivery.items.map(it => ({
          product_name: it.product_name ?? '',
          description: it.description ?? '',
          quantity: it.quantity,
          unit_price: it.unit_price_snapshot,
          line_total: it.line_total,
        }))
      : (order.line_items ?? []).map(li => ({
          product_name: li.product_name,
          description: li.description ?? '',
          quantity: li.quantity,
          unit_price: li.unit_price,
          line_total: li.quantity * li.unit_price,
        }));

    const itemsHtml = renderRows.map((item, index) => {
      const descHtml = item.description ? `<br><span style="font-size: 10pt;">${item.description.replace(/\n/g, '<br>')}</span>` : '';

      return `
        <tr>
          <td style="text-align: center; vertical-align: top;">${String(index + 1).padStart(2, '0')}.</td>
          <td style="vertical-align: top;">
            ${item.product_name}
            ${descHtml}
          </td>
          <td style="text-align: center; vertical-align: bottom;">${item.quantity}</td>
          <td style="text-align: center; vertical-align: bottom;">${formatCurrency(item.unit_price)}</td>
          <td style="text-align: right; vertical-align: bottom;">${formatCurrency(item.line_total)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5" style="text-align: center;">No items found</td></tr>';

    // Calculate totals (per-delivery if delivery is provided)
    const grandTotal = delivery
      ? renderRows.reduce((sum, r) => sum + r.line_total, 0)
      : parseFloat(order.total_value?.toString() || '0');
    const advance = delivery ? 0 : parseFloat(order.paid_amount?.toString() || '0');
    const due = delivery ? grandTotal : parseFloat(order.outstanding_amount?.toString() || '0');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bill ${order.order_number}</title>
    <style>
        @page {
            size: A4;
            margin: 0; 
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html {
            height: 100%;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            color: #000;
            background: white;
            line-height: 1.3;
            /* Using a relative container for full page backgrounds/watermarks */
            position: relative;
            min-height: 295mm; /* Approximate A4 height */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        
        /* Simulating the header gradient background */
        .page-background-top {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 150px;
            background: linear-gradient(to right, #d0e8f2, #ffffff, #f9ebed);
            z-index: -2;
            opacity: 0.6;
        }
        
        .content-wrapper {
             padding: 40px 50px;
             position: relative;
             z-index: 10;
             flex: 1;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
        }
        .logo-section h1 {
            color: #555;
            font-size: 24pt;
            font-weight: bold;
            font-family: Arial, sans-serif;
            margin: 0;
            line-height: 1;
            display: flex;
            align-items: center;
        }
        .logo-section h1 span.logo-icon {
            color: #d12c2c;
            font-style: italic;
            margin-right: 8px;
            font-size: 28pt;
        }
        .logo-section p {
            color: #d12c2c;
            font-size: 9pt;
            font-family: Arial, sans-serif;
            margin-top: 2px;
            letter-spacing: 0.5px;
            margin-left: 50px;
        }
        .header-web {
            font-size: 9pt;
            font-family: Arial, sans-serif;
            color: #333;
            margin-top: 15px;
        }
        
        .seal-date-container {
             margin-bottom: 20px;
             position: relative;
        }
        .date-text {
            margin-bottom: 30px;
            margin-top: 40px;
            font-family: 'Times New Roman', serif;
        }
        
        .client-info-container {
             display: flex;
             justify-content: space-between;
             align-items: flex-start;
             margin-bottom: 20px;
        }
        
        .client-info {
             width: 60%;
        }
        .client-info h4 {
             font-size: 12pt;
             margin-bottom: 2px;
        }
        .client-info p {
             margin-bottom: 2px;
        }
        .client-details {
             margin-top: 15px;
        }
        
        .bill-tag {
             background: linear-gradient(to right, #000000, #333333);
             color: white;
             padding: 4px 20px;
             font-weight: bold;
             font-size: 14pt;
             display: inline-block;
             margin-top: 20px;
             margin-right: 50px;
             box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
             /* Slashed edges simulation */
             clip-path: polygon(10% 0, 100% 0%, 90% 100%, 0% 100%);
        }

        table.border-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0px; /* Removed margin to stick to totals */
        }
        table.border-table th, table.border-table td {
            border: 2px solid #000;
            padding: 6px 8px;
        }
        table.border-table th {
            font-weight: bold;
            text-align: center;
        }
        
        .in-words {
            font-weight: bold;
            font-style: italic;
            margin-bottom: 30px;
            margin-top: 15px;
        }
        
        .account-table {
            width: auto;
            border-collapse: collapse;
            margin-bottom: 60px;
        }
        .account-table td {
            padding: 2px 5px;
            vertical-align: top;
        }
        .account-table td:first-child {
            width: 120px;
        }
        .account-table td.val {
            color: #333;
        }
        
        .footer {
            margin-top: auto;
            width: 100%;
            background-color: transparent;
            color: #333;
            padding: 15px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5pt;
            font-family: monospace; /* Trying to match the typewriter/monospace font in footer */
            border-top: none;
        }
        .footer-col {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="page-background-top"></div>
    
    <div class="content-wrapper">
        <div class="header">
            ${settings?.invoice_logo_base64 ? `
                <img src="${settings.invoice_logo_base64}" alt="Company Logo" style="max-height: 50px;">
            ` : `
                <div class="logo-section">
                    <h1><span class="logo-icon">//</span> MICROMEDIA</h1>
                    <p>YOUR ONE-STOP PRINTSHOP</p>
                </div>
            `}
            <div class="header-web">
                ${settings?.website || 'www.micromediabd.com'}
            </div>
        </div>

        <div class="seal-date-container">
             <div class="date-text">
                 Date: ${formatDate(order.created_at)}
             </div>
        </div>
        
        <div class="client-info-container">
             <div class="client-info">
                 <h4 style="font-weight: bold;">TO</h4>
                 <h4 style="font-weight: bold;">${order.factory_customer_name?.toUpperCase() || 'CUSTOMER'}</h4>
                 <p>${order.billing_address?.contact_name || order.shipping_address?.contact_name || 'Contact Person'}</p>
                 
                 <div class="client-details">
                     <p>Phone: ${order.factory_customer_phone || ''}</p>
                     <p>Address: ${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}</p>
                 </div>
             </div>
             <div>
                  <div class="bill-tag">BILL</div>
             </div>
        </div>

        <table class="border-table">
            <thead>
                <tr>
                    <th style="width: 5%;">SN</th>
                    <th style="width: 45%;">Description</th>
                    <th style="width: 15%;">Quantity<br>(pcs)</th>
                    <th style="width: 15%;">Unit Price</th>
                    <th style="width: 20%;">Total Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr>
                     <td colspan="3" style="border: none;"></td>
                     <td style="font-weight: bold; text-align: right; background-color: #fff;">Total</td>
                     <td style="font-weight: bold; text-align: right;">${formatCurrency(grandTotal)}</td>
                </tr>
                <tr>
                     <td colspan="3" style="border: none;"></td>
                     <td style="font-weight: bold; text-align: right; background-color: #fff;">Advance</td>
                     <td style="font-weight: bold; text-align: right;">${formatCurrency(advance)}</td>
                </tr>
                <tr>
                     <td colspan="3" style="border: none;"></td>
                     <td style="font-weight: bold; text-align: right; background-color: #fff;">Due</td>
                     <td style="font-weight: bold; text-align: right;">${formatCurrency(due)}</td>
                </tr>
            </tbody>
        </table>

        <div class="in-words">
            ${numberToWords(due > 0 ? due : grandTotal)}
        </div>

        <table class="account-table">
            <tr><td>Account Name</td><td>:</td><td class="val">${settings?.account_name || 'MICROMEDIA'}</td></tr>
            <tr><td>Account Number</td><td>:</td><td class="val">${settings?.account_number || '2075898530001'}</td></tr>
            <tr><td>Bank Name</td><td>:</td><td class="val">${settings?.bank_name || 'Brac-Bank PLC'}</td></tr>
            <tr><td>Branch</td><td>:</td><td class="val">${settings?.bank_branch || 'Kawran Bazar Branch'}</td></tr>
            <tr><td>Routing Number</td><td>:</td><td class="val">${settings?.routing_number || '060261397'}</td></tr>
        </table>

        <!-- Signature section removed -->
    </div>

    <div class="footer">
        <div class="footer-col" style="white-space: pre-line;">
            ${settings?.company_address || '48,South Begunbari,Depika Masjid Market\nTejgaon I/A, Dhaka-1208.'}
        </div>
        <div class="footer-col" style="text-align: center; white-space: pre-line;">
            ${settings?.phone || '+8802223314188\n+8801894812920'}
        </div>
        <div class="footer-col" style="text-align: left; white-space: pre-line;">
            ${settings?.company_email || 'micromediaprinting@gmail.com'}\n${settings?.facebook_url || 'fb.com/micromediabd'}
        </div>
    </div>
</body>
</html>
    `;
  }

  // Generate PDF for invoice (Bill)
  public static async generateInvoicePDF(
    order: FactoryCustomerOrder,
    delivery?: import('@/types/factory').Delivery
  ): Promise<Buffer> {
    const action = "PDFGenerator.generateInvoicePDF";
    try {
      // Fetch company settings
      const settingsMediator = new SettingsMediator();
      const companySettings = await settingsMediator.getSettingsByCategory('company');
      
      const settingsData: any = {};
      for (const [key, setting] of Object.entries(companySettings)) {
        settingsData[key] = setting.value;
      }

      // Convert logo to base64 if it exists
      if (settingsData.invoice_logo) {
        try {
          const logoPath = path.join(process.cwd(), settingsData.invoice_logo);
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const extension = path.extname(logoPath).substring(1);
            const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
            settingsData.invoice_logo_base64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
          }
        } catch (logoError) {
          MyLogger.warn(`${action}.logoError`, logoError);
        }
      }

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generateInvoiceHTML(order, settingsData, delivery);

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true, // Need this for the background gradient
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });

      await page.close();

      MyLogger.success(action, {
        orderNumber: order.order_number,
        orderId: order.id,
        pdfSize: pdfBuffer.length
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { orderNumber: order.order_number, orderId: order.id });
      throw error;
    }
  }

  // Generate HTML template for Challan
  private static generateChallanHTML(
    order: FactoryCustomerOrder,
    settings?: any,
    delivery?: import('@/types/factory').Delivery
  ): string {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`; 
    };

    // When a delivery is provided, render only the items in that shipment.
    const challanRows = delivery?.items?.length
      ? delivery.items.map(it => ({
          product_name: it.product_name ?? '',
          description: it.description ?? '',
          quantity: it.quantity,
        }))
      : (order.line_items ?? []).map(li => ({
          product_name: li.product_name,
          description: li.description ?? '',
          quantity: li.quantity,
        }));

    const itemsHtml = challanRows.map((item, index) => {
      const descHtml = item.description ? `<br><span style="font-size: 10pt;">${item.description.replace(/\n/g, '<br>')}</span>` : '';

      return `
        <tr>
          <td style="text-align: center; vertical-align: top;">${String(index + 1).padStart(2, '0')}.</td>
          <td style="vertical-align: top;">
            ${item.product_name}
            ${descHtml}
          </td>
          <td style="text-align: center; vertical-align: bottom;">${item.quantity}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="3" style="text-align: center;">No items found</td></tr>';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Challan ${order.order_number}</title>
    <style>
        @page {
            size: A4;
            margin: 0; 
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html {
            height: 100%;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            color: #000;
            background: white;
            line-height: 1.3;
            position: relative;
            min-height: 295mm; /* Approximate A4 height */
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        
        .page-background-top {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 150px;
            background: linear-gradient(to right, #d0e8f2, #ffffff, #f9ebed);
            z-index: -2;
            opacity: 0.6;
        }
        
        .content-wrapper {
             padding: 40px 50px;
             position: relative;
             z-index: 10;
             flex: 1;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
        }
        .logo-section h1 {
            color: #555;
            font-size: 24pt;
            font-weight: bold;
            font-family: Arial, sans-serif;
            margin: 0;
            line-height: 1;
            display: flex;
            align-items: center;
        }
        .logo-section h1 span.logo-icon {
            color: #d12c2c;
            font-style: italic;
            margin-right: 8px;
            font-size: 28pt;
        }
        .logo-section p {
            color: #d12c2c;
            font-size: 9pt;
            font-family: Arial, sans-serif;
            margin-top: 2px;
            letter-spacing: 0.5px;
            margin-left: 50px;
        }
        .header-web {
            font-size: 9pt;
            font-family: Arial, sans-serif;
            color: #333;
            margin-top: 15px;
        }
        
        .seal-date-container {
             margin-bottom: 20px;
             position: relative;
        }
        .date-text {
            margin-bottom: 30px;
            margin-top: 40px;
            font-family: 'Times New Roman', serif;
        }
        
        .client-info-container {
             display: flex;
             justify-content: space-between;
             align-items: flex-start;
             margin-bottom: 20px;
        }
        
        .client-info {
             width: 60%;
        }
        .client-info h4 {
             font-size: 12pt;
             margin-bottom: 2px;
        }
        .client-info p {
             margin-bottom: 2px;
        }
        .client-details {
             margin-top: 15px;
        }
        
        .bill-tag {
             background: linear-gradient(to right, #000000, #333333);
             color: white;
             padding: 4px 20px;
             font-weight: bold;
             font-size: 14pt;
             display: inline-block;
             margin-top: 20px;
             margin-right: 50px;
             box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
             clip-path: polygon(10% 0, 100% 0%, 90% 100%, 0% 100%);
        }

        table.border-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 60px;
        }
        table.border-table th, table.border-table td {
            border: 2px solid #000;
            padding: 6px 8px;
        }
        table.border-table th {
            font-weight: bold;
            text-align: center;
        }
        
        .footer {
            margin-top: auto;
            width: 100%;
            background-color: transparent;
            color: #333;
            padding: 15px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5pt;
            font-family: monospace; 
            border-top: none;
        }
        .footer-col {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="page-background-top"></div>
    
    <div class="content-wrapper">
        <div class="header">
            ${settings?.invoice_logo_base64 ? `
                <img src="${settings.invoice_logo_base64}" alt="Company Logo" style="max-height: 50px;">
            ` : `
                <div class="logo-section">
                    <h1><span class="logo-icon">//</span> MICROMEDIA</h1>
                    <p>YOUR ONE-STOP PRINTSHOP</p>
                </div>
            `}
            <div class="header-web">
                ${settings?.website || 'www.micromediabd.com'}
            </div>
        </div>

        <div class="seal-date-container">
             <div class="date-text">
                 Date: ${formatDate(order.created_at)}
             </div>
        </div>
        
        <div class="client-info-container">
             <div class="client-info">
                 <h4 style="font-weight: bold;">TO</h4>
                 <h4 style="font-weight: bold;">${order.factory_customer_name?.toUpperCase() || 'CUSTOMER'}</h4>
                 <p>${order.billing_address?.contact_name || order.shipping_address?.contact_name || 'Contact Person'}</p>
                 
                 <div class="client-details">
                     <p>Phone: ${order.factory_customer_phone || ''}</p>
                     <p>Address: ${order.shipping_address?.street || ''}, ${order.shipping_address?.city || ''}</p>
                 </div>
             </div>
             <div>
                  <div class="bill-tag">CHALLAN</div>
             </div>
        </div>

        <table class="border-table">
            <thead>
                <tr>
                    <th style="width: 10%;">SN</th>
                    <th style="width: 70%;">Description</th>
                    <th style="width: 20%;">Quantity<br>(pcs)</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <!-- Signature section removed -->
    </div>

    <div class="footer">
        <div class="footer-col" style="white-space: pre-line;">
            ${settings?.company_address || '48,South Begunbari,Depika Masjid Market\nTejgaon I/A, Dhaka-1208.'}
        </div>
        <div class="footer-col" style="text-align: center; white-space: pre-line;">
            ${settings?.phone || '+8802223314188\n+8801894812920'}
        </div>
        <div class="footer-col" style="text-align: left; white-space: pre-line;">
            ${settings?.company_email || 'micromediaprinting@gmail.com'}\n${settings?.facebook_url || 'fb.com/micromediabd'}
        </div>
    </div>
</body>
</html>
    `;
  }

  // Generate PDF for Challan
  public static async generateChallanPDF(
    order: FactoryCustomerOrder,
    delivery?: import('@/types/factory').Delivery
  ): Promise<Buffer> {
    const action = "PDFGenerator.generateChallanPDF";
    try {
      // Fetch company settings
      const settingsMediator = new SettingsMediator();
      const companySettings = await settingsMediator.getSettingsByCategory('company');
      
      const settingsData: any = {};
      for (const [key, setting] of Object.entries(companySettings)) {
        settingsData[key] = setting.value;
      }

      // Convert logo to base64 if it exists
      if (settingsData.invoice_logo) {
        try {
          const logoPath = path.join(process.cwd(), settingsData.invoice_logo);
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const extension = path.extname(logoPath).substring(1);
            const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
            settingsData.invoice_logo_base64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
          }
        } catch (logoError) {
          MyLogger.warn(`${action}.logoError`, logoError);
        }
      }

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generateChallanHTML(order, settingsData, delivery);

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true, 
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });

      await page.close();

      MyLogger.success(action, { 
        orderNumber: order.order_number, 
        orderId: order.id,
        pdfSize: pdfBuffer.length 
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { orderNumber: order.order_number, orderId: order.id });
      throw error;
    }
  }

  /**
   * Generate payroll salary sheet PDF
   */
  static async generatePayrollSalarySheetPDF(
    periodName: string,
    details: Array<{
      employee_code: string;
      employee_name: string;
      department_name: string;
      designation_title: string;
      basic_salary: number;
      total_earnings: number;
      total_deductions: number;
      net_salary: number;
      status: string;
      payment_date?: string;
      payment_reference?: string;
    }>
  ): Promise<Buffer> {
    const action = "PDFGenerator.generatePayrollSalarySheetPDF";

    try {
      MyLogger.info(action, { periodName, rowCount: details.length });

      const settingsMediator = new SettingsMediator();
      const systemSettings = await settingsMediator.getSettingsByCategory('system');
      const currency = (systemSettings.default_currency?.value as string || 'USD').toUpperCase();

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
      };

      const rowsHtml = details.map((d) => `
        <tr>
          <td>${d.employee_code || '-'}</td>
          <td>${d.employee_name || '-'}</td>
          <td>${d.department_name || '-'}</td>
          <td>${d.designation_title || '-'}</td>
          <td style="text-align:right">${formatCurrency(parseFloat(String(d.basic_salary || 0)))}</td>
          <td style="text-align:right">${formatCurrency(parseFloat(String(d.total_earnings || 0)))}</td>
          <td style="text-align:right">${formatCurrency(parseFloat(String(d.total_deductions || 0)))}</td>
          <td style="text-align:right">${formatCurrency(parseFloat(String(d.net_salary || 0)))}</td>
          <td>${d.status || '-'}</td>
          <td>${d.payment_date ? new Date(d.payment_date).toLocaleDateString() : '-'}</td>
        </tr>
      `).join('');

      const totalEarnings = details.reduce((s, d) => s + parseFloat(String(d.total_earnings || 0)), 0);
      const totalDeductions = details.reduce((s, d) => s + parseFloat(String(d.total_deductions || 0)), 0);
      const totalNet = details.reduce((s, d) => s + parseFloat(String(d.net_salary || 0)), 0);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Salary Sheet - ${periodName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 12px; color: #333; padding: 20px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .period { color: #6b7280; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .totals { margin-top: 20px; font-weight: 600; }
    .totals td { border-bottom: none; }
  </style>
</head>
<body>
  <h1>Salary Sheet</h1>
  <p class="period">${periodName} - Generated ${new Date().toLocaleDateString()}</p>
  <table>
    <thead>
      <tr>
        <th>Employee ID</th>
        <th>Name</th>
        <th>Department</th>
        <th>Designation</th>
        <th>Basic Salary</th>
        <th>Total Earnings</th>
        <th>Total Deductions</th>
        <th>Net Salary</th>
        <th>Status</th>
        <th>Payment Date</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals">
        <td colspan="5" style="text-align:right">Total</td>
        <td style="text-align:right">${formatCurrency(totalEarnings)}</td>
        <td style="text-align:right">${formatCurrency(totalDeductions)}</td>
        <td style="text-align:right">${formatCurrency(totalNet)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      await page.close();

      MyLogger.success(action, { periodName, pdfSize: pdfBuffer.length });
      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { periodName });
      throw error;
    }
  }

  // Close browser instance
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
