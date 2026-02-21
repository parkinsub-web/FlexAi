#!/usr/bin/env bash
# FlexAI — 전체 배포 스크립트 (nos-web VM에서 실행)
# 사용법: bash deploy/deploy.sh
set -euo pipefail

APP_DIR="/var/www/html"
DEPLOY_DIR="${APP_DIR}/deploy"

echo "========================================="
echo " FlexAI 배포 시작"
echo "========================================="

# 0. .env 파일 존재 확인
echo ""
echo "[0/6] .env 파일 확인..."
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "❌ 오류: ${APP_DIR}/.env 파일이 없습니다."
  echo "   먼저 실행: bash ${DEPLOY_DIR}/setup-env.sh"
  exit 1
fi
echo "   .env 파일 확인됨 ✅"

# 1. 의존성 설치
echo ""
echo "[1/6] npm 의존성 설치..."
cd "${APP_DIR}"
npm ci --omit=dev

# 2. MySQL 연결 테스트
echo ""
echo "[2/6] MySQL 연결 테스트..."
node -e "
  require('dotenv').config({ path: '${APP_DIR}/.env' });
  const mysql = require('mysql2/promise');
  (async () => {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 5000,
    });
    const [rows] = await conn.query('SELECT 1 AS ok');
    console.log('  MySQL 연결 성공 ✅', rows[0]);
    await conn.end();
  })().catch(err => {
    console.error('  MySQL 연결 실패:', err.message);
    console.error('  → sudo bash deploy/setup-mysql.sh 을 먼저 실행하세요.');
    process.exit(1);
  });
"

# 3. PM2 설치 및 PATH 설정
echo ""
echo "[3/6] PM2 확인..."
if ! command -v pm2 &>/dev/null; then
  echo "   PM2 미설치 → 전역 설치 중..."
  npm install -g pm2
fi

# npm 글로벌 bin 경로를 확실하게 PATH에 추가
NPM_GLOBAL_BIN="$(npm bin -g 2>/dev/null || dirname "$(npm root -g)")/bin"
export PATH="${NPM_GLOBAL_BIN}:${PATH}"

# pm2 절대경로 확보
PM2_BIN="$(command -v pm2 || echo "${NPM_GLOBAL_BIN}/pm2")"
echo "   PM2 준비됨 ✅ (v$("${PM2_BIN}" --version))"

# 4. PM2로 앱 시작/재시작
echo ""
echo "[4/6] PM2 프로세스 시작..."
if "${PM2_BIN}" describe flexai-site &>/dev/null; then
  "${PM2_BIN}" reload "${DEPLOY_DIR}/ecosystem.config.js" --update-env
else
  "${PM2_BIN}" start "${DEPLOY_DIR}/ecosystem.config.js"
fi
"${PM2_BIN}" save
"${PM2_BIN}" startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null || true

# 5. Nginx 설치 확인 및 설정 적용
echo ""
echo "[5/6] Nginx 설정 적용..."
if ! command -v nginx &>/dev/null; then
  echo "   Nginx 미설치 → 설치 중..."
  apt-get update -qq && apt-get install -y nginx
fi
sudo cp "${DEPLOY_DIR}/nginx-flexai.conf" /etc/nginx/sites-available/flexai
sudo ln -sf /etc/nginx/sites-available/flexai /etc/nginx/sites-enabled/flexai
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

# 6. 완료 및 상태 확인
echo ""
echo "[6/6] 배포 완료 — 상태 확인..."
sleep 2
"${PM2_BIN}" list
echo ""
echo "서버 로그 확인: ${PM2_BIN} logs flexai-site --lines 20"
echo ""
echo "========================================="
echo " 배포 완료!"
echo " 접속: http://$(curl -s --max-time 3 ifconfig.me 2>/dev/null || echo '<VM-외부IP>')"
echo "========================================="
