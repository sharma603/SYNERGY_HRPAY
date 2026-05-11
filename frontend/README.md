# SYNERGY HRPAY Frontend

Modern React-based frontend for the SYNERGY HR/Payroll management system.

## Features

- **Dashboard** - Overview of key metrics
- **Employee Management** - Create, read, update, and delete employees
- **Payroll Management** - Manage salary, bonuses, and deductions
- **Attendance Tracking** - Track employee check-in/check-out and attendance status
- **Leave Management** - Handle leave requests and approvals

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## Running

```bash
# Development mode
npm start

# Build for production
npm build

# Run tests
npm test
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navigation.js
│   │   └── Sidebar.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Employees.js
│   │   ├── Payroll.js
│   │   ├── Attendance.js
│   │   └── Leaves.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── .env
```

## Dependencies

- **React** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Bootstrap** - UI framework
- **React Bootstrap** - Bootstrap components for React

## API Integration

All API calls are made through the `services/api.js` module which uses Axios to communicate with the backend.

Base URL: `http://localhost:5000/api`

### Available Endpoints

- Employees: `/employees`
- Payroll: `/payroll`
- Attendance: `/attendance`
- Leaves: `/leaves`
