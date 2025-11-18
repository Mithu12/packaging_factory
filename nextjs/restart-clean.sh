#!/bin/bash

echo "🧹 Cleaning Next.js cache..."
rm -rf .next

echo "🔄 Restarting development server..."
npm run dev
