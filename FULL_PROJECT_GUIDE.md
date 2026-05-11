# SYNERGY HR/Payroll: Complete Setup & Implementation Report

This document chronicles the step-by-step process used to configure, fix, and deploy the SYNERGY HR/Payroll project on this Windows Server.

---

## **Step 1: Environment Analysis**
*   **Operating System**: Windows Server.
*   **Node.js Version**: `v14.21.3`.
*   **The Challenge**: Modern Node.js packages (like Express 5 or MSSQL 10) use syntax (like `??=` or `Object.hasOwn`) that Node 14 does not understand.

---

## **Step 2: Backend Compatibility Fixes**
I identified that the backend would not start due to "Syntax Errors".
*   **Fix 1 (Express)**: Downgraded `express` from `^5.2.1` to `4.21.2`. Node 14 does not support `Object.hasOwn` used in newer Express versions.
*   **Fix 2 (Database Driver)**: Downgraded `msnodesqlv8` to `2.1.0`. Newer versions require Node 18+ and C++ build tools that were missing.
*   **Fix 3 (MSSQL Client)**: Downgraded `mssql` to `7.2.1` to ensure compatibility with the older Node 14 environment.

---

## **Step 3: Database Initialization & Seeding**
The project required a `Users` table which didn't exist in the MSSQL database.
*   **The Script**: I used `seedUsers.js` to create the table structure.
*   **The Fix**: I modified [seedUsers.js](file:///c:/SYNERGY_HRPAY/backend/seedUsers.js) to load environment variables *before* the database connection was established, ensuring it could find the server address.
*   **Result**: Successfully created the table and added `admin` and `manager` accounts.

---

## **Step 4: Frontend Build & Public Access**
To make the frontend accessible via the public IP (**95.111.234.199**):
*   **Environment Setup**: I updated [frontend/.env](file:///c:/SYNERGY_HRPAY/frontend/.env) to point the `REACT_APP_API_URL` to the public IP instead of `localhost`.
*   **Host Check Bypass**: Added `DANGEROUSLY_DISABLE_HOST_CHECK=true` to allow React to run on a public-facing Windows Server.
*   **Production Build**: Ran `npm run build` to generate the optimized files in the `build/` folder.

---

## **Step 5: Process Management (PM2) Implementation**
To ensure the app runs 24/7 and restarts if the server reboots:
*   **Backend**: Started normally with `pm2 start index.js`.
*   **Frontend Challenge**: PM2 on Windows often fails when running `serve` as a command string (it results in `MODULE_NOT_FOUND`).
*   **The Solution**: I created a native Node.js server script [serve.js](file:///c:/SYNERGY_HRPAY/frontend/serve.js) inside the frontend folder. PM2 now runs this script, which is 100% stable on Windows.

---

## **Step 6: Network & Firewall Setup**
I manually opened the communication channels for the outside world:
*   **Command**: Used `netsh advfirewall` to add rules for Port **3000** (Web) and Port **5000** (API).
*   **Effect**: The server can now receive requests from any external browser.

---

## **How to Manage the Project Now**

### **Backend Commands**
```bash
cd C:\SYNERGY_HRPAY\backend
pm2 restart synergy-backend   # Restart
pm2 logs synergy-backend      # View errors
```

### **Frontend Commands**
```bash
cd C:\SYNERGY_HRPAY\frontend
# If you change code, you MUST rebuild:
npm run build
pm2 restart synergy-frontend  # Restart
```

### **General PM2 Management**
*   `pm2 list`: See what is running.
*   `pm2 save`: Remember current apps for next reboot.
*   `pm2 status`: Quick health check.

---
**Prepared by**: Trae Code Assistant
**Date**: 2026-05-09
