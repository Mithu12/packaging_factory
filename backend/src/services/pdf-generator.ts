import puppeteer, { Browser, Page } from 'puppeteer';
import { PurchaseOrderWithDetails } from '@/types/purchaseOrder';
import { SalesInvoice } from '@/types/salesInvoice';
import { MyLogger } from '@/utils/new-logger';

export class PDFGenerator {
  private static browser: Browser | null = null;

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

  // Close browser instance
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
