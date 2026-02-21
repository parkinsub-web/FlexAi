#!/usr/bin/env bash
# FlexAI — MySQL 초기 설정 스크립트
# VM(nos-web)에서 실행: sudo bash deploy/setup-mysql.sh
set -euo pipefail

DB_NAME="${DB_NAME:-my_app}"
DB_USER="${DB_USER:-app_user}"

echo "=== FlexAI MySQL 초기 설정 ==="

# 1. MySQL 설치 (이미 설치되어 있으면 건너뜀)
if ! command -v mysql &>/dev/null; then
  echo "[1/4] MySQL 설치 중..."
  sudo apt-get update -qq
  sudo apt-get install -y mysql-server
else
  echo "[1/4] MySQL 이미 설치됨 — 건너뜀"
fi

# 2. MySQL 시작 및 자동 시작 설정
echo "[2/4] MySQL 서비스 활성화..."
sudo systemctl enable --now mysql

# 3. 데이터베이스 생성
echo "[3/4] 데이터베이스 '${DB_NAME}' 생성..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. 사용자 생성 (비밀번호는 프롬프트로 입력)
echo "[4/4] 사용자 '${DB_USER}' 생성..."
read -rsp "  ${DB_USER} 비밀번호 입력: " DB_PASS
echo
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo ""
echo "=== 완료! ==="
echo "  DB: ${DB_NAME}"
echo "  User: ${DB_USER}@localhost"
echo ""
echo "다음 단계: .env 파일에 아래 값을 설정하세요."
echo "  DB_HOST=127.0.0.1"
echo "  DB_PORT=3306"
echo "  DB_USER=${DB_USER}"
echo "  DB_PASSWORD=<입력한 비밀번호>"
echo "  DB_NAME=${DB_NAME}"
