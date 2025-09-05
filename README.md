# 🏢 ERP System - Purchase & Inventory Module

A modern, full-stack ERP system built with React, TypeScript, Express.js, and PostgreSQL. This project focuses on the **Purchase & Inventory** module with comprehensive supplier management capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Automated Setup
```bash
# Clone the repository
git clone <repository-url>
cd erp-system

# Run the setup script
./setup.sh
```

### Manual Setup

1. **Backend Setup**:
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Update .env with your database credentials
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   cp env.example .env
   npm run dev
   ```

## 📋 Features Implemented

### ✅ Supplier Management
- **Complete CRUD Operations**: Create, read, update, and delete suppliers
- **Supplier Information**: Company details, contact info, banking information
- **Status Management**: Activate/deactivate suppliers
- **Categorization**: Organize suppliers by categories (Electronics, Furniture, Raw Materials, etc.)
- **Performance Tracking**: Rating system and order history
- **Search & Filtering**: Advanced search and filtering capabilities
- **Statistics Dashboard**: Real-time supplier statistics and metrics

### 🎯 Key Capabilities
- **Automatic Supplier Codes**: Auto-generated unique supplier codes (SUP-001, SUP-002, etc.)
- **Comprehensive Data Model**: Full supplier profiles with contact, banking, and performance data
- **Real-time Updates**: Live data synchronization between frontend and backend
- **Responsive Design**: Modern, mobile-friendly interface
- **Error Handling**: Comprehensive error handling and user feedback
- **Data Validation**: Client and server-side validation

## 🏗️ Architecture

### Backend (Express.js + TypeScript)
```
backend/
├── src/
│   ├── database/          # Database connection and migrations
│   ├── middleware/        # Error handling and validation
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic layer
│   ├── types/            # TypeScript type definitions
│   ├── validation/       # Request validation schemas
│   └── index.ts          # Application entry point
├── package.json
└── README.md
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── forms/       # Form components
│   │   └── ui/          # Base UI components
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utility functions
├── package.json
└── README.md
```

## 🗄️ Database Schema

### Suppliers Table
- Complete supplier information including contact details, banking info
- Automatic supplier code generation
- Status tracking (active/inactive)
- Performance ratings and order history
- Audit trails with created/updated timestamps

### Supplier Performance Table
- Delivery time tracking
- Quality, price, and communication ratings
- Issue tracking and on-time delivery rates
- Historical performance data

## 🔌 API Endpoints

### Suppliers
- `GET /api/suppliers` - Get all suppliers (with pagination and filtering)
- `GET /api/suppliers/stats` - Get supplier statistics
- `GET /api/suppliers/categories` - Get all supplier categories
- `GET /api/suppliers/search` - Search suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `PATCH /api/suppliers/:id/toggle-status` - Toggle supplier status
- `DELETE /api/suppliers/:id` - Delete supplier

### Health Check
- `GET /health` - Health check endpoint

## 🎨 Frontend Features

### Supplier Management Interface
- **Dashboard**: Real-time statistics and metrics
- **Supplier List**: Comprehensive table with search and filtering
- **Add Supplier Form**: Complete form with validation
- **Status Management**: Easy activate/deactivate functionality
- **Responsive Design**: Works on desktop, tablet, and mobile

### UI Components
- Modern design with Tailwind CSS
- Shadcn/ui component library
- Toast notifications for user feedback
- Loading states and error handling
- Accessible and keyboard-friendly

## 🛠️ Development

### Running in Development Mode

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   Backend will be available at: http://localhost:3001

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will be available at: http://localhost:5173

### Environment Variables

#### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_system
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

## 🧪 Testing the System

### API Testing
```bash
# Health check
curl http://localhost:3001/health

# Get all suppliers
curl http://localhost:3001/api/suppliers

# Get supplier statistics
curl http://localhost:3001/api/suppliers/stats

# Create a new supplier
curl -X POST http://localhost:3001/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Supplier",
    "contact_person": "John Doe",
    "email": "john@test.com",
    "phone": "+1234567890",
    "category": "Electronics"
  }'
```

### Frontend Testing
1. Open http://localhost:5173
2. Navigate to the Suppliers page
3. Test adding new suppliers
4. Test searching and filtering
5. Test status toggling

## 📊 Sample Data

The system comes with pre-seeded sample data including:
- 4 sample suppliers across different categories
- Performance tracking data
- Various statuses and ratings

## 🔮 Next Steps

This implementation provides a solid foundation for the Purchase & Inventory module. Future enhancements could include:

1. **Product Management**: Product catalog with categories and variants
2. **Purchase Orders**: Complete PO workflow with approval processes
3. **Inventory Tracking**: Stock levels, receipts, and adjustments
4. **Supplier Payments**: Payment tracking and reconciliation
5. **Reporting**: Advanced analytics and reporting features
6. **User Management**: Authentication and authorization
7. **Audit Trails**: Complete audit logging

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Write clear commit messages
5. Test your changes thoroughly

## 📝 License

This project is part of an ERP system development exercise.

---

**Built with ❤️ using React, TypeScript, Express.js, and PostgreSQL**
