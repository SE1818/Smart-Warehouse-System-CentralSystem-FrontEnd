# SmartWarehouse Central System - Frontend

React-based frontend application for the SmartWarehouse Central System microservice.

## Features

- **Audit Log Viewer**: View and filter system activity logs
  - Filter by date range, activity type, severity, and search keywords
  - View detailed log information including old/new values
  - Real-time statistics dashboard

- **Warehouse Metrics Dashboard**: Monitor warehouse performance metrics
  - Temperature, humidity, pressure, light level monitoring
  - Power consumption and inventory tracking
  - Multi-warehouse support

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Axios** for API calls

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/logs/      # Log-related components
├── pages/               # Page components
├── services/            # API services
├── types/               # TypeScript types
├── App.tsx              # Main app with routing
└── main.tsx             # Entry point
```

## API Endpoints

### Audit Logs
- `GET /api/admin/audit-logs` - Get logs with filters
- `GET /api/admin/audit-logs/user/{userId}` - Get user logs
- `GET /api/admin/audit-logs/entity/{entityType}` - Get entity logs

### Warehouse Metrics
- `GET /api/admin/metrics/warehouse/{warehouseId}` - Get warehouse metrics
- `GET /api/admin/metrics/type/{metricType}` - Get metrics by type
- `GET /api/admin/metrics/latest/{warehouseId}/{metricType}` - Get latest metric