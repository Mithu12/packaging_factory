import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  isGift: boolean;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface ReceiptProps {
  orderNumber: string;
  customer: Customer | null;
  cart: CartItem[];
  subtotal: number;
  overallDiscount: number;
  overallDiscountType: 'percentage' | 'flat';
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  orderDate: string;
  notes?: string;
}

export function Receipt({
  orderNumber,
  customer,
  cart,
  subtotal,
  overallDiscount,
  overallDiscountType,
  tax,
  total,
  paymentMethod,
  cashReceived,
  changeGiven,
  orderDate,
  notes
}: ReceiptProps) {
  
  const generateReceiptPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add text
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      doc.setFontSize(options.fontSize || 10);
      doc.setFont('helvetica', options.style || 'normal');
      doc.text(text, x, y);
      return y + (options.lineHeight || 5);
    };

    // Helper function to add centered text
    const addCenteredText = (text: string, y: number, options: any = {}) => {
      doc.setFontSize(options.fontSize || 10);
      doc.setFont('helvetica', options.style || 'normal');
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
      return y + (options.lineHeight || 5);
    };

    // Helper function to add right-aligned text
    const addRightText = (text: string, y: number, options: any = {}) => {
      doc.setFontSize(options.fontSize || 10);
      doc.setFont('helvetica', options.style || 'normal');
      const textWidth = doc.getTextWidth(text);
      const x = pageWidth - margin - textWidth;
      doc.text(text, x, y);
      return y + (options.lineHeight || 5);
    };

    // Header
    yPosition = addCenteredText('POS SYSTEM', yPosition, { fontSize: 16, style: 'bold' });
    yPosition = addCenteredText('Sales Receipt', yPosition, { fontSize: 12, style: 'bold' });
    yPosition += 5;

    // Order details
    yPosition = addText(`Receipt #: ${orderNumber}`, margin, yPosition);
    yPosition = addText(`Date: ${new Date(orderDate).toLocaleString()}`, margin, yPosition);
    yPosition = addText(`Payment: ${paymentMethod.toUpperCase()}`, margin, yPosition);
    
    if (customer) {
      yPosition = addText(`Customer: ${customer.name}`, margin, yPosition);
      if (customer.phone) {
        yPosition = addText(`Phone: ${customer.phone}`, margin, yPosition);
      }
    } else {
      yPosition = addText('Customer: Walk-in', margin, yPosition);
    }
    
    yPosition += 10;

    // Separator line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Items header
    yPosition = addText('Item', margin, yPosition, { style: 'bold' });
    doc.text('Qty', margin + 60, yPosition - 5);
    doc.text('Price', margin + 90, yPosition - 5);
    doc.text('Total', pageWidth - margin - 20, yPosition - 5, { align: 'right' });
    yPosition += 5;

    // Items
    cart.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      let itemDiscount = 0;
      
      if (item.discount && item.discount > 0) {
        if (item.discountType === 'percentage') {
          itemDiscount = (itemSubtotal * item.discount) / 100;
        } else {
          itemDiscount = item.discount;
        }
      }
      
      const itemTotal = itemSubtotal - itemDiscount;
      
      // Item name (truncate if too long)
      let itemName = item.name;
      if (itemName.length > 25) {
        itemName = itemName.substring(0, 22) + '...';
      }

      // Add gift indicator to name
      if (item.isGift) {
        itemName = `${itemName} (GIFT)`;
      }

      yPosition = addText(itemName, margin, yPosition);
      doc.text(item.quantity.toString(), margin + 60, yPosition - 5);
      
      if (item.isGift) {
        // Show crossed out price for gifts
        doc.text(`$${Number(item.price).toFixed(2)}`, margin + 90, yPosition - 5);
        doc.line(margin + 90, yPosition - 7, margin + 115, yPosition - 7); // Strike through
        doc.text('FREE', pageWidth - margin - 20, yPosition - 5, { align: 'right' });
      } else {
        doc.text(`$${Number(item.price).toFixed(2)}`, margin + 90, yPosition - 5);
        doc.text(`$${Number(itemTotal).toFixed(2)}`, pageWidth - margin - 20, yPosition - 5, { align: 'right' });
      }
      
      // Show discount if applicable (gifts show as 100% discount)
      if (item.isGift) {
        yPosition = addText(`  Gift Item (100% discount)`, margin + 10, yPosition, { fontSize: 8 });
      } else if (itemDiscount > 0) {
        yPosition = addText(`  Discount: -$${Number(itemDiscount).toFixed(2)}`, margin + 10, yPosition, { fontSize: 8 });
      }
    });

    yPosition += 5;

    // Separator line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Totals
    yPosition = addRightText(`Subtotal: $${Number(subtotal).toFixed(2)}`, yPosition);
    
    if (overallDiscount > 0) {
      const discountText = overallDiscountType === 'percentage' 
        ? `Discount (${overallDiscount}%): -$${Number((subtotal * overallDiscount) / 100).toFixed(2)}`
        : `Discount: -$${Number(overallDiscount).toFixed(2)}`;
      yPosition = addRightText(discountText, yPosition);
    }
    
    yPosition = addRightText(`Tax: $${Number(tax).toFixed(2)}`, yPosition);
    
    // Total line
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    yPosition = addRightText(`TOTAL: $${Number(total).toFixed(2)}`, yPosition);
    
    yPosition += 5;

    // Payment details
    if (paymentMethod === 'cash' && cashReceived) {
      yPosition = addRightText(`Cash Received: $${Number(cashReceived).toFixed(2)}`, yPosition);
      if (changeGiven && changeGiven > 0) {
        yPosition = addRightText(`Change: $${Number(changeGiven).toFixed(2)}`, yPosition);
      }
    }

    yPosition += 10;

    // Notes
    if (notes) {
      yPosition = addText('Notes:', margin, yPosition, { style: 'bold' });
      yPosition = addText(notes, margin, yPosition);
    }

    yPosition += 10;

    // Footer
    yPosition = addCenteredText('Thank you for your business!', yPosition, { fontSize: 10 });
    yPosition = addCenteredText('Please keep this receipt', yPosition, { fontSize: 8 });

    return doc;
  };

  const handlePrintReceipt = () => {
    const doc = generateReceiptPDF();
    
    // Open PDF in new window for printing
    const pdfDataUri = doc.output('datauristring');
    const printWindow = window.open();
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${orderNumber}</title>
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfDataUri}"></iframe>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      
      toast({
        title: "Receipt Printed",
        description: `Receipt ${orderNumber} sent to printer`,
      });
    }
  };

  const handleDownloadReceipt = () => {
    const doc = generateReceiptPDF();
    doc.save(`receipt-${orderNumber}.pdf`);
    
    toast({
      title: "Receipt Downloaded",
      description: `Receipt ${orderNumber} downloaded successfully`,
    });
  };

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handlePrintReceipt}
        className="flex-1"
        variant="outline"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Receipt
      </Button>
      <Button 
        onClick={handleDownloadReceipt}
        className="flex-1"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>
    </div>
  );
}
