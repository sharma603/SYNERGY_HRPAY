# SYNERGY HRPAY Backend

Node.js backend for the SYNERGY HR/Payroll management system using Express.js and MSSQL.

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the backend directory with the following variables:

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

## Running

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

- `GET /api/health` - Health check endpoint

## Project Structure

```
backend/
├── index.js          - Main server file
├── config/
│   └── database.js   - Database connection
├── routes/           - API routes
├── controllers/      - Request handlers
├── models/           - Data models
└── .env              - Environment variables
```
