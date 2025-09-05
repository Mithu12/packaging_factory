#!/bin/bash

# ERP System Setup Script
echo "🚀 Setting up ERP System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL is not installed. Please install PostgreSQL."
        exit 1
    fi
    
    print_success "All requirements are met!"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        print_error "Failed to install backend dependencies"
        exit 1
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cp env.example .env
        print_warning "Please update the .env file with your database credentials"
    fi
    
    print_success "Backend setup completed!"
    cd ..
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cp env.example .env
    fi
    
    print_success "Frontend setup completed!"
    cd ..
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw erp_system; then
        print_warning "Database 'erp_system' already exists"
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Dropping existing database..."
            dropdb erp_system
        else
            print_status "Using existing database..."
        fi
    fi
    
    # Create database if it doesn't exist
    if ! psql -lqt | cut -d \| -f 1 | grep -qw erp_system; then
        print_status "Creating database..."
        createdb erp_system
        if [ $? -ne 0 ]; then
            print_error "Failed to create database. Please check your PostgreSQL connection."
            exit 1
        fi
    fi
    
    # Run migrations
    print_status "Running database migrations..."
    cd backend
    npm run db:migrate
    
    if [ $? -ne 0 ]; then
        print_error "Failed to run database migrations"
        exit 1
    fi
    
    # Seed database
    print_status "Seeding database with sample data..."
    npm run db:seed
    
    if [ $? -ne 0 ]; then
        print_error "Failed to seed database"
        exit 1
    fi
    
    cd ..
    print_success "Database setup completed!"
}

# Main setup function
main() {
    echo "=========================================="
    echo "🏢 ERP System Setup"
    echo "=========================================="
    
    check_requirements
    setup_backend
    setup_frontend
    setup_database
    
    echo "=========================================="
    print_success "🎉 Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Update backend/.env with your database credentials"
    echo "2. Start the backend server:"
    echo "   cd backend && npm run dev"
    echo "3. Start the frontend server (in a new terminal):"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "Backend will be available at: http://localhost:3001"
    echo "Frontend will be available at: http://localhost:5173"
    echo ""
    echo "API Documentation:"
    echo "- Health check: GET http://localhost:3001/health"
    echo "- Suppliers: GET http://localhost:3001/api/suppliers"
    echo "- Supplier stats: GET http://localhost:3001/api/suppliers/stats"
    echo ""
}

# Run main function
main
