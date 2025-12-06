"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, CameraOff, Scan, Loader2, X } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { ProductApi } from "@/services/api";
import { Product } from "@/services/types";
import { toast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onProductFound: (product: Product) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function BarcodeScanner({ onProductFound, onError, className }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check camera permission on mount
    checkCameraPermission();
    
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        return;
      }

      // Try to get camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setHasPermission(true);
    } catch (err: any) {
      setHasPermission(false);
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setShowCamera(true);

      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Initialize the code reader
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Get available video devices
      const videoInputDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = videoInputDevices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Use the first available camera (usually back camera on mobile)
      const selectedDeviceId = videoDevices[0].deviceId;

      // Start decoding from video device
      codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const barcode = result.getText();
            handleBarcodeScanned(barcode);
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.error('Barcode scanning error:', error);
          }
        }
      );

      // Store the video stream reference for cleanup
      if (videoRef.current.srcObject) {
        streamRef.current = videoRef.current.srcObject as MediaStream;
      }

    } catch (err: any) {
      console.error('Error starting barcode scanner:', err);
      toast({
        title: "Camera Error",
        description: err.message || 'Failed to start camera',
        variant: "destructive",
      });
      setIsScanning(false);
      setShowCamera(false);
      onError?.(err.message || 'Failed to start camera');
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setShowCamera(false);
    
    // Stop the code reader
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      setLoading(true);
      
      // Stop scanning while processing
      stopScanning();
      
      const product = await ProductApi.searchProductByBarcode(barcode);
      
      toast({
        title: "Product Found",
        description: `Found ${product.name} (${product.sku})`,
      });
      
      onProductFound(product);
      setManualBarcode(''); // Clear manual input
      
    } catch (err: any) {
      onError?.(err.message || 'Product not found');
      
      toast({
        title: "Product Not Found",
        description: `No product found with barcode: ${barcode}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    
    await handleBarcodeScanned(manualBarcode.trim());
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* Compact header with manual barcode entry */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Barcode Scanner</span>
          </div>
          
          {/* Manual Barcode Entry - Primary interface */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Scan or enter barcode..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={!manualBarcode.trim() || loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Scan className="w-4 h-4" />
              )}
            </Button>
            {hasPermission && (
              <Button 
                type="button"
                size="sm"
                variant="outline"
                onClick={isScanning ? stopScanning : startScanning}
                disabled={loading}
              >
                {isScanning ? (
                  <CameraOff className="w-4 h-4" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
            )}
          </form>

          {/* Compact camera view - only shows when scanning */}
          {showCamera && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-32 bg-black rounded-md object-cover"
                autoPlay
                playsInline
                muted
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={stopScanning}
              >
                <X className="w-3 h-3" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Point camera at barcode
              </div>
            </div>
          )}

          {/* Status indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Searching for product...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
