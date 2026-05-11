# SYNERGY HR/Payroll Deployment Guide (Windows Server)

This document provides step-by-step instructions to set up, run, and maintain the SYNERGY HR/Payroll application on a Windows Server environment.

---

## 1. Prerequisites

*   **Node.js**: v14.21.3 (Current Environment)
*   **Database**: MSSQL Server with Windows Authentication enabled.
*   **Global Tools**: Install the following globally using PowerShell or CMD:
    ```bash
    npm install pm2@5.2.0 -g
    npm install serve@14.0.0 -g
    npm install pm2-windows-startup -g
    ```

---

## 2. Database Initialization

Before running the server, ensure the `Users` table is created and seeded with default credentials.

1.  Navigate to the backend directory:
    ```bash
    cd C:\SYNERGY_HRPAY\backend
    ```
2.  Run the seeding script:
    ```bash
    npm run seed
    ```
    *   **Default Admin**: `admin` / `admin123`
    *   **Default Manager**: `manager` / `manager123`

---

## 3. Backend Deployment

The backend runs on port **5000**.

1.  Install dependencies (already configured for Node 14 compatibility):
    ```bash
    cd C:\SYNERGY_HRPAY\backend
    npm install
    ```
2.  Start the backend with PM2:
    ```bash
    pm2 start index.js --name "synergy-backend"
    ```

---

## 4. Frontend Deployment

The frontend runs on port **3000** and is served as a static build.

1.  **Configure Environment**: Ensure `C:\SYNERGY_HRPAY\frontend\.env` has the correct Public IP:
    ```env
    REACT_APP_API_URL=http://95.111.234.199:5000/api
    DANGEROUSLY_DISABLE_HOST_CHECK=true
    ```
2.  **Build the Project**:
    ```bash
    cd C:\SYNERGY_HRPAY\frontend
    npm run build
    ```
3. **Start the Frontend with PM2**:
    ```bash
    cd C:\SYNERGY_HRPAY\frontend
    pm2 start serve.js --name "synergy-frontend"
    ```
---

## 5. Network & Firewall Configuration

To allow external access, open the ports in Windows Firewall. Run these in **PowerShell (Admin)**:

```powershell
# Open Backend Port
netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=5000

# Open Frontend Port
netsh advfirewall firewall add rule name="Node Frontend" dir=in action=allow protocol=TCP localport=3000
```

---

## 6. Persistence (Auto-Start on Boot)

To ensure the application restarts automatically if the server reboots:

1.  Set up the startup script:
    ```bash
    pm2-startup install
    ```
2.  Save the current running processes:
    ```bash
    pm2 save
    ```

---

## 7. Monitoring & Maintenance

*   **Check Status**: `pm2 status`
*   **View Logs**: `pm2 logs`
*   **Restart All**: `pm2 restart all`
*   **Stop All**: `pm2 stop all`

---

## Troubleshooting Note (Node 14)
Due to the server using Node v14, the following package versions are pinned to ensure compatibility:
*   `mssql`: ^7.2.1
*   `msnodesqlv8`: ^2.1.0
*   `express`: ^4.21.2
