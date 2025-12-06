import { useState, useCallback, useMemo, useEffect } from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotalItems: (totalItems: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  reset: () => void;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialTotalItems?: number;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  // Helper properties
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  isEmpty: boolean;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  initialTotalItems = 0,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItemsState] = useState(initialTotalItems);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize) || 1;
  }, [totalItems, pageSize]);

  // Helper properties
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const isEmpty = totalItems === 0;

  // Actions
  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    // Reset to first page when page size changes
    setCurrentPage(1);
  }, []);

  const setTotalItems = useCallback((newTotalItems: number) => {
    setTotalItemsState(newTotalItems);
    // Adjust current page if it's beyond the new total pages
    const newTotalPages = Math.ceil(newTotalItems / pageSize) || 1;
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  }, [currentPage, pageSize]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(initialPageSize);
    setTotalItemsState(initialTotalItems);
  }, [initialPage, initialPageSize, initialTotalItems]);

  return {
    // State
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    
    // Helper properties
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    isEmpty,
    
    // Actions
    setPage,
    setPageSize,
    setTotalItems,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    reset,
  };
}

// Hook for client-side pagination (when you have all data)
export function useClientPagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
) {
  const pagination = usePagination({
    ...options,
    initialTotalItems: data.length,
  });

  // Update total items when data changes
  useEffect(() => {
    pagination.setTotalItems(data.length);
  }, [data.length, pagination.setTotalItems]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, pagination.currentPage, pagination.pageSize]);

  return {
    ...pagination,
    data: paginatedData,
    allData: data,
  };
}

// Utility function to calculate pagination info
export function calculatePaginationInfo(
  currentPage: number,
  pageSize: number,
  totalItems: number
) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    isEmpty: totalItems === 0,
  };
}
