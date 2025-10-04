#!/bin/bash

# Function to handle cleanup for a given directory
cleanup_directory() {
    local dir="$1"
    
    # Navigate to the specified directory
    cd "$dir" || return
    
    # Check if dist.zip exists and remove the existing dist folder if it does
    if [ -f "dist.zip" ]; then
        rm -rf dist
        
        # Unzip the dist.zip file
        unzip dist.zip
        
        # Remove the dist.zip file after unzipping
        rm dist.zip
    else
        echo "dist.zip not found in $dir. Skipping cleanup."
    fi
    
    # Return to the project root directory
    cd ..
}

# Paths to your backend and frontend directories
backend_dir="/path/to/your/backend"
frontend_dir="/path/to/your/frontend"

# Call the function for both directories
cleanup_directory "$backend_dir"
cleanup_directory "$frontend_dir"