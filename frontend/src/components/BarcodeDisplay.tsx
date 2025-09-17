import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, Copy } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import JsBarcode from 'jsbarcode';

interface BarcodeDisplayProps {
  barcode: string;
  productName?: string;
  sku?: string;
  className?: string;
}

export function BarcodeDisplay({ barcode, productName, sku, className = "" }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (barcode && canvasRef.current) {
      try {
        setIsGenerating(true);
        JsBarcode(canvasRef.current, barcode, {
          format: "EAN13",
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          font: "monospace",
          fontOptions: "bold"
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
        toast.error('Failed to generate barcode');
      } finally {
        setIsGenerating(false);
      }
    }
  }, [barcode]);

  const handlePrint = () => {
    if (!canvasRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print window. Please check your popup blocker.');
      return;
    }

    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${productName || 'Product'}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .barcode-container {
              text-align: center;
              border: 1px solid #ccc;
              padding: 20px;
              background: white;
            }
            .product-info {
              margin-bottom: 20px;
            }
            .product-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .product-sku {
              font-size: 14px;
              color: #666;
              margin-bottom: 10px;
            }
            .barcode-image {
              max-width: 100%;
              height: auto;
            }
            .barcode-text {
              margin-top: 10px;
              font-family: monospace;
              font-size: 16px;
              letter-spacing: 2px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .barcode-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="product-info">
              ${productName ? `<div class="product-name">${productName}</div>` : ''}
              ${sku ? `<div class="product-sku">SKU: ${sku}</div>` : ''}
            </div>
            <img src="${dataURL}" alt="Barcode" class="barcode-image" />
            <div class="barcode-text">${barcode}</div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `barcode-${sku || 'product'}-${barcode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Barcode downloaded successfully!');
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcode).then(() => {
      toast.success('Barcode copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy barcode');
    });
  };

  if (!barcode) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Barcode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No barcode available for this product
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Product Barcode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {isGenerating ? (
            <div className="flex items-center justify-center h-32 w-64 border border-dashed border-gray-300 rounded">
              <div className="text-muted-foreground">Generating barcode...</div>
            </div>
          ) : (
            <canvas ref={canvasRef} className="border border-gray-200 rounded" />
          )}
        </div>
        
        <div className="text-center">
          <div className="font-mono text-sm text-muted-foreground mb-2">
            {barcode}
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isGenerating}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyBarcode}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
