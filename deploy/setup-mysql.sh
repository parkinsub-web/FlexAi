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
#    mysql_native_password/caching_sha2_password 호환 문제 방지를 위해
#    localhost / 127.0.0.1 / ::1 (IPv6) 세 가지 호스트 모두 생성
echo "[3/4] DB와 앱 계정 생성..."
mysql << SQL
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 기존 사용자 삭제 후 재생성 (깔끔하게)
DROP USER IF EXISTS '${DB_USER}'@'localhost';
DROP USER IF EXISTS '${DB_USER}'@'127.0.0.1';
DROP USER IF EXISTS '${DB_USER}'@'::1';

CREATE USER '${DB_USER}'@'localhost'  IDENTIFIED BY '${DB_PASS}';
CREATE USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
CREATE USER '${DB_USER}'@'::1'       IDENTIFIED BY '${DB_PASS}';

GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'::1';

FLUSH PRIVILEGES;
SQL

# 4. 연결 테스트 (127.0.0.1 TCP 명시)
echo "[4/4] TCP 연결 테스트 (127.0.0.1)..."
mysql -u "${DB_USER}" -p"${DB_PASS}" -h 127.0.0.1 -e \
  "USE \`${DB_NAME}\`; SELECT 'TCP OK' AS status;"

echo ""
echo "=== 완료! ==="
echo "  DB   : ${DB_NAME}"
echo "  User : ${DB_USER}  (localhost / 127.0.0.1 / ::1)"
echo ""
echo "다음 단계:"
echo "  bash deploy/setup-env.sh   # .env 생성"
echo "  bash deploy/deploy.sh      # 배포"
