#!/bin/bash

# API Testing Script for Next.js ERP Migration
# Usage: ./test-api.sh

BASE_URL="http://localhost:3000"
COOKIE_FILE="test-cookies.txt"

echo "================================"
echo "Next.js ERP API Testing Script"
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

# Clean up old cookies
rm -f $COOKIE_FILE

echo "Test 1: Login with valid credentials"
echo "-------------------------------------"
read -p "Enter username: " USERNAME
read -sp "Enter password: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  -c $COOKIE_FILE)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Login successful"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Login failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "Test 2: Get user profile"
echo "------------------------"

PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/profile" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROFILE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Profile retrieved successfully"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Profile retrieval failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 3: Get settings"
echo "--------------------"

SETTINGS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/settings" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$SETTINGS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SETTINGS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Settings retrieved successfully"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Settings retrieval failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 4: Access protected route without auth"
echo "--------------------------------------------"

UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/profile")

HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_result 0 "Unauthorized access correctly blocked"
else
    print_result 1 "Unauthorized access not blocked (HTTP $HTTP_CODE)"
fi

echo ""
echo "Test 5: Logout"
echo "--------------"

LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/logout" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGOUT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    print_result 0 "Logout successful"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
else
    print_result 1 "Logout failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "Test 6: Access after logout"
echo "---------------------------"

POST_LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/profile" \
  -b $COOKIE_FILE)

HTTP_CODE=$(echo "$POST_LOGOUT_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    print_result 0 "Access correctly denied after logout"
else
    print_result 1 "Access not denied after logout (HTTP $HTTP_CODE)"
fi

# Clean up
rm -f $COOKIE_FILE

echo ""
echo "================================"
echo "Testing Complete!"
echo "================================"
