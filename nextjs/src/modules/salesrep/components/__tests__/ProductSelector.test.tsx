"use client";

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductSelector } from "../ProductSelector";

const mockProducts = [
  {
    id: 1,
    name: "Test Product 1",
    sku: "TP001",
    selling_price: 100,
  },
  {
    id: 2,
    name: "Test Product 2",
    sku: "TP002",
    selling_price: 200,
  },
  {
    id: 3,
    name: "Another Product",
    sku: "AP001",
    selling_price: 150,
  },
];

const defaultProps = {
  value: "",
  products: mockProducts,
  onProductSelect: jest.fn(),
  onClear: jest.fn(),
  placeholder: "Search products...",
};

describe("ProductSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with placeholder text", () => {
    render(<ProductSelector {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search products...")
    ).toBeInTheDocument();
  });

  it("shows dropdown when input is focused", async () => {
    render(<ProductSelector {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search products...");

    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("Test Product 1")).toBeInTheDocument();
    });
  });

  it("filters products based on search term", async () => {
    render(<ProductSelector {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search products...");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Test" } });

    await waitFor(() => {
      expect(screen.getByText("Test Product 1")).toBeInTheDocument();
      expect(screen.getByText("Test Product 2")).toBeInTheDocument();
      expect(screen.queryByText("Another Product")).not.toBeInTheDocument();
    });
  });

  it("calls onProductSelect when product is clicked", async () => {
    render(<ProductSelector {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search products...");

    fireEvent.focus(input);

    await waitFor(() => {
      const product1 = screen.getByText("Test Product 1");
      fireEvent.click(product1);
    });

    expect(defaultProps.onProductSelect).toHaveBeenCalledWith(mockProducts[0]);
  });

  it("calls onClear when clear button is clicked", () => {
    render(<ProductSelector {...defaultProps} value="Test Product 1" />);
    const clearButton = screen.getByRole("button");
    fireEvent.click(clearButton);

    expect(defaultProps.onClear).toHaveBeenCalled();
  });

  it("handles keyboard navigation", async () => {
    render(<ProductSelector {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search products...");

    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("Test Product 1")).toBeInTheDocument();
    });

    // Arrow down should select first item
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Enter should select the highlighted item
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onProductSelect).toHaveBeenCalledWith(mockProducts[0]);
  });

  it("shows no products found message when no matches", async () => {
    render(<ProductSelector {...defaultProps} />);
    const input = screen.getByPlaceholderText("Search products...");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "NonExistentProduct" } });

    await waitFor(() => {
      expect(screen.getByText("No products found")).toBeInTheDocument();
    });
  });
});
