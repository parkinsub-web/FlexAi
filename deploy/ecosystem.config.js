// PM2 프로세스 관리 설정
module.exports = {
  apps: [
    {
      name: 'flexai-site',
      script: 'server.js',
      cwd: '/home/flexai/app',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
  ],
};
