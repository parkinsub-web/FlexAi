#!/usr/bin/env bash
# FlexAI — 전체 배포 스크립트 (nos-web VM에서 실행)
# 사용법: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="/home/flexai/app"
DEPLOY_DIR="${APP_DIR}/deploy"

echo "========================================="
echo " FlexAI 배포 시작"
echo "========================================="

# 1. 의존성 설치
echo ""
echo "[1/5] npm 의존성 설치..."
cd "${APP_DIR}"
npm ci --production

# 2. MySQL 테이블 확인 (서버 시작 시 자동 생성되지만 미리 확인)
echo ""
echo "[2/5] MySQL 연결 테스트..."
node -e "
  require('dotenv').config();
  const mysql = require('mysql2/promise');
  (async () => {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const [rows] = await conn.query('SELECT 1 AS ok');
    console.log('  MySQL 연결 성공:', rows[0]);
    await conn.end();
  })().catch(err => { console.error('  MySQL 연결 실패:', err.message); process.exit(1); });
"

# 3. PM2로 앱 시작/재시작
echo ""
echo "[3/5] PM2 프로세스 시작..."
if pm2 describe flexai-site &>/dev/null; then
  pm2 reload "${DEPLOY_DIR}/ecosystem.config.js"
else
  pm2 start "${DEPLOY_DIR}/ecosystem.config.js"
fi
pm2 save

# 4. Nginx 설정 적용
echo ""
echo "[4/5] Nginx 설정 적용..."
sudo cp "${DEPLOY_DIR}/nginx-flexai.conf" /etc/nginx/sites-available/flexai
sudo ln -sf /etc/nginx/sites-available/flexai /etc/nginx/sites-enabled/flexai
# default 설정 비활성화 (충돌 방지)
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 5. 방화벽 확인
echo ""
echo "[5/5] 완료!"
echo ""
echo "========================================="
echo " 배포 완료!"
echo " 접속: http://$(curl -s ifconfig.me)"
echo "========================================="
