"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { SettingsApi } from '@/services/settings-api';
import { CompanySettings } from '@/services/settings-types';

interface ChalanItem {
  id: number;
  product_name: string;
  quantity: number;
}

interface Customer {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface ChalanProps {
  chalanNumber: string;
  chalanDate: string;
  customer: Customer | null;
  items: ChalanItem[];
  onClose?: () => void;
}

export function Chalan({
  chalanNumber,
  chalanDate,
  customer,
  items,
  onClose
}: ChalanProps) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  // Load logo as base64 using Image element with promise
  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            console.log('Logo converted to base64 successfully');
            resolve(base64);
          } else {
            console.warn('Could not get canvas context');
            resolve(null);
          }
        } catch (error) {
          console.error('Canvas error:', error);
          resolve(null);
        }
      };
      
      img.onerror = (e) => {
        console.error('Image load error for:', logoUrl, e);
        resolve(null);
      };
      
      // Add timestamp to avoid caching issues
      img.src = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  };

  const loadSettings = async () => {
    try {
      const settings = await SettingsApi.getCompanySettings();
      console.log('Company settings loaded:', settings);
      setCompanySettings(settings);
      
      // Load and convert logo to base64 if available
      if (settings.invoice_logo) {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000';
        const logoUrl = settings.invoice_logo.startsWith('http') 
          ? settings.invoice_logo 
          : `${baseUrl}${settings.invoice_logo}`;
        
        console.log('Loading logo from URL:', logoUrl);
        
        // Try loading the logo
        const base64 = await loadLogoAsBase64(logoUrl);
        if (base64) {
          setLogoBase64(base64);
          console.log('Logo set successfully');
        } else {
          console.warn('Logo could not be loaded, will use company name text instead');
        }
      } else {
        console.log('No invoice_logo in settings');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChalanPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Colors - matching the reference image
    const primaryBlue = [29, 53, 123]; // Dark blue for header and table header
    const textDark = [51, 51, 51];

    // Helper function to set color
    const setColor = (color: number[], type: 'fill' | 'text' | 'draw' = 'text') => {
      if (type === 'fill') {
        doc.setFillColor(color[0], color[1], color[2]);
      } else if (type === 'draw') {
        doc.setDrawColor(color[0], color[1], color[2]);
      } else {
        doc.setTextColor(color[0], color[1], color[2]);
      }
    };

    // Determine image format from base64 string
    const getImageFormat = (base64: string): string => {
      if (base64.includes('data:image/png')) return 'PNG';
      if (base64.includes('data:image/jpeg') || base64.includes('data:image/jpg')) return 'JPEG';
      if (base64.includes('data:image/gif')) return 'GIF';
      if (base64.includes('data:image/webp')) return 'WEBP';
      return 'PNG'; // Default to PNG
    };

    // Add logo if available
    if (logoBase64) {
      try {
        const imageFormat = getImageFormat(logoBase64);
        doc.addImage(logoBase64, imageFormat, margin, yPosition, 45, 22);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
        // Fallback: show company name if logo fails
        if (companySettings?.company_name) {
          setColor(primaryBlue);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(companySettings.company_name, margin, yPosition + 15);
        }
      }
    } else if (companySettings?.company_name) {
      // Company name if no logo
      setColor(primaryBlue);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(companySettings.company_name, margin, yPosition + 15);
    }

    // CHALAN title on the right
    setColor(primaryBlue);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('CHALAN', pageWidth - margin, yPosition + 10, { align: 'right' });

    // Chalan details below title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(textDark);
    doc.text(`Chalan No : ${chalanNumber}`, pageWidth - margin, yPosition + 18, { align: 'right' });
    doc.text(`Chalan Date : ${new Date(chalanDate).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, '-')}`, pageWidth - margin, yPosition + 24, { align: 'right' });

    yPosition += 40;

    // Horizontal line
    setColor(primaryBlue, 'draw');
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 10;

    // Bill To section (left side)
    setColor(textDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Bill To:', margin, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPosition += 6;
    
    if (customer) {
      doc.text(`Name : ${customer.name}`, margin, yPosition);
      yPosition += 5;
      if (customer.address) {
        doc.text(`Address : ${customer.address}`, margin, yPosition);
        yPosition += 5;
      }
      if (customer.email) {
        doc.text(`Email : ${customer.email}`, margin, yPosition);
        yPosition += 5;
      }
      if (customer.phone) {
        doc.text(`Phone : ${customer.phone}`, margin, yPosition);
      }
    } else {
      doc.text('Name : Walk-in Customer', margin, yPosition);
    }

    // Company info (right side)
    const rightColumnX = pageWidth / 2 + 10;
    let rightYPosition = yPosition - 11;

    if (companySettings) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${companySettings.company_name}:`, rightColumnX, rightYPosition);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      rightYPosition += 6;
      
      if (companySettings.company_address) {
        // Split long address into multiple lines if needed
        const addressLines = doc.splitTextToSize(`Office : ${companySettings.company_address}`, 80);
        addressLines.forEach((line: string) => {
          doc.text(line, rightColumnX, rightYPosition);
          rightYPosition += 5;
        });
      }
      
      if (companySettings.phone) {
        doc.text(`Cell : ${companySettings.phone}`, rightColumnX, rightYPosition);
        rightYPosition += 5;
      }
      
      if (companySettings.company_email) {
        doc.text(`Email : ${companySettings.company_email}`, rightColumnX, rightYPosition);
      }
    }

    yPosition = Math.max(yPosition, rightYPosition) + 15;

    // Items table
    const tableStartY = yPosition;
    const colWidths = {
      no: 40,
      description: 100,
      quantity: 40
    };

    // Table header
    setColor(primaryBlue, 'fill');
    doc.rect(margin, tableStartY, pageWidth - 2 * margin, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    
    doc.text('No.', margin + 15, tableStartY + 7, { align: 'center' });
    doc.text('Description', margin + colWidths.no + colWidths.description / 2, tableStartY + 7, { align: 'center' });
    doc.text('Quantity', pageWidth - margin - colWidths.quantity / 2, tableStartY + 7, { align: 'center' });

    yPosition = tableStartY + 10;

    // Table rows
    setColor(textDark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    items.forEach((item, index) => {
      yPosition += 8;
      
      // Row background (alternating)
      if (index % 2 === 1) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 10, 'F');
      }

      // Draw cell borders
      setColor([200, 200, 200], 'draw');
      doc.setLineWidth(0.1);
      doc.line(margin, yPosition + 4, pageWidth - margin, yPosition + 4);

      setColor(textDark);
      doc.text((index + 1).toString(), margin + 15, yPosition, { align: 'center' });
      doc.text(item.product_name, margin + 45, yPosition);
      doc.text(item.quantity.toString(), pageWidth - margin - colWidths.quantity / 2, yPosition, { align: 'center' });
    });

    yPosition += 15;

    // Table border
    setColor([200, 200, 200], 'draw');
    doc.setLineWidth(0.3);
    doc.rect(margin, tableStartY, pageWidth - 2 * margin, yPosition - tableStartY - 5);

    // ============ SIGNATURE SECTION ============
    // Position signatures well below the table with enough space
    const signatureY = Math.max(yPosition + 40, pageHeight - 70);
    
    // Receiver Signature (Left side)
    setColor(textDark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Signature line for receiver
    setColor([100, 100, 100], 'draw');
    doc.setLineWidth(0.5);
    doc.line(margin, signatureY, margin + 60, signatureY);
    
    // Label below the line
    setColor(textDark);
    doc.setFontSize(10);
    doc.text('Receiver Signature', margin, signatureY + 10);

    // Seller Signature (Right side)
    // Signature line for seller
    setColor([100, 100, 100], 'draw');
    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY);
    
    // Label below the line
    setColor(textDark);
    doc.setFontSize(10);
    doc.text('Seller Signature', pageWidth - margin - 60, signatureY + 10);

    // ============ FOOTER SECTION ============
    const footerY = pageHeight - 20;
    
    // Footer line
    setColor([200, 200, 200], 'draw');
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Website URL at bottom center
    if (companySettings?.company_email) {
      const domain = companySettings.company_email.split('@')[1];
      if (domain) {
        setColor([100, 100, 100]);
        doc.setFontSize(9);
        doc.text(`https://${domain}`, pageWidth / 2, footerY + 2, { align: 'center' });
      }
    }

    return doc;
  };

  const handleDownloadChalan = () => {
    if (loading) return;

    try {
      const doc = generateChalanPDF();
      doc.save(`chalan-${chalanNumber}.pdf`);
      
      toast({
        title: "Chalan Downloaded",
        description: `Chalan ${chalanNumber} downloaded successfully`,
      });
    } catch (error) {
      console.error('Error generating chalan:', error);
      toast({
        title: "Error",
        description: "Failed to generate chalan PDF",
        variant: "destructive"
      });
    }
  };

  const handlePrintChalan = () => {
    if (loading) return;

    try {
      const doc = generateChalanPDF();
      
      // Open PDF in new window for printing
      const pdfDataUri = doc.output('datauristring');
      const printWindow = window.open();
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Chalan ${chalanNumber}</title>
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
          title: "Chalan Printed",
          description: `Chalan ${chalanNumber} sent to printer`,
        });
      }
    } catch (error) {
      console.error('Error printing chalan:', error);
      toast({
        title: "Error",
        description: "Failed to print chalan",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handlePrintChalan}
        className="flex-1"
        variant="outline"
      >
        <FileText className="w-4 h-4 mr-2" />
        Print Chalan
      </Button>
      <Button 
        onClick={handleDownloadChalan}
        className="flex-1"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Download Chalan
      </Button>
    </div>
  );
}
