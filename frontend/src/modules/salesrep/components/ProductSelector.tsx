"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string;
  selling_price: number;
}

interface ProductSelectorProps {
  value: string;
  products: Product[];
  onProductSelect: (product: Product) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  value,
  products,
  onProductSelect,
  onClear,
  placeholder = "Search and select product...",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);

    // If user clears the input, clear the selection
    if (newValue === "") {
      onClear();
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setSearchTerm(product.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle clear
  const handleClear = () => {
    setSearchTerm("");
    onClear();
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
          handleProductSelect(filteredProducts[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Sync search term with value prop
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Keep dropdown open during scroll - no scroll handling needed

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          style={{
            minWidth: "400px",
            width: "max-content",
            maxWidth: "500px",
          }}
        >
          {filteredProducts.length > 0 ? (
            <div className="py-1">
              {filteredProducts.slice(0, 10).map((product, index) => (
                <div
                  key={product.id}
                  className={cn(
                    "px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100",
                    selectedIndex === index && "bg-gray-100"
                  )}
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3 flex-1">
                      <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3 flex-shrink-0">
                      ${product.selling_price}
                    </Badge>
                  </div>
                </div>
              ))}
              {filteredProducts.length > 10 && (
                <div className="px-3 py-2 text-sm text-muted-foreground border-t">
                  ... and {filteredProducts.length - 10} more products
                </div>
              )}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No products found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
