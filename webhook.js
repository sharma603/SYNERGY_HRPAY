const http = require('http'); 
const { exec } = require('child_process'); 
const path = require('path'); 
const crypto = require('crypto'); 
 
const PORT = 9000; 
const SECRET = '4546@SynergyHRPay'; // Matches GitHub Webhook secret
 
const server = http.createServer((req, res) => { 
  if (req.method === 'POST' && req.url === '/webhook') { 
    let body = ''; 
    req.on('data', chunk => { body += chunk.toString(); }); 
 
    req.on('end', () => { 
      // Production Security: Verify GitHub/GitLab Signature 
      const signature = req.headers['x-hub-signature-256'] || req.headers['x-gitlab-token']; 
      
      if (SECRET && SECRET !== 'your_secret_here') { 
        if (req.headers['x-hub-signature-256']) { 
          // GitHub HMAC Verification 
          const hmac = crypto.createHmac('sha256', SECRET); 
          const digest = 'sha256=' + hmac.update(body).digest('hex'); 
          if (signature !== digest) { 
            console.error('[SECURITY]: Invalid GitHub Signature'); 
            res.writeHead(401); return res.end('Invalid signature'); 
          } 
        } else if (req.headers['x-gitlab-token']) { 
          // GitLab Token Verification 
          if (signature !== SECRET) { 
            console.error('[SECURITY]: Invalid GitLab Token'); 
            res.writeHead(401); return res.end('Invalid token'); 
          } 
        } else { 
          console.error('[SECURITY]: Missing Signature Header'); 
          res.writeHead(401); return res.end('Missing signature'); 
        } 
      } 
 
      console.log('--- Production Webhook Event Received ---'); 
      console.log('Action: Full Deployment Cycle Initiated'); 
      
      const deployScript = path.join(__dirname, 'deploy.bat'); 
      console.log(`Running: ${deployScript}`); 
 
      exec(`cmd.exe /c "${deployScript}"`, (error, stdout, stderr) => { 
        if (error) { 
          console.error(`[DEPLOY ERROR]: ${error.message}`); 
          return; 
        } 
        if (stderr) { 
          console.warn(`[DEPLOY WARNING]: ${stderr}`); 
        } 
        console.log(`[DEPLOY SUCCESS]: Both Backend and Frontend have been updated.`); 
        console.log(`Output Log:\n${stdout}`); 
      }); 
 
      res.writeHead(200, { 'Content-Type': 'application/json' }); 
      res.end(JSON.stringify({ message: 'Deployment started for backend and frontend' })); 
    }); 
  } else { 
    res.writeHead(404); 
    res.end(); 
  } 
}); 
 
server.listen(PORT, () => { 
  console.log(`Webhook listener running on port ${PORT}`); 
}); 
