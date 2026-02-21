#!/usr/bin/env bash
# FlexAI — MySQL 초기 설정 스크립트
# VM에서 실행: sudo bash deploy/setup-mysql.sh
set -euo pipefail

DB_NAME="my_app"
DB_USER="flexai_user"
DB_PASS="Pis82825@pis"

echo "=== FlexAI MySQL 초기 설정 ==="

# 1. MySQL 설치 확인
if ! command -v mysql &>/dev/null; then
  echo "[1/4] MySQL 설치 중..."
  apt-get update -qq
  apt-get install -y mysql-server
else
  echo "[1/4] MySQL 이미 설치됨 — 건너뜀"
fi

# 2. MySQL 서비스 활성화
echo "[2/4] MySQL 서비스 활성화..."
systemctl enable --now mysql

# 3. DB + 전용 계정 생성
#    sudo mysql → root auth_socket으로 소켓 연결 (비밀번호 불필요)
#    root 자체는 건드리지 않고, 앱 전용 계정만 생성
echo "[3/4] DB와 앱 계정 생성..."
mysql << SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost'
  IDENTIFIED BY '${DB_PASS}';

GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';

FLUSH PRIVILEGES;
SQL

# 4. 연결 테스트
echo "[4/4] 연결 테스트..."
mysql -u "${DB_USER}" -p"${DB_PASS}" -e \
  "USE \`${DB_NAME}\`; SELECT 'OK' AS status;"

echo ""
echo "=== 완료! ==="
echo "  DB   : ${DB_NAME}"
echo "  User : ${DB_USER}@localhost"
echo ""
echo "다음 단계:"
echo "  bash deploy/setup-env.sh   # .env 생성"
echo "  bash deploy/deploy.sh      # 배포"
