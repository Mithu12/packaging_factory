# Barcode Scanner Functionality

This document describes the barcode scanning and product search functionality implemented in the ERP system.

## Features

### 1. Barcode Scanning
- **Camera-based scanning**: Uses device camera to scan barcodes in real-time
- **Manual barcode entry**: Allows manual input of barcode numbers
- **Multiple barcode formats**: Supports various barcode formats through ZXing library
- **Permission handling**: Gracefully handles camera permissions and errors

### 2. Product Search by Barcode
- **Instant lookup**: Search products by barcode in the database
- **Real-time feedback**: Immediate notification when products are found or not found
- **Integration with POS**: Automatically adds found products to cart in POS system

### 3. Enhanced Product Search
- **Updated search filters**: Product search now includes barcode field
- **Multiple search criteria**: Search by name, SKU, barcode, or category

## Technical Implementation

### Backend Changes

#### 1. Updated Product Search Query
- Modified `GetProductInfoMediator.searchProducts()` to include barcode field in search
- Updated SQL query: `WHERE p.name ILIKE $1 OR p.sku ILIKE $1 OR p.product_code ILIKE $1 OR p.barcode ILIKE $1`

#### 2. New Barcode Search Endpoint
- **Endpoint**: `GET /api/products/barcode/:barcode`
- **Controller**: `ProductsController.searchProductByBarcode()`
- **Mediator**: `GetProductInfoMediator.searchProductByBarcode()`
- **Response**: Returns single product or 404 if not found

#### 3. API Route
```typescript
router.get('/barcode/:barcode', expressAsyncHandler(ProductsController.searchProductByBarcode));
```

### Frontend Changes

#### 1. New BarcodeScanner Component
- **Location**: `/src/components/barcode/BarcodeScanner.tsx`
- **Features**:
  - **Compact Design**: Minimal UI footprint with smart space usage
  - **Primary Manual Entry**: Input field for typing/scanning barcodes
  - **Optional Camera**: Toggle camera view only when needed
  - **Smart Layout**: Camera view appears only when scanning (32px height)
  - **Error handling and permission management**
  - **Loading states and user feedback**

#### 2. Updated API Services
- **ProductApi**: Added `searchProductByBarcode(barcode: string)` method
- **ApiService**: Added corresponding wrapper method

#### 3. POS Integration
- **POSManager**: Integrated BarcodeScanner component
- **ProductSearch**: Updated to include barcode in search filters

#### 4. Dependencies Added
- `@zxing/library`: Core barcode scanning library
- `react-zxing`: React wrapper for ZXing (future enhancement)

## Usage

### In POS System
1. Navigate to POS Manager
2. Use the compact barcode scanner at the top of the product selection area
3. **Primary Method**: Type or scan barcode directly into the input field
4. **Camera Option**: Click camera button to toggle camera view for scanning
5. Camera view is compact (128px height) and only appears when needed
6. Product will be automatically added to cart when found
7. Camera automatically stops after successful scan

### Camera Permissions
- Browser will request camera permission on first use
- If permission is denied, manual barcode entry is still available
- Component gracefully handles browsers that don't support camera access

### Error Handling
- Product not found: Shows error message and toast notification
- Camera errors: Falls back to manual entry mode
- Network errors: Displays appropriate error messages

## Database Schema

The existing `products` table already includes a `barcode` field:
```sql
barcode VARCHAR(50) UNIQUE
```

## Security Considerations

- No authentication required for barcode search (matches existing product search)
- Barcode parameter is properly encoded in URL
- SQL injection protection through parameterized queries

## Browser Compatibility

### Camera Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Mobile browsers: Full support

### Fallback
- Manual barcode entry works in all browsers
- No camera required for basic functionality

## Performance

- Real-time scanning with minimal CPU usage
- Automatic cleanup of camera resources
- Efficient database queries with indexed barcode field

## Future Enhancements

1. **Barcode Generation**: Generate barcodes for products
2. **Batch Scanning**: Scan multiple products quickly
3. **Sound Feedback**: Audio confirmation on successful scans
4. **Scan History**: Keep track of recently scanned items
5. **QR Code Support**: Support for QR codes in addition to barcodes

## Testing

### Manual Testing Steps
1. Start the development servers:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend
   cd frontend && npm run dev
   ```

2. Navigate to POS Manager
3. Test camera scanning with a barcode
4. Test manual barcode entry
5. Verify product appears in cart
6. Test with invalid barcode to verify error handling

### Unit Testing (Future)
- Test barcode validation
- Test API endpoint responses
- Test component rendering and interactions

## Troubleshooting

### Camera Not Working
1. Check browser permissions
2. Ensure HTTPS connection (required for camera access)
3. Try manual barcode entry as alternative

### Product Not Found
1. Verify barcode exists in database
2. Check barcode format (remove spaces/special characters)
3. Ensure product is active status

### Performance Issues
1. Check network connection
2. Verify database indexes on barcode field
3. Monitor console for JavaScript errors

## Configuration

No additional configuration required. The feature works out of the box with:
- Existing product database structure
- Current authentication system
- Standard browser permissions
