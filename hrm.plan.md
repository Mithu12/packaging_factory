# Implement Designations Backend Module

## Overview

The frontend already has API service calls for designations (`HRMApiService`), but the backend routes are missing. This plan implements the complete backend for designations.

## Database Schema Gap

The frontend expects two fields not in the current `designations` table:

- `grade_level` (VARCHAR) - e.g., 'Junior', 'Senior', 'Lead', 'Manager'
- `reports_to_id` (BIGINT) - self-referential FK for hierarchy

## Files to Create

### 1. Database Migration

**File:** `backend/migrations/V58_designations_extended.sql`

- Add `grade_level VARCHAR(50)` column
- Add `reports_to_id BIGINT` column with self-referential FK
- Add index on `reports_to_id`

### 2. Backend Types (Update)

**File:** [backend/src/types/hrm.ts](backend/src/types/hrm.ts)

- Add `grade_level` and `reports_to_id` to existing `Designation` interface
- Add `CreateDesignationRequest`, `UpdateDesignationRequest`, `DesignationQueryParams` interfaces

### 3. Designation Mediator

**File:** `backend/src/modules/hrm/mediators/designations/DesignationMediator.ts`

Following pattern from [DepartmentMediator.ts](backend/src/modules/hrm/mediators/departments/DepartmentMediator.ts):

- `getDesignations(queryParams)` - list with filtering, search, pagination
- `getDesignationById(id)` - single designation with joins
- `createDesignation(data, createdBy)` - create with code uniqueness check
- `updateDesignation(id, data, updatedBy)` - update with validation
- `deleteDesignation(id, deletedBy)` - soft delete with employee check
- `toggleStatus(id)` - activate/deactivate
- `bulkUpdate(action, ids)` - bulk activate/deactivate/delete
- `getDesignationHierarchy()` - recursive CTE for hierarchy view

### 4. Designation Controller

**File:** `backend/src/modules/hrm/controllers/designations.controller.ts`

Following pattern from [departments.controller.ts](backend/src/modules/hrm/controllers/departments.controller.ts):

- Request/response handling for all mediator methods
- Input validation
- Error handling with appropriate HTTP status codes
- Logging via `MyLogger`

### 5. Designation Routes

**File:** `backend/src/modules/hrm/routes/designations.routes.ts`

Endpoints to implement:

- `GET /` - list designations with pagination/filtering
- `GET /hierarchy` - get designation hierarchy tree
- `GET /export` - export designations
- `GET /:id` - get single designation
- `POST /` - create designation
- `PUT /:id` - update designation
- `DELETE /:id` - soft delete designation
- `PATCH /:id/toggle-status` - toggle active status
- `PATCH /bulk-update` - bulk operations

### 6. Register Routes

**File:** [backend/src/modules/hrm/routes/index.ts](backend/src/modules/hrm/routes/index.ts)

- Import and mount `designationsRoutes` at `/designations`

## Frontend Response Format

The frontend expects responses in this format:

```typescript
// List response
{
  designations: Designation[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}

// Single item response
{
  designation: Designation
}
```

## Permissions to Use

Existing permissions from [permission.ts](backend/src/middleware/permission.ts):

- `HR_DESIGNATIONS_CREATE`
- `HR_DESIGNATIONS_READ`
- `HR_DESIGNATIONS_UPDATE`
- `HR_DESIGNATIONS_DELETE`


todos:
Create migration V58 to add grade_level and reports_to_id columns
Add designation request/query types to backend/src/types/hrm.ts
Create DesignationMediator with all CRUD and hierarchy methods
Create designations.controller.ts with request handling
Create designations.routes.ts with all endpoints
Register designation routes in HRM module index

Create migration V58 to add grade_level and reports_to_id columns
Add designation request/query types to backend/src/types/hrm.ts
Create DesignationMediator with all CRUD and hierarchy methods
Create designations.controller.ts with request handling
Create designations.routes.ts with all endpoints
Register designation routes in HRM module index

Create migration V58 to add grade_level and reports_to_id columns
Add designation request/query types to backend/src/types/hrm.ts
Create DesignationMediator with all CRUD and hierarchy methods
Create designations.controller.ts with request handling
Create designations.routes.ts with all endpoints
Register designation routes in HRM module index

Create migration V58 to add grade_level and reports_to_id columns
Add designation request/query types to backend/src/types/hrm.ts
Create DesignationMediator with all CRUD and hierarchy methods
Create designations.controller.ts with request handling
Create designations.routes.ts with all endpoints
Register designation routes in HRM module index
