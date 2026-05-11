# SYNERGY HRPAY

Complete HR/Payroll Management System built with Node.js + Express backend and React frontend.

## Project Structure

```
SYNERGY_HRPAY/
├── backend/          # Node.js/Express backend API
│   ├── config/       # Database configuration
│   ├── controllers/  # Request handlers
│   ├── routes/       # API routes
│   ├── middleware/   # Custom middleware
│   ├── utils/        # Helper functions
│   ├── db/           # Database schema
│   ├── index.js      # Main server file
│   └── package.json
└── frontend/         # React frontend
    ├── public/       # Static files
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── pages/       # Page components
    │   └── services/    # API services
    └── package.json
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with database credentials:
```
PORT=5000
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=your_password
DB_DATABASE=SYNERGY_HRPAY
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true
NODE_ENV=development
```

4. Run database schema (in SQL Server Management Studio):
```bash
-- Execute the SQL commands from db/schema.sql
```

5. Start server:
```bash
npm start
```

Backend runs on: `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

4. Start frontend:
```bash
npm start
```

Frontend runs on: `http://localhost:3000`

## Features

### Backend
- RESTful API with Express.js
- MSSQL database integration
- Employee management
- Payroll processing
- Attendance tracking
- Leave management

### Frontend
- Dashboard with key metrics
- Employee CRUD operations
- Payroll management
- Attendance tracking
- Leave request handling
- Responsive Bootstrap UI

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Payroll
- `GET /api/payroll` - Get all payroll records
- `POST /api/payroll` - Create payroll record

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance

### Leaves
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Request leave
- `DELETE /api/leaves/:id` - Delete leave request

## Tech Stack

### Backend
- Node.js
- Express.js
- MSSQL
- Axios

### Frontend
- React
- React Router
- Bootstrap
- Axios

## Development

Both applications use hot reload during development. Simply save your changes and they will automatically refresh.

## Database

Create the database using the schema provided in `backend/db/schema.sql`. The schema includes:
- Employees table
- Payroll table
- Attendance table
- Leaves table

## Environment Variables

### Backend `.env`
```
PORT=5000
DB_SERVER=your_server
DB_USER=your_user
DB_PASSWORD=your_password
DB_DATABASE=SYNERGY_HRPAY
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true
NODE_ENV=development
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## License

ISC
