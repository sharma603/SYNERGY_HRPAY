@echo off 
 
 echo ============================ 
 echo DEPLOY STARTING AT %date% %time% 
 echo ============================ 
 
 :: Production Environment Setup (Adjust paths as needed for your server)
 set PM2_HOME=C:\Users\Administrator\.pm2 
 set NPM_PATH="C:\Users\Administrator\AppData\Roaming\npm\npm.cmd" 
 set PM2_PATH="C:\Users\Administrator\AppData\Roaming\npm\pm2.cmd" 
 
 cd /d C:\SYNERGY_HRPAY 
 
 echo Pulling latest code from GitHub... 
 :: Ensure Git treats this directory as safe 
 git config --global --add safe.directory C:/SYNERGY_HRPAY 
 :: Stash local changes (including untracked files) to prevent merge conflicts 
 git stash -u 
 git pull origin main 
 :: Re-apply stashed changes (like settings files) 
 git stash pop 
 if %ERRORLEVEL% neq 0 ( 
     echo [INFO] Merge handled or no local changes to re-apply. 
 ) 
 
 echo ============================ 
 echo FRONTEND BUILD START 
 echo ============================ 
 
 cd frontend 
 
 echo Cleaning old frontend build and modules... 
 if exist build rmdir /s /q build 
 if exist node_modules rmdir /s /q node_modules 
 
 echo Installing frontend dependencies... 
 call %NPM_PATH% install --no-audit --no-fund 
 if %ERRORLEVEL% neq 0 ( 
     echo [ERROR] Frontend npm install failed. 
     exit /b 1 
 ) 
 
 echo Building React app... 
 set GENERATE_SOURCEMAP=false 
 call %NPM_PATH% run build 
 if %ERRORLEVEL% neq 0 ( 
     echo [ERROR] Frontend build failed. 
     exit /b 1 
 ) 
 
 echo ============================ 
 echo BACKEND START 
 echo ============================ 
 
 cd ..\backend 
 
 echo Cleaning old backend modules... 
 if exist node_modules rmdir /s /q node_modules 
 
 echo Installing backend dependencies... 
 call %NPM_PATH% install --no-audit --no-fund 
 if %ERRORLEVEL% neq 0 ( 
     echo [ERROR] Backend npm install failed. 
     exit /b 1 
 ) 
 
 echo Restarting PM2 Services... 
 cd .. 
 call %PM2_PATH% startOrRestart ecosystem.config.js --only synergy-backend,synergy-frontend 
 call %PM2_PATH% save 
 
 echo ============================ 
 echo DEPLOY COMPLETE AT %date% %time% 
 echo ============================ 
