import puppeteer, { Browser, Page } from 'puppeteer';
import {
  PurchaseOrderWithDetails,
  PurchaseOrderReceipt,
  PurchaseOrderReceiptLineItem,
} from '@/types/purchaseOrder';
import { SalesInvoice } from '@/types/salesInvoice';
import { FactoryCustomerOrder } from '@/types/factory';
import { MyLogger } from '@/utils/new-logger';
import SettingsMediator from '@/mediators/settings/SettingsMediator';
import pool from '@/database/connection';
import fs from 'fs';
import path from 'path';

const QUOTATION_PDF_BACKGROUND_FILE = 'quotation-pdf-background.png';
const QUOTATION_LOGO_FILE = 'quotation-logo.png';
const BILL_BACKGROUND_FILE = 'bill_background.jpg';

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

  /** Letterhead background applied to invoice + challan PDFs. */
  private static getBillBackgroundPath(): string {
    return path.join(__dirname, '..', 'utils', BILL_BACKGROUND_FILE);
  }

  /** Reads the bill background once per render and returns it as a base64 data URL. */
  private static loadBillBackgroundBase64(action: string): string | null {
    const bgPath = this.getBillBackgroundPath();
    if (!fs.existsSync(bgPath)) {
      MyLogger.warn(`${action}.billBackgroundMissing`, { path: bgPath });
      return null;
    }
    try {
      const buffer = fs.readFileSync(bgPath);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (error) {
      MyLogger.warn(`${action}.billBackgroundReadError`, { error, path: bgPath });
      return null;
    }
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
  private static generatePurchaseOrderHTML(
    purchaseOrder: PurchaseOrderWithDetails,
    settings: Record<string, any> = {},
  ): string {
    const escapeHtml = (raw: unknown) =>
      String(raw ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(amount || 0));

    const formatQty = (q: number) =>
      new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(q || 0));

    // dd.mm.yyyy — matches invoice / challan formatting.
    const formatDate = (dateString?: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    // Indian-numbering words (Lac/Crore), mirroring the invoice template.
    const numberToWords = (num: number): string => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const two = (n: number): string => n < 20 ? a[n] : (b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')).trim();
      const three = (n: number): string => {
        const h = Math.floor(n / 100), r = n % 100;
        return (h ? a[h] + ' Hundred' + (r ? ' ' + two(r) : '') : two(r)).trim();
      };
      const n = Math.floor(Math.abs(num));
      if (n === 0) return 'Zero';
      const crore = Math.floor(n / 10000000);
      const lac = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const rest = n % 1000;
      const parts: string[] = [];
      if (crore) parts.push(three(crore) + ' Crore');
      if (lac) parts.push(two(lac) + ' Lac');
      if (thousand) parts.push(two(thousand) + ' Thousand');
      if (rest) parts.push(three(rest));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    const lineItems = purchaseOrder.line_items ?? [];
    const subTotal = lineItems.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unit_price), 0);
    const totalQty = lineItems.reduce((sum, li) => sum + Number(li.quantity), 0);
    const grandTotal = Number(purchaseOrder.total_amount || subTotal);
    const grandTotalTaka = Math.trunc(grandTotal);
    const grandTotalPaisa = Math.round((grandTotal - grandTotalTaka) * 100);
    const amountInWords = grandTotalPaisa > 0
      ? `${numberToWords(grandTotalTaka)} and ${numberToWords(grandTotalPaisa)} Paisa`
      : numberToWords(grandTotalTaka);

    const itemsHtml = lineItems.length > 0
      ? lineItems.map((item, index) => {
          const totalPrice = Number(item.quantity) * Number(item.unit_price);
          const descHtml = item.description?.trim()
            ? `<div class="item-desc">${escapeHtml(item.description).replace(/\n/g, '<br>')}</div>`
            : '';
          const isLast = index === lineItems.length - 1;
          return `
        <tr class="item-row${isLast ? ' last-item-row' : ''}">
          <td class="col-sn">${index + 1}</td>
          <td class="col-particulars">
            <div class="item-name">${escapeHtml(item.product_name || '')}</div>
            ${item.product_sku ? `<div class="item-sku">SKU: ${escapeHtml(item.product_sku)}</div>` : ''}
            ${descHtml}
          </td>
          <td class="col-qty">${formatQty(Number(item.quantity))} ${escapeHtml(item.unit_of_measure || 'pcs')}</td>
          <td class="col-price">${formatCurrency(Number(item.unit_price))}</td>
          <td class="col-amount">${formatCurrency(totalPrice)}</td>
        </tr>`;
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:20px;">No items found</td></tr>';

    const supplierAddress = purchaseOrder.supplier.address?.trim() || '';
    const supplierContactBits = [
      purchaseOrder.supplier.contact_person,
      purchaseOrder.supplier.phone,
    ].filter(Boolean).join(' / ');
    const supplierEmail = purchaseOrder.supplier.email?.trim() || '';

    const billBgBase64 = settings?.bill_background_base64 as string | undefined;
    const hasBillBg = Boolean(billBgBase64);

    return `
<!DOCTYPE html>
<html lang="en"${hasBillBg ? ' class="bill-with-bg"' : ''}>
<head>
    <meta charset="UTF-8">
    <title>Purchase Order ${escapeHtml(purchaseOrder.po_number)}</title>
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ${hasBillBg ? `
        html.bill-with-bg, html.bill-with-bg body { background: #ffffff; }
        .bill-bg-layer {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            z-index: 0; pointer-events: none;
            background-image: url("${billBgBase64}");
            background-repeat: no-repeat;
            background-position: center top;
            background-size: 100% 100%;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        html.bill-with-bg body > *:not(.bill-bg-layer) { position: relative; z-index: 1; }
        ` : ''}
        body {
            font-family: Calibri, Arial, Helvetica, sans-serif;
            font-size: 11pt;
            color: #000;
            background: ${hasBillBg ? 'transparent' : 'white'};
            line-height: 1.35;
        }
        /* Top padding clears the letterhead band; bottom clears the footer band. */
        .page { padding: ${hasBillBg ? '50mm 18mm 25mm 18mm' : '18mm 18mm 20mm 18mm'}; }

        .title {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }
        .header-row { display: flex; gap: 0; margin-bottom: 14px; }
        .box { border: 1px solid #000; padding: 10px 12px; min-height: 120px; }
        .box.supplier { flex: 1.2; border-right: 0; }
        .box.po-details { flex: 1; }
        .box .heading { font-weight: bold; margin-bottom: 8px; }
        .kv-line { margin-bottom: 4px; white-space: nowrap; }
        .kv-line .k { display: inline-block; min-width: 110px; }
        .kv-line .label { font-weight: bold; }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
        }
        table.items th, table.items td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.items th { text-align: center; font-weight: bold; background: #fff; }
        .col-sn { width: 7%; text-align: center; }
        .col-particulars { width: 47%; }
        .col-qty { width: 14%; text-align: center; }
        .col-price { width: 14%; text-align: right; }
        .col-amount { width: 18%; text-align: right; }

        .item-row .col-particulars { padding-top: 10px; padding-bottom: 10px; }
        .item-name { font-weight: 600; }
        .item-sku { margin-top: 2px; font-size: 9.5pt; }
        .item-desc { margin-top: 3px; font-size: 9.5pt; }

        .filler-row td { height: 140px; border-top: 0 !important; border-bottom: 0; }
        .last-item-row td { border-bottom: 0 !important; }

        .totals-row td { font-weight: bold; }
        .totals-row td.label { text-align: right; }

        .in-words { margin-top: 20px; font-weight: bold; }

        .terms {
            margin-top: 16px;
            font-size: 10pt;
        }
        .terms .heading { font-weight: bold; margin-bottom: 4px; }
        .terms .line { margin-bottom: 2px; }

        .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        .sign-col { flex: 1; text-align: center; font-size: 10.5pt; }
        .sign-line {
            border-top: 1px solid #000;
            width: 70%;
            margin: 0 auto 4px auto;
            height: 0;
        }
    </style>
</head>
<body>
    ${hasBillBg ? '<div class="bill-bg-layer" aria-hidden="true"></div>' : ''}
    <div class="page">
        <div class="title">PURCHASE ORDER</div>

        <div class="header-row">
            <div class="box supplier">
                <div class="heading">Supplier</div>
                <div class="kv-line"><span class="k label">Company</span> :- ${escapeHtml(purchaseOrder.supplier.name)}</div>
                ${supplierAddress ? `<div class="kv-line"><span class="k label">Address</span> :- ${escapeHtml(supplierAddress)}</div>` : ''}
                ${supplierContactBits ? `<div class="kv-line"><span class="k label">Contact</span> :- ${escapeHtml(supplierContactBits)}</div>` : ''}
                ${supplierEmail ? `<div class="kv-line"><span class="k label">Email</span> :- ${escapeHtml(supplierEmail)}</div>` : ''}
            </div>
            <div class="box po-details">
                <div class="kv-line"><span class="k label">PO No</span> :- ${escapeHtml(purchaseOrder.po_number)}</div>
                <div class="kv-line"><span class="k label">Order Date</span> :- ${formatDate(purchaseOrder.order_date)}</div>
                <div class="kv-line"><span class="k label">Expected</span> :- ${formatDate(purchaseOrder.expected_delivery_date)}</div>
                ${purchaseOrder.actual_delivery_date ? `<div class="kv-line"><span class="k label">Delivered</span> :- ${formatDate(purchaseOrder.actual_delivery_date)}</div>` : ''}
                <div class="kv-line"><span class="k label">Payment</span> :- ${escapeHtml(purchaseOrder.payment_terms || '')}</div>
                <div class="kv-line"><span class="k label">Delivery</span> :- ${escapeHtml(purchaseOrder.delivery_terms || '')}</div>
                <div class="kv-line"><span class="k label">Status</span> :- ${escapeHtml(purchaseOrder.status.replace(/_/g, ' ').toUpperCase())}</div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th class="col-sn">Sl. No</th>
                    <th class="col-particulars">Particulars</th>
                    <th class="col-qty">Quantity</th>
                    <th class="col-price">Unit Price</th>
                    <th class="col-amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr class="filler-row">
                    <td class="col-sn"></td>
                    <td class="col-particulars"></td>
                    <td class="col-qty"></td>
                    <td class="col-price"></td>
                    <td class="col-amount"></td>
                </tr>
                <tr class="totals-row">
                    <td colspan="2" class="label">Sub Total</td>
                    <td class="col-qty">${formatQty(totalQty)}</td>
                    <td></td>
                    <td class="col-amount">${formatCurrency(subTotal)}</td>
                </tr>
                <tr class="totals-row">
                    <td colspan="2" class="label">Total Amount</td>
                    <td></td>
                    <td></td>
                    <td class="col-amount">${formatCurrency(grandTotal)}</td>
                </tr>
            </tbody>
        </table>

        <div class="in-words">Amount In Words: ${escapeHtml(amountInWords)} Only</div>

        ${purchaseOrder.notes?.trim() ? `
        <div class="terms">
            <div class="heading">Notes</div>
            <div class="line">${escapeHtml(purchaseOrder.notes).replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        <div class="signatures">
            <div class="sign-col">
                <div class="sign-line"></div>
                Prepared By
            </div>
            <div class="sign-col">
                <div class="sign-line"></div>
                Approved By
            </div>
            <div class="sign-col">
                <div class="sign-line"></div>
                Authorized Signature
            </div>
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

      // Fetch company settings for the header (name, address, phone, email)
      const settingsData: Record<string, any> = {};
      try {
        const settingsMediator = new SettingsMediator();
        const companySettings = await settingsMediator.getSettingsByCategory('company');
        for (const [key, setting] of Object.entries(companySettings)) {
          settingsData[key] = setting.value;
        }
      } catch (settingsError) {
        MyLogger.warn(`${action}.settingsError`, settingsError);
      }

      const billBg = this.loadBillBackgroundBase64(action);
      if (billBg) settingsData.bill_background_base64 = billBg;

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generatePurchaseOrderHTML(purchaseOrder, settingsData);

      // Set content and wait for it to load
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF. Zero Chromium margins so the letterhead background can
      // print edge-to-edge; the HTML reserves its own header / footer bands.
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: billBg
          ? { top: '0px', right: '0px', bottom: '0px', left: '0px' }
          : { top: '20px', right: '20px', bottom: '20px', left: '20px' },
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
                <td>VAT ${invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}</td>
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
                <td><strong>VAT:</strong></td>
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

  // Generate HTML template for invoice (Bill) — BD-style tax invoice.
  // Renders a Customer box (left) + Invoice Details box (right), a Particulars table,
  // Sub Total / VAT / Total rows, an Amount-in-Words line, and three signature lines.
  private static generateInvoiceHTML(
    order: FactoryCustomerOrder,
    settings?: any,
    delivery?: import('@/types/factory').Delivery,
    /** Authoritative totals from the persisted invoice row, if any. */
    invoiceTotals?: { subtotal: number | null; tax_amount: number | null }
  ): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);

    const formatQty = (q: number) =>
      new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(q);

    // Mock uses dot-separated dates: 31.03.2026
    const formatDate = (dateString?: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Number to words (Indian numbering: Lac/Thousand/Hundred). Returns "One Lac Thirty Six Thousand..." style.
    const numberToWords = (num: number): string => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      const two = (n: number): string => {
        if (n < 20) return a[n];
        return (b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')).trim();
      };
      const three = (n: number): string => {
        const h = Math.floor(n / 100);
        const r = n % 100;
        return (h ? a[h] + ' Hundred' + (r ? ' ' + two(r) : '') : two(r)).trim();
      };

      const n = Math.floor(Math.abs(num));
      if (n === 0) return 'Zero';
      const crore = Math.floor(n / 10000000);
      const lac = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const rest = n % 1000;

      const parts: string[] = [];
      if (crore) parts.push(three(crore) + ' Crore');
      if (lac) parts.push(two(lac) + ' Lac');
      if (thousand) parts.push(two(thousand) + ' Thousand');
      if (rest) parts.push(three(rest));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    // When a delivery is provided, render only that shipment's lines.
    // Otherwise fall back to whole-order rendering for legacy callers.
    const renderRows = delivery?.items?.length
      ? delivery.items.map(it => ({
          product_name: it.product_name ?? '',
          description: it.description ?? '',
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price_snapshot),
          line_total: Number(it.line_total),
          ply: it.ply ?? null,
        }))
      : (order.line_items ?? []).map(li => ({
          product_name: li.product_name,
          description: li.description ?? '',
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
          line_total: Number(li.quantity) * Number(li.unit_price),
          ply: li.ply ?? null,
        }));

    const itemsHtml = renderRows.map((item, index) => {
      const descLines = item.description
        ? `<div class="item-desc">${escapeHtml(item.description).replace(/\n/g, '<br>')}</div>`
        : '';
      const plyLine = item.ply != null
        ? `<div class="item-ply">${String(item.ply).padStart(2, '0')} Ply</div>`
        : '';
      const isLast = index === renderRows.length - 1;
      const rowClass = `item-row${isLast ? ' last-item-row' : ''}`;
      return `
        <tr class="${rowClass}">
          <td class="col-sn">${index + 1}</td>
          <td class="col-particulars">
            <div class="item-name">${escapeHtml(item.product_name || '')}</div>
            ${plyLine}
            ${descLines}
          </td>
          <td class="col-qty">${formatQty(item.quantity)}</td>
          <td class="col-price">${formatCurrency(item.unit_price)}</td>
          <td class="col-amount">${formatCurrency(item.line_total)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;">No items found</td></tr>';

    // Totals — keep paisa precision throughout. When the caller supplies the
    // persisted invoice totals (which already account for multi-rate VAT and
    // are the authoritative numbers on factory_sales_invoices), use those.
    // Otherwise derive from line totals.
    const subTotal = invoiceTotals?.subtotal != null
      ? invoiceTotals.subtotal
      : +renderRows.reduce((sum, r) => sum + r.line_total, 0).toFixed(2);
    const subTotalQty = renderRows.reduce((sum, r) => sum + r.quantity, 0);
    const vatPct = order.tax_rate != null && order.tax_rate > 0 ? Number(order.tax_rate) : 0;
    const vatAmount = invoiceTotals?.tax_amount != null
      ? invoiceTotals.tax_amount
      : +((subTotal * vatPct) / 100).toFixed(2);
    const grandTotal = +(subTotal + vatAmount).toFixed(2);
    // Words mirror the printed total: include "and X Paisa" only when paisa remain.
    const grandTotalTaka = Math.trunc(grandTotal);
    const grandTotalPaisa = Math.round((grandTotal - grandTotalTaka) * 100);
    const amountInWords = grandTotalPaisa > 0
      ? `${numberToWords(grandTotalTaka)} and ${numberToWords(grandTotalPaisa)} Paisa`
      : numberToWords(grandTotalTaka);

    // Invoice header values — sourced primarily from the linked delivery (per-delivery invoice).
    const invoiceNo = delivery?.invoice_number || delivery?.delivery_number || order.order_number || '';
    const invoiceDate = formatDate(delivery?.created_at || order.created_at);
    const challanNo = delivery?.delivery_number || '';
    const vatNo = delivery?.vat_number || order.customer_vat_number || '';
    const deliveryDate = formatDate(delivery?.delivery_date);
    // For multi-order deliveries, concatenate touched orders' PO numbers in the header.
    const touched = delivery?.touched_orders ?? [];
    const touchedPoNumbers = touched.map(t => t.po_number).filter((p): p is string => !!p);
    const touchedPoDates = touched
      .map(t => t.po_date)
      .filter((d): d is string => !!d)
      .sort();
    const poNumber = touchedPoNumbers.length > 0
      ? touchedPoNumbers.join(', ')
      : (order.po_number || '');
    const poDate = formatDate(touchedPoDates[0] ?? order.po_date);

    // Customer block — company name comes from the customer's `company` field;
    // billing address prefers the single-line shape, falling back to legacy structured fields,
    // then to shipping data as a last resort.
    const customerCompany = order.customer_company || '';
    const billingStructured = [
      order.billing_address?.street,
      order.billing_address?.city,
      order.billing_address?.postal_code,
    ].filter(Boolean).join(', ');
    const shippingStructured = [
      order.shipping_address?.street,
      order.shipping_address?.city,
      order.shipping_address?.postal_code,
    ].filter(Boolean).join(', ');
    const customerAddress =
      order.billing_address?.billing_line ||
      billingStructured ||
      order.shipping_address?.shipping_line ||
      shippingStructured ||
      '';
    // Address must print on a single kv-line; collapse embedded newlines so the
    // billing_line freeform input doesn't force a visual wrap.
    const customerAddressOneLine = customerAddress.replace(/\s*\r?\n\s*/g, ', ').trim();

    const billBgBase64 = settings?.bill_background_base64 as string | undefined;
    const hasBillBg = Boolean(billBgBase64);

    return `
<!DOCTYPE html>
<html${hasBillBg ? ' class="bill-with-bg"' : ''}>
<head>
    <meta charset="UTF-8">
    <title>Bill ${escapeHtml(order.order_number || '')}</title>
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ${hasBillBg ? `
        html.bill-with-bg, html.bill-with-bg body { background: #ffffff; }
        .bill-bg-layer {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            z-index: 0; pointer-events: none;
            background-image: url("${billBgBase64}");
            background-repeat: no-repeat;
            background-position: center top;
            background-size: 100% 100%;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        html.bill-with-bg body > *:not(.bill-bg-layer) { position: relative; z-index: 1; }
        ` : ''}
        body {
            font-family: Calibri, Arial, Helvetica, sans-serif;
            font-size: 11pt;
            color: #000;
            background: ${hasBillBg ? 'transparent' : 'white'};
            line-height: 1.35;
        }
        /* Top padding leaves space for the pre-printed company letterhead;
           bottom padding clears the footer band on the background image. */
        .page { padding: 50mm 18mm 25mm 18mm; }
        .title {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }
        .header-row {
            display: flex;
            gap: 0;
            margin-bottom: 14px;
        }
        .box {
            border: 1px solid #000;
            padding: 10px 12px;
            min-height: 140px;
        }
        .box.customer {
            flex: 1.2;
            border-right: 0;
        }
        .box.invoice-details {
            flex: 1;
        }
        .box .label { font-weight: bold; }
        .box .customer-heading { font-weight: bold; margin-bottom: 8px; }
        .kv-line { margin-bottom: 4px; white-space: nowrap; }
        .kv-line .k { display: inline-block; min-width: 110px; }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
        }
        table.items th, table.items td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.items th {
            text-align: center;
            font-weight: bold;
            background: #fff;
        }
        .col-sn { width: 8%; text-align: center; }
        .col-particulars { width: 47%; }
        .col-qty { width: 13%; text-align: center; }
        .col-price { width: 14%; text-align: center; }
        .col-amount { width: 18%; text-align: right; }

        .item-row .col-particulars { padding-top: 14px; padding-bottom: 14px; }
        .item-heading { font-weight: normal; }
        .item-name { margin-top: 4px; }
        .item-ply { margin-top: 2px; font-size: 10.5pt; font-weight: 600; }
        .item-desc { margin-top: 4px; font-size: 10.5pt; }

        /* Reserved blank space below items so the rows-region looks tall like the mock */
        .filler-row td { height: 180px; border-top: 0 !important; border-bottom: 0; }
        .last-item-row td { border-bottom: 0 !important; }

        .totals-row td {
            text-align: right;
            font-weight: bold;
        }
        .totals-row td.label {
            text-align: right;
        }

        .in-words {
            margin-top: 24px;
            font-weight: bold;
        }

        .signatures {
            margin-top: 70px;
            display: flex;
            justify-content: space-between;
        }
        .sign-col {
            flex: 1;
            text-align: center;
            font-size: 10.5pt;
        }
        .sign-line {
            border-top: 1px solid #000;
            width: 70%;
            margin: 0 auto 4px auto;
            height: 0;
        }
    </style>
</head>
<body>
    ${hasBillBg ? '<div class="bill-bg-layer" aria-hidden="true"></div>' : ''}
    <div class="page">
        <div class="title">INVOICE</div>

        <div class="header-row">
            <div class="box customer">
                <div class="customer-heading">Customer</div>
                <div class="kv-line"><span class="label">Company Name</span> :- ${escapeHtml(customerCompany)}</div>
                <div class="kv-line"><span class="label">Billing Address</span> :- ${escapeHtml(customerAddressOneLine)}</div>
            </div>
            <div class="box invoice-details">
                <div class="kv-line"><span class="k label">Invoice No</span> :- ${escapeHtml(String(invoiceNo))}</div>
                <div class="kv-line"><span class="k label">Invoice Date</span> :- ${escapeHtml(invoiceDate)}</div>
                <div class="kv-line"><span class="k label">Challan No</span> :- ${escapeHtml(String(challanNo))}</div>
                <div class="kv-line"><span class="k label">VAT No</span> :- ${escapeHtml(String(vatNo))}</div>
                <div class="kv-line"><span class="k label">Delivery Date</span> :- ${escapeHtml(deliveryDate)}</div>
                <div class="kv-line"><span class="k label">PO No</span> :- ${escapeHtml(String(poNumber))}</div>
                <div class="kv-line"><span class="k label">PO Date</span> :- ${escapeHtml(poDate)}</div>
                <div class="kv-line"><span class="k label">PR No</span> :- ${escapeHtml(String(order.pr_no || ''))}</div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th class="col-sn">Sl. No</th>
                    <th class="col-particulars">Particulars</th>
                    <th class="col-qty">Quantity</th>
                    <th class="col-price">Unit Price</th>
                    <th class="col-amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr class="filler-row">
                    <td class="col-sn"></td>
                    <td class="col-particulars"></td>
                    <td class="col-qty"></td>
                    <td class="col-price"></td>
                    <td class="col-amount"></td>
                </tr>
                <tr class="totals-row">
                    <td colspan="2" class="label">Sub Total</td>
                    <td class="col-qty">${formatQty(subTotalQty)}</td>
                    <td></td>
                    <td class="col-amount">${formatCurrency(subTotal)}</td>
                </tr>
                ${vatPct > 0 ? `
                <tr class="totals-row">
                    <td colspan="2" class="label">Add VAT ${vatPct}%</td>
                    <td></td>
                    <td></td>
                    <td class="col-amount">${formatCurrency(vatAmount)}</td>
                </tr>` : ''}
                <tr class="totals-row">
                    <td colspan="2" class="label">Total Amount</td>
                    <td></td>
                    <td></td>
                    <td class="col-amount">${formatCurrency(grandTotal)}</td>
                </tr>
            </tbody>
        </table>

        <div class="in-words">Amount In Words: ${escapeHtml(amountInWords)} Only</div>

        <div class="signatures">
            <div class="sign-col">
                <div class="sign-line"></div>
                Received by
            </div>
            <div class="sign-col">
                <div class="sign-line"></div>
                Manager
            </div>
            <div class="sign-col">
                <div class="sign-line"></div>
                Authorized Signature
            </div>
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

      const billBg = this.loadBillBackgroundBase64(action);
      if (billBg) settingsData.bill_background_base64 = billBg;

      // Load persisted invoice totals so the printed numbers match the
      // ledger exactly (multi-rate VAT, paisa precision).
      let invoiceTotals: { subtotal: number | null; tax_amount: number | null } | undefined;
      if (delivery?.invoice_id) {
        const invRes = await pool.query<{ subtotal: string | null; tax_amount: string | null }>(
          'SELECT subtotal, tax_amount FROM factory_sales_invoices WHERE id = $1',
          [delivery.invoice_id],
        );
        if (invRes.rows.length > 0) {
          invoiceTotals = {
            subtotal: invRes.rows[0].subtotal != null ? parseFloat(invRes.rows[0].subtotal) : null,
            tax_amount: invRes.rows[0].tax_amount != null ? parseFloat(invRes.rows[0].tax_amount) : null,
          };
        }
      }

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Generate HTML content
      const html = this.generateInvoiceHTML(order, settingsData, delivery, invoiceTotals);

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
  // Generate HTML template for Challan — BD-style delivery challan with letterhead,
  // boxed details (Challan No / Delivery Date / Company / Address / Transport, WO / VAT)
  // and a particulars table with Item Code + Bundle columns.
  private static generateChallanHTML(
    order: FactoryCustomerOrder,
    settings?: any,
    delivery?: import('@/types/factory').Delivery
  ): string {
    const formatDate = (dateString?: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const formatQty = (q: number) =>
      new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(q);

    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const numberToWords = (num: number): string => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const two = (n: number): string => n < 20 ? a[n] : (b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')).trim();
      const three = (n: number): string => {
        const h = Math.floor(n / 100), r = n % 100;
        return (h ? a[h] + ' Hundred' + (r ? ' ' + two(r) : '') : two(r)).trim();
      };
      const n = Math.floor(Math.abs(num));
      if (n === 0) return 'Zero';
      const crore = Math.floor(n / 10000000);
      const lac = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const rest = n % 1000;
      const parts: string[] = [];
      if (crore) parts.push(three(crore) + ' Crore');
      if (lac) parts.push(two(lac) + ' Lac');
      if (thousand) parts.push(two(thousand) + ' Thousand');
      if (rest) parts.push(three(rest));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    // When a delivery is provided, render only the items in that shipment.
    const challanRows = delivery?.items?.length
      ? delivery.items.map(it => ({
          product_name: it.product_name ?? '',
          product_sku: it.product_sku ?? '',
          description: it.description ?? '',
          quantity: Number(it.quantity),
          ply: it.ply ?? null,
          item_code: it.item_code ?? '',
          bundles: it.bundles ?? null,
        }))
      : (order.line_items ?? []).map(li => ({
          product_name: li.product_name,
          product_sku: li.product_sku ?? '',
          description: li.description ?? '',
          quantity: Number(li.quantity),
          ply: li.ply ?? null,
          item_code: li.customer_item_code ?? '',
          bundles: null as string | null,
        }));

    // Challan-only carton labels (delivery-level). The invoice deliberately omits these.
    // Both lines are hidden entirely when their respective fields are blank, so an
    // operator who skipped them doesn't see an empty "Master Carton For:" on the page.
    const masterCartonFor = delivery?.master_carton_for?.trim() || '';
    const masterCartonSubLabel = delivery?.master_carton_sub_label?.trim() || '';
    const masterCartonHeading = masterCartonFor
      ? `<div class="item-heading">${escapeHtml(masterCartonFor)}</div>`
      : '';
    const subLabelLine = masterCartonSubLabel
      ? `<div class="item-sub-label">${escapeHtml(masterCartonSubLabel)}</div>`
      : '';

    const itemsHtml = challanRows.map((item, index) => {
      const descLines = item.description
        ? `<div class="item-desc">${escapeHtml(item.description).replace(/\n/g, '<br>')}</div>`
        : '';
      const plyLine = item.ply != null
        ? `<div class="item-ply">${String(item.ply).padStart(2, '0')} Ply</div>`
        : '';
      const isLast = index === challanRows.length - 1;
      const rowClass = `item-row${isLast ? ' last-item-row' : ''}`;
      const bundleCell = item.bundles != null ? String(item.bundles) : '';
      return `
        <tr class="${rowClass}">
          <td class="col-sn">${String(index + 1).padStart(2, '0')}</td>
          <td class="col-particulars">
            ${masterCartonHeading}
            ${subLabelLine}
            <div class="item-name">${escapeHtml(item.product_name || '')}</div>
            ${plyLine}
            ${descLines}
          </td>
          <td class="col-code">${escapeHtml(item.item_code || '')}</td>
          <td class="col-qty">${formatQty(item.quantity)} Pcs.</td>
          <td class="col-bundle">${escapeHtml(bundleCell)}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;">No items found</td></tr>';

    const totalQty = challanRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalInWords = numberToWords(Math.round(totalQty));

    // Header letterhead — settings-driven, with fallbacks.
    const companyName = settings?.company_name || 'Company Name';
    const companyNameBn = settings?.company_name_bn || '';
    const companyAddress = settings?.company_address || '';
    const phone = settings?.phone || '';
    const email = settings?.company_email || '';
    const tagline = settings?.company_tagline || '';

    // Detail fields
    const challanNo = delivery?.delivery_number || order.order_number || '';
    const deliveryDate = formatDate(delivery?.delivery_date);
    const customerCompany = order.customer_company || '';
    const shippingStructured = [
      order.shipping_address?.street,
      order.shipping_address?.city,
      order.shipping_address?.postal_code,
    ].filter(Boolean).join(', ');
    const billingStructured = [
      order.billing_address?.street,
      order.billing_address?.city,
      order.billing_address?.postal_code,
    ].filter(Boolean).join(', ');
    const customerAddress =
      order.shipping_address?.shipping_line ||
      shippingStructured ||
      order.billing_address?.billing_line ||
      billingStructured ||
      '';
    const transportNo = delivery?.tracking_number || '';
    // For multi-order deliveries, concatenate touched orders' PO numbers in the header.
    const touchedChallan = delivery?.touched_orders ?? [];
    const touchedChallanPoNumbers = touchedChallan
      .map(t => t.po_number)
      .filter((p): p is string => !!p);
    const touchedChallanPoDates = touchedChallan
      .map(t => t.po_date)
      .filter((d): d is string => !!d)
      .sort();
    const customerPoNo = touchedChallanPoNumbers.length > 0
      ? touchedChallanPoNumbers.join(', ')
      : (order.po_number || '');
    const customerPoDate = formatDate(touchedChallanPoDates[0] ?? order.po_date);
    const vatNo = delivery?.vat_number || order.customer_vat_number || '';

    const billBgBase64 = settings?.bill_background_base64 as string | undefined;
    const hasBillBg = Boolean(billBgBase64);

    return `
<!DOCTYPE html>
<html${hasBillBg ? ' class="bill-with-bg"' : ''}>
<head>
    <meta charset="UTF-8">
    <title>Challan ${escapeHtml(delivery?.delivery_number || order.order_number || '')}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ${hasBillBg ? `
        html.bill-with-bg, html.bill-with-bg body { background: #ffffff; }
        .bill-bg-layer {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            z-index: 0; pointer-events: none;
            background-image: url("${billBgBase64}");
            background-repeat: no-repeat;
            background-position: center top;
            background-size: 100% 100%;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        html.bill-with-bg body > *:not(.bill-bg-layer) { position: relative; z-index: 1; }
        ` : ''}
        body {
            font-family: Calibri, Arial, Helvetica, sans-serif;
            font-size: 11pt;
            color: #000;
            background: ${hasBillBg ? 'transparent' : 'white'};
            line-height: 1.35;
        }
        .bn { font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; }
        /* When the background letterhead is applied, reserve the header / footer bands. */
        .page { padding: ${hasBillBg ? '50mm 18mm 25mm 18mm' : '18mm 18mm 20mm 18mm'}; }

        .letterhead { text-align: center; margin-bottom: 8px; }
        .letterhead .company-name {
            font-weight: bold;
            font-size: 18pt;
            letter-spacing: 0.5px;
        }
        .letterhead .company-name-bn {
            font-weight: bold;
            font-size: 15pt;
            margin-top: 2px;
        }
        .letterhead .address,
        .letterhead .phone,
        .letterhead .email {
            font-size: 10.5pt;
            margin-top: 4px;
        }
        .letterhead .tagline {
            font-weight: bold;
            font-size: 10.5pt;
            margin-top: 4px;
        }

        .challan-tag-wrap { text-align: center; margin: 10px 0 12px 0; }
        .challan-tag {
            display: inline-block;
            border: 1px solid #000;
            padding: 4px 28px;
            font-weight: bold;
            font-size: 13pt;
            letter-spacing: 1px;
        }

        .details {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        .details .col { flex: 1; }
        .kv-box {
            display: flex;
            border: 1px solid #000;
            margin-bottom: 4px;
            min-height: 24px;
        }
        .kv-box .k {
            padding: 4px 8px;
            min-width: 110px;
            font-weight: normal;
            border-right: 1px solid #000;
        }
        .kv-box .v {
            padding: 4px 8px;
            flex: 1;
            font-weight: bold;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        table.items th, table.items td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.items th {
            text-align: center;
            font-weight: bold;
        }
        .col-sn { width: 7%; text-align: center; }
        .col-particulars { width: 47%; }
        .col-code { width: 13%; text-align: center; }
        .col-qty { width: 15%; text-align: center; }
        .col-bundle { width: 18%; text-align: center; }
        .item-row .col-particulars { padding-top: 14px; padding-bottom: 14px; }
        .item-heading { font-weight: 600; }
        .item-sub-label { margin-top: 2px; font-size: 10.5pt; font-weight: 600; }
        .item-name { margin-top: 4px; }
        .item-ply { margin-top: 2px; font-size: 10.5pt; font-weight: 600; }
        .item-desc { margin-top: 4px; font-size: 10.5pt; white-space: pre-line; }

        .filler-row td { height: 240px; border-top: 0 !important; border-bottom: 0; }
        .last-item-row td { border-bottom: 0 !important; }

        .totals-row td {
            font-weight: bold;
        }
        .totals-row td.label { text-align: right; }

        .in-words {
            margin-top: 20px;
            font-size: 10.5pt;
        }

        .signatures {
            margin-top: 70px;
            display: flex;
            justify-content: space-between;
        }
        .sign-col {
            flex: 1;
            text-align: center;
            font-size: 10.5pt;
        }
        .sign-line {
            border-top: 1px solid #000;
            width: 70%;
            margin: 0 auto 4px auto;
            height: 0;
        }
    </style>
</head>
<body>
    ${hasBillBg ? '<div class="bill-bg-layer" aria-hidden="true"></div>' : ''}
    <div class="page">
        ${hasBillBg ? '' : `<div class="letterhead">
            <div class="company-name">${escapeHtml(companyName)}</div>
            ${companyNameBn ? `<div class="company-name-bn bn">${escapeHtml(companyNameBn)}</div>` : ''}
            ${companyAddress ? `<div class="address">${escapeHtml(companyAddress)}</div>` : ''}
            ${phone ? `<div class="phone">Mobile : ${escapeHtml(phone)}</div>` : ''}
            ${email ? `<div class="email">E-mail : ${escapeHtml(email)}</div>` : ''}
            ${tagline ? `<div class="tagline">${escapeHtml(tagline)}</div>` : ''}
        </div>`}

        <div class="challan-tag-wrap">
            <div class="challan-tag">CHALLAN</div>
        </div>

        <div class="details">
            <div class="col">
                <div class="kv-box"><div class="k">Challan No</div><div class="v">: ${escapeHtml(String(challanNo))}</div></div>
                <div class="kv-box"><div class="k">Delivery Date</div><div class="v">: ${escapeHtml(deliveryDate)}</div></div>
                <div class="kv-box"><div class="k">Company Name</div><div class="v">: ${escapeHtml(customerCompany)}</div></div>
                <div class="kv-box"><div class="k">Delivery Address</div><div class="v">: ${escapeHtml(customerAddress)}</div></div>
                <div class="kv-box"><div class="k">Transport No</div><div class="v">: ${escapeHtml(transportNo)}</div></div>
            </div>
            <div class="col">
                <div class="kv-box"><div class="k">PO No</div><div class="v">: ${escapeHtml(String(customerPoNo))}</div></div>
                <div class="kv-box"><div class="k">PO Date</div><div class="v">: ${escapeHtml(customerPoDate)}</div></div>
                <div class="kv-box"><div class="k">VAT NO</div><div class="v">: ${escapeHtml(String(vatNo))}</div></div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th class="col-sn">Sl. No</th>
                    <th class="col-particulars">Particulars</th>
                    <th class="col-code">Item Code</th>
                    <th class="col-qty">Quantity</th>
                    <th class="col-bundle">Bundle</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr class="filler-row">
                    <td class="col-sn"></td>
                    <td class="col-particulars"></td>
                    <td class="col-code"></td>
                    <td class="col-qty"></td>
                    <td class="col-bundle"></td>
                </tr>
                <tr class="totals-row">
                    <td colspan="3" class="label">Total:-</td>
                    <td class="col-qty">${formatQty(totalQty)} Pcs.</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div class="in-words">(in Words): ${escapeHtml(totalInWords)} Only.</div>

        <div class="signatures">
            <div class="sign-col">
                <div class="sign-line"></div>
                Received by
            </div>
            <div class="sign-col">
                <div class="sign-line"></div>
                Manager
            </div>
            <div class="sign-col">
                <div class="sign-line"></div>
                Authorized Signature
            </div>
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

      const billBg = this.loadBillBackgroundBase64(action);
      if (billBg) settingsData.bill_background_base64 = billBg;

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

  // Generate HTML template for a Goods Receipt Note (GRN)
  private static generateGoodsReceiptNoteHTML(
    receipt: PurchaseOrderReceipt,
    lineItems: PurchaseOrderReceiptLineItem[],
    purchaseOrder: PurchaseOrderWithDetails
  ): string {
    const fmtMoney = (n: number) =>
      `৳ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const fmtQty = (n: number | undefined) =>
      n == null ? '-' : Number(n).toLocaleString('en-IN');

    const supplierName = purchaseOrder.supplier?.name || (purchaseOrder as any).supplier_name || '';
    const supplierAddress = purchaseOrder.supplier?.address || '';

    const rowsHtml = lineItems.map((li, idx) => {
      const value = (li.received_quantity || 0) * (li.unit_price || 0);
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <div class="prod-name">${li.product_name || ''}</div>
            <div class="prod-sku">SKU: ${li.product_sku || ''}</div>
          </td>
          <td class="num">${fmtQty(li.ordered_quantity)} ${li.unit_of_measure || ''}</td>
          <td class="num">${fmtQty(li.received_quantity)} ${li.unit_of_measure || ''}</td>
          <td class="num">${fmtQty(li.cumulative_received)} ${li.unit_of_measure || ''}</td>
          <td>${(li.condition || 'good').replace('_', ' ')}</td>
          <td class="num">${fmtMoney(value)}</td>
        </tr>`;
    }).join('');

    const totalValue = lineItems.reduce(
      (sum, li) => sum + (li.received_quantity || 0) * (li.unit_price || 0),
      0
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Goods Receipt Note ${receipt.receipt_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222; font-size: 12px; }
    .container { padding: 24px 28px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1f2937; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 22px; color: #1f2937; }
    .header .meta { text-align: right; font-size: 11px; color: #555; }
    .header .meta .grn-no { font-size: 14px; font-weight: 700; color: #1f2937; }
    .section { display: flex; gap: 24px; margin: 14px 0; }
    .section .col { flex: 1; }
    .section h3 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; letter-spacing: 0.5px; }
    .section .val { font-size: 12px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin: 12px 0; }
    .field-label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    .field-val { font-size: 12px; font-weight: 600; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #374151; }
    td.num { text-align: right; }
    .prod-name { font-weight: 600; }
    .prod-sku { font-size: 10px; color: #6b7280; }
    .totals { margin-top: 10px; display: flex; justify-content: flex-end; }
    .totals table { width: 280px; }
    .totals td { border: none; padding: 4px 8px; }
    .totals .label { color: #6b7280; }
    .totals .grand { font-weight: 700; font-size: 13px; border-top: 1px solid #1f2937; }
    .notes { margin-top: 16px; padding: 10px 12px; background: #f9fafb; border-left: 3px solid #6b7280; font-size: 11px; }
    .sigs { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
    .sigs .sig { flex: 1; text-align: center; font-size: 11px; color: #4b5563; }
    .sigs .line { border-top: 1px solid #9ca3af; margin: 32px 0 4px; }
    .footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Goods Receipt Note</h1>
        <div style="font-size:11px; color:#6b7280;">Record of goods received against a Purchase Order</div>
      </div>
      <div class="meta">
        <div class="grn-no">${receipt.receipt_number}</div>
        <div>Receipt Date: ${fmtDate(receipt.receipt_date)}</div>
        <div>PO Number: ${purchaseOrder.po_number}</div>
      </div>
    </div>

    <div class="section">
      <div class="col">
        <h3>Supplier</h3>
        <div class="val"><strong>${supplierName}</strong></div>
        ${supplierAddress ? `<div class="val">${supplierAddress}</div>` : ''}
      </div>
      <div class="col">
        <h3>Purchase Order</h3>
        <div class="val">PO Number: <strong>${purchaseOrder.po_number}</strong></div>
        <div class="val">Status: ${purchaseOrder.status}</div>
        ${purchaseOrder.expected_delivery_date
          ? `<div class="val">Expected: ${fmtDate(String(purchaseOrder.expected_delivery_date))}</div>`
          : ''}
      </div>
    </div>

    <div class="grid-2">
      <div>
        <div class="field-label">Received By</div>
        <div class="field-val">${receipt.received_by_name}</div>
      </div>
      <div>
        <div class="field-label">Delivery Challan</div>
        <div class="field-val">${receipt.delivery_challan || '-'}</div>
      </div>
      <div>
        <div class="field-label">Transport Company</div>
        <div class="field-val">${receipt.transport_company || '-'}</div>
      </div>
      <div>
        <div class="field-label">Transport No</div>
        <div class="field-val">${receipt.transport_no || '-'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product</th>
          <th class="num">Ordered</th>
          <th class="num">This Receipt</th>
          <th class="num">Cumulative</th>
          <th>Condition</th>
          <th class="num">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr class="grand">
          <td class="label">Total Value</td>
          <td class="num">${fmtMoney(totalValue)}</td>
        </tr>
      </table>
    </div>

    ${receipt.notes ? `<div class="notes"><strong>Notes:</strong> ${receipt.notes}</div>` : ''}

    <div class="sigs">
      <div class="sig"><div class="line"></div>Received By</div>
      <div class="sig"><div class="line"></div>Verified By</div>
      <div class="sig"><div class="line"></div>Authorized Signature</div>
    </div>

    <div class="footer">
      Generated on ${fmtDate(new Date().toISOString())} | GRN ${receipt.receipt_number} | PO ${purchaseOrder.po_number}
    </div>
  </div>
</body>
</html>`;
  }

  // Generate PDF for a Goods Receipt Note (GRN)
  static async generateGoodsReceiptNotePDF(
    receipt: PurchaseOrderReceipt,
    lineItems: PurchaseOrderReceiptLineItem[],
    purchaseOrder: PurchaseOrderWithDetails
  ): Promise<Buffer> {
    const action = 'Generate Goods Receipt Note PDF';
    try {
      MyLogger.info(action, { receiptNumber: receipt.receipt_number, receiptId: receipt.id });

      const browser = await this.getBrowser();
      const page = await browser.newPage();
      const html = this.generateGoodsReceiptNoteHTML(receipt, lineItems, purchaseOrder);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      await page.close();

      MyLogger.success(action, {
        receiptNumber: receipt.receipt_number,
        receiptId: receipt.id,
        pdfSize: pdfBuffer.length,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { receiptNumber: receipt.receipt_number, receiptId: receipt.id });
      throw error;
    }
  }

  // Generate HTML template for the customer monthly bill — one row per challan
  // (delivery) in the selected date range, with totals and a payment summary.
  private static generateMonthlyBillHTML(
    data: import('@/modules/factory/mediators/monthlyBills/MonthlyBill.mediator').MonthlyBillData,
    settings?: any,
  ): string {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    const formatQty = (q: number) =>
      new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(q);
    const formatDate = (d?: string | null) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };
    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const numberToWords = (num: number): string => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const two = (n: number): string => n < 20 ? a[n] : (b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '')).trim();
      const three = (n: number): string => {
        const h = Math.floor(n / 100), r = n % 100;
        return (h ? a[h] + ' Hundred' + (r ? ' ' + two(r) : '') : two(r)).trim();
      };
      const n = Math.floor(Math.abs(num));
      if (n === 0) return 'Zero';
      const crore = Math.floor(n / 10000000);
      const lac = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const rest = n % 1000;
      const parts: string[] = [];
      if (crore) parts.push(three(crore) + ' Crore');
      if (lac) parts.push(two(lac) + ' Lac');
      if (thousand) parts.push(two(thousand) + ' Thousand');
      if (rest) parts.push(three(rest));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    };

    const grandTotalTaka = Math.trunc(data.totals.total_amount);
    const grandTotalPaisa = Math.round((data.totals.total_amount - grandTotalTaka) * 100);
    const amountInWords = grandTotalPaisa > 0
      ? `${numberToWords(grandTotalTaka)} and ${numberToWords(grandTotalPaisa)} Paisa`
      : numberToWords(grandTotalTaka);

    const billBgBase64 = settings?.bill_background_base64 as string | undefined;
    const hasBillBg = Boolean(billBgBase64);

    const itemsHtml = data.rows.map((r, i) => `
      <tr>
        <td class="col-sn">${i + 1}</td>
        <td class="col-date">${escapeHtml(formatDate(r.delivery_date))}</td>
        <td class="col-challan">${escapeHtml(r.delivery_number)}</td>
        <td class="col-invoice">${escapeHtml(r.invoice_number ?? '—')}</td>
        <td class="col-po">${escapeHtml(r.po_numbers || '—')}</td>
        <td class="col-qty">${formatQty(r.total_qty)}</td>
        <td class="col-amount">${formatCurrency(r.subtotal)}</td>
        <td class="col-amount">${formatCurrency(r.tax_amount)}</td>
        <td class="col-amount">${formatCurrency(r.total_amount)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html${hasBillBg ? ' class="bill-with-bg"' : ''}>
<head>
    <meta charset="UTF-8">
    <title>Monthly Bill — ${escapeHtml(data.customer.company || data.customer.name)}</title>
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ${hasBillBg ? `
        html.bill-with-bg, html.bill-with-bg body { background: #ffffff; }
        .bill-bg-layer {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            z-index: 0; pointer-events: none;
            background-image: url("${billBgBase64}");
            background-repeat: no-repeat;
            background-position: center top;
            background-size: 100% 100%;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        html.bill-with-bg body > *:not(.bill-bg-layer) { position: relative; z-index: 1; }
        ` : ''}
        body {
            font-family: Calibri, Arial, Helvetica, sans-serif;
            font-size: 10.5pt;
            color: #000;
            background: ${hasBillBg ? 'transparent' : 'white'};
            line-height: 1.35;
        }
        /* Mirror invoice/challan letterhead padding when bg is on. */
        .page { padding: ${hasBillBg ? '50mm 14mm 25mm 14mm' : '20mm 14mm 20mm 14mm'}; }

        .title {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }
        .header-row { display: flex; gap: 0; margin-bottom: 12px; }
        .box { border: 1px solid #000; padding: 10px 12px; min-height: 90px; }
        .box.customer { flex: 1.2; border-right: 0; }
        .box.period { flex: 1; }
        .box .label { font-weight: bold; }
        .box .heading { font-weight: bold; margin-bottom: 6px; }
        .kv-line { margin-bottom: 4px; }
        .kv-line .k { display: inline-block; min-width: 110px; }

        table.rows { width: 100%; border-collapse: collapse; }
        table.rows th, table.rows td {
            border: 1px solid #000;
            padding: 5px 6px;
            vertical-align: top;
        }
        table.rows th { text-align: center; font-weight: bold; background: #fff; }
        .col-sn { width: 4%; text-align: center; }
        .col-date { width: 9%; text-align: center; }
        .col-challan { width: 13%; }
        .col-invoice { width: 13%; }
        .col-po { width: 16%; }
        .col-qty { width: 8%; text-align: center; }
        .col-amount { width: 12%; text-align: right; }

        .totals-row td { font-weight: bold; }
        .totals-row td.label { text-align: right; }

        .in-words { margin-top: 16px; font-weight: bold; }
        .payment-summary {
            margin-top: 16px;
            border: 1px solid #000;
            padding: 10px 12px;
        }
        .payment-summary .heading { font-weight: bold; margin-bottom: 6px; }
        .payment-summary .ps-line { display: flex; justify-content: space-between; margin-bottom: 3px; }
    </style>
</head>
<body>
    ${hasBillBg ? '<div class="bill-bg-layer" aria-hidden="true"></div>' : ''}
    <div class="page">
        <div class="title">MONTHLY BILL</div>

        <div class="header-row">
            <div class="box customer">
                <div class="heading">Customer</div>
                <div class="kv-line"><span class="label">Company Name</span> :- ${escapeHtml(data.customer.company || data.customer.name)}</div>
                <div class="kv-line"><span class="label">Billing Address</span> :- ${escapeHtml(data.customer.address_line)}</div>
                <div class="kv-line"><span class="label">VAT No</span> :- ${escapeHtml(data.customer.vat_number || '')}</div>
            </div>
            <div class="box period">
                <div class="heading">Period</div>
                <div class="kv-line"><span class="k label">From</span> :- ${escapeHtml(formatDate(data.period.from_date))}</div>
                <div class="kv-line"><span class="k label">To</span> :- ${escapeHtml(formatDate(data.period.to_date))}</div>
                <div class="kv-line"><span class="k label">Generated</span> :- ${escapeHtml(formatDate(data.period.generated_at))}</div>
                <div class="kv-line"><span class="k label">Challans</span> :- ${data.rows.length}</div>
            </div>
        </div>

        <table class="rows">
            <thead>
                <tr>
                    <th class="col-sn">Sl.</th>
                    <th class="col-date">Date</th>
                    <th class="col-challan">Challan No</th>
                    <th class="col-invoice">Invoice No</th>
                    <th class="col-po">PO / Order</th>
                    <th class="col-qty">Qty</th>
                    <th class="col-amount">Subtotal</th>
                    <th class="col-amount">VAT</th>
                    <th class="col-amount">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr class="totals-row">
                    <td colspan="5" class="label">Totals</td>
                    <td class="col-qty">${formatQty(data.totals.total_qty)}</td>
                    <td class="col-amount">${formatCurrency(data.totals.subtotal)}</td>
                    <td class="col-amount">${formatCurrency(data.totals.tax_amount)}</td>
                    <td class="col-amount">${formatCurrency(data.totals.total_amount)}</td>
                </tr>
            </tbody>
        </table>

        <div class="in-words">Amount In Words: ${escapeHtml(amountInWords)} Only</div>

        <div class="payment-summary">
            <div class="heading">Payment Summary</div>
            <div class="ps-line"><span>Billed in period</span><span>${formatCurrency(data.totals.total_amount)}</span></div>
            <div class="ps-line"><span>Received in period${data.payments.payment_count ? ` (${data.payments.payment_count} payment${data.payments.payment_count === 1 ? '' : 's'})` : ''}</span><span>${formatCurrency(data.payments.paid_in_period)}</span></div>
            ${data.payments.last_payment_date ? `<div class="ps-line"><span>Last payment date</span><span>${escapeHtml(formatDate(data.payments.last_payment_date))}</span></div>` : ''}
            <div class="ps-line"><span><strong>Outstanding (current, all orders)</strong></span><span><strong>${formatCurrency(data.outstanding_now)}</strong></span></div>
        </div>
    </div>
</body>
</html>
    `;
  }

  // Generate consolidated monthly bill PDF for a customer over a date range.
  public static async generateMonthlyBillPDF(
    data: import('@/modules/factory/mediators/monthlyBills/MonthlyBill.mediator').MonthlyBillData,
  ): Promise<Buffer> {
    const action = 'PDFGenerator.generateMonthlyBillPDF';
    try {
      const settingsMediator = new SettingsMediator();
      const companySettings = await settingsMediator.getSettingsByCategory('company');
      const settingsData: any = {};
      for (const [key, setting] of Object.entries(companySettings)) {
        settingsData[key] = setting.value;
      }

      const billBg = this.loadBillBackgroundBase64(action);
      if (billBg) settingsData.bill_background_base64 = billBg;

      const browser = await this.getBrowser();
      const page = await browser.newPage();
      const html = this.generateMonthlyBillHTML(data, settingsData);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });
      await page.close();

      MyLogger.success(action, {
        customerId: data.customer.id,
        rowCount: data.rows.length,
        pdfSize: pdfBuffer.length,
      });
      return Buffer.from(pdfBuffer);
    } catch (error) {
      MyLogger.error(action, error, { customerId: data.customer.id });
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
