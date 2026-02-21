#!/usr/bin/env bash
# FlexAI — MySQL 초기 설정 스크립트
# VM(nos-web)에서 실행: sudo bash deploy/setup-mysql.sh
set -euo pipefail

DB_NAME="${DB_NAME:-my_app}"
DB_USER="${DB_USER:-root}"
DB_ROOT_PASS="Pis82825@pis"

echo "=== FlexAI MySQL 초기 설정 ==="

# 1. MySQL 설치 (이미 설치되어 있으면 건너뜀)
if ! command -v mysql &>/dev/null; then
  echo "[1/5] MySQL 설치 중..."
  sudo apt-get update -qq
  sudo apt-get install -y mysql-server
else
  echo "[1/5] MySQL 이미 설치됨 — 건너뜀"
fi

# 2. MySQL 서비스 활성화
echo "[2/5] MySQL 서비스 활성화..."
sudo systemctl enable --now mysql

# 3. root 계정 비밀번호 인증 방식으로 변경
#    Ubuntu MySQL은 기본으로 auth_socket을 사용하므로
#    TCP(비밀번호) 접속을 위해 mysql_native_password로 교체
echo "[3/5] root 계정 인증 방식 변경 (auth_socket → mysql_native_password)..."
sudo mysql -e "
  ALTER USER 'root'@'localhost'
    IDENTIFIED WITH mysql_native_password
    BY '${DB_ROOT_PASS}';
  FLUSH PRIVILEGES;
"

# 4. 데이터베이스 생성
echo "[4/5] 데이터베이스 '${DB_NAME}' 생성..."
mysql -u root -p"${DB_ROOT_PASS}" -e \
  "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. 연결 테스트
echo "[5/5] 연결 테스트..."
mysql -u root -p"${DB_ROOT_PASS}" -e "USE \`${DB_NAME}\`; SELECT 'OK' AS status;"

echo ""
echo "=== 완료! ==="
echo "  DB   : ${DB_NAME}"
echo "  User : root"
echo ""
echo "다음 단계: setup-env.sh 를 실행해 .env 파일을 생성하세요."
echo "  sudo bash deploy/setup-env.sh"
