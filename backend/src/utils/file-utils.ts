import fs from 'fs';
import path from 'path';
import { MyLogger } from './new-logger';

/**
 * Safely delete a file from the filesystem
 * @param filePath - The path to the file to delete
 * @returns Promise<boolean> - true if file was deleted, false if file didn't exist or couldn't be deleted
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      MyLogger.info('File does not exist, skipping deletion', { filePath });
      return true; // Consider it successful since the file is already gone
    }

    // Delete the file
    fs.unlinkSync(filePath);
    MyLogger.info('File deleted successfully', { filePath });
    return true;
  } catch (error) {
    MyLogger.error('Failed to delete file', { filePath, error: error instanceof Error ? error.message : error });
    return false;
  }
}

/**
 * Delete a product image file
 * @param imageUrl - The image URL or path (e.g., "/uploads/products/filename.png")
 * @returns Promise<boolean> - true if file was deleted successfully
 */
export async function deleteProductImage(imageUrl: string | null | undefined): Promise<boolean> {
  if (!imageUrl) {
    return true; // No image to delete
  }

  try {
    // Extract filename from URL
    let filename: string;
    
    if (imageUrl.startsWith('/uploads/products/')) {
      // Extract filename from path like "/uploads/products/filename.png"
      filename = path.basename(imageUrl);
    } else if (imageUrl.includes('/uploads/products/')) {
      // Extract filename from full URL
      const urlParts = imageUrl.split('/uploads/products/');
      filename = urlParts[1];
    } else {
      // Assume it's just a filename
      filename = imageUrl;
    }

    // Construct full file path
    const uploadsDir = path.join(process.cwd(), 'uploads', 'products');
    const fullPath = path.join(uploadsDir, filename);

    MyLogger.info('Attempting to delete product image', { 
      imageUrl, 
      filename, 
      fullPath 
    });

    return await deleteFile(fullPath);
  } catch (error) {
    MyLogger.error('Error in deleteProductImage', { 
      imageUrl, 
      error: error instanceof Error ? error.message : error 
    });
    return false;
  }
}
