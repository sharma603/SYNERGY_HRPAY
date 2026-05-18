module.exports = {
  apps: [
    {
      name: 'synergy-backend',
      script: 'index.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'synergy-frontend',
      script: 'serve',
      cwd: './frontend',
      args: '-s build -l 3000',
      env: {
        NODE_ENV: 'production'
      },
      watch: false
    },
    {
      name: 'synergy-webhook',
      script: 'webhook.js',
      cwd: '.',
      env: {
        NODE_ENV: 'production'
      },
      watch: false
    }
  ]
};
