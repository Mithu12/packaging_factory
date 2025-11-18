#!/bin/bash

# Inventory API Testing Script for Next.js
# Usage: ./test-inventory-api.sh

BASE_URL="http://localhost:3000"
COOKIE_FILE="test-cookies.txt"

echo "================================"
echo "Inventory API Testing Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
    fi
}

# Check if already logged in
if [ ! -f $COOKIE_FILE ]; then
    echo "Please login first using ./test-api.sh"
    exit 1
fi

echo "Test 1: Get Supplier Statistics"
echo "--------------------------------"

STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/suppliers/stats" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$STATS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Supplier stats retrieved"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Supplier stats failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 2: Get All Suppliers"
echo "-------------------------"

SUPPLIERS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/suppliers?page=1&limit=5" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$SUPPLIERS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SUPPLIERS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Suppliers list retrieved"
    echo "Response: $RESPONSE_BODY" | jq '.data | length' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Suppliers list failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 3: Get Product Statistics"
echo "-------------------------------"

PRODUCT_STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/products/stats" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$PRODUCT_STATS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PRODUCT_STATS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Product stats retrieved"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Product stats failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 4: Get All Products"
echo "------------------------"

PRODUCTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/products?page=1&limit=5" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$PRODUCTS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PRODUCTS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Products list retrieved"
    echo "Response: $RESPONSE_BODY" | jq '.data | length' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Products list failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 5: Get All Categories"
echo "--------------------------"

CATEGORIES_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/categories?include_subcategories=true" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$CATEGORIES_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$CATEGORIES_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Categories list retrieved"
    echo "Response: $RESPONSE_BODY" | jq '.data | length' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Categories list failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 6: Search Products"
echo "-----------------------"

SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/products?search=test&page=1&limit=5" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$SEARCH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Product search works"
else
    print_result 1 "Product search failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "Test 7: Filter Low Stock Products"
echo "----------------------------------"

LOW_STOCK_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/inventory/products?low_stock=true&page=1&limit=5" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$LOW_STOCK_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Low stock filter works"
else
    print_result 1 "Low stock filter failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "================================"
echo "Inventory Testing Complete!"
echo "================================"
