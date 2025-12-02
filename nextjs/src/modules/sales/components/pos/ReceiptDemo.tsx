"use client";

import React from 'react';
import { Receipt } from './Receipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Demo component to test receipt functionality
export function ReceiptDemo() {
  const demoReceiptData = {
    orderNumber: "SO-000001",
    customer: {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890"
    },
    cart: [
      {
        id: "1",
        name: "Premium Coffee Beans",
        price: 25.99,
        quantity: 2,
        discount: 5,
        discountType: 'percentage' as const,
        isGift: false
      },
      {
        id: "2", 
        name: "Coffee Mug",
        price: 12.50,
        quantity: 1,
        discount: 0,
        discountType: 'fixed' as const,
        isGift: false
      }
    ],
    subtotal: 64.48,
    overallDiscount: 10,
    overallDiscountType: 'flat' as const,
    tax: 5.45,
    total: 59.93,
    paymentMethod: "cash",
    cashReceived: 60.00,
    changeGiven: 0.07,
    orderDate: new Date().toISOString(),
    notes: "Thank you for your purchase!"
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Receipt Printing Demo</CardTitle>
        <p className="text-sm text-gray-600">
          This demonstrates the receipt printing functionality after payment processing.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Sample Receipt Data:</h3>
          <div className="text-sm space-y-1">
            <p><strong>Order:</strong> {demoReceiptData.orderNumber}</p>
            <p><strong>Customer:</strong> {demoReceiptData.customer.name}</p>
            <p><strong>Items:</strong> {demoReceiptData.cart.length} items</p>
            <p><strong>Subtotal:</strong> ${demoReceiptData.subtotal.toFixed(2)}</p>
            <p><strong>Discount:</strong> ${demoReceiptData.overallDiscount.toFixed(2)}</p>
            <p><strong>Tax:</strong> ${demoReceiptData.tax.toFixed(2)}</p>
            <p><strong>Total:</strong> ${demoReceiptData.total.toFixed(2)}</p>
            <p><strong>Payment:</strong> {demoReceiptData.paymentMethod}</p>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Receipt Actions:</h3>
          <Receipt {...demoReceiptData} />
        </div>
        
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
          <p><strong>How it works:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>After successful payment processing, a receipt dialog appears</li>
            <li>Users can print the receipt directly to their printer</li>
            <li>Users can download the receipt as a PDF file</li>
            <li>The receipt includes all transaction details, discounts, and tax calculations</li>
            <li>Receipt format is optimized for thermal printers (58mm width)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
