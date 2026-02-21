// PM2 프로세스 관리 설정
// .env 파일은 server.js 내 dotenv.config()로 자동 로드됩니다.
// (path: __dirname 기준으로 고정되어 PM2 cwd와 무관하게 동작)
module.exports = {
  apps: [
    {
      name: 'flexai-site',
      script: 'server.js',
      cwd: '/home/flexai/app',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      // NODE_ENV와 PORT만 PM2 env로 지정.
      // DB 자격증명은 /home/flexai/app/.env 에서 dotenv가 로드.
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
  ],
};
