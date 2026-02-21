#!/usr/bin/env bash
# FlexAI — VM에 .env 파일 생성 스크립트
# 사용법: bash deploy/setup-env.sh
set -euo pipefail

APP_DIR="/home/flexai/app"
ENV_FILE="${APP_DIR}/.env"

echo "=== FlexAI .env 생성 ==="

if [ -f "${ENV_FILE}" ]; then
  echo "⚠️  ${ENV_FILE} 이 이미 존재합니다."
  read -rp "  덮어쓰시겠습니까? (y/N): " overwrite
  if [[ "${overwrite}" != "y" && "${overwrite}" != "Y" ]]; then
    echo "  취소됨."
    exit 0
  fi
fi

cat > "${ENV_FILE}" << 'EOF'
PORT=8080

# MySQL 접속 정보
DB_USER=root
DB_PASSWORD=Pis82825@pis
DB_NAME=my_app
DB_HOST=127.0.0.1
DB_PORT=3306
EOF

chmod 600 "${ENV_FILE}"

echo ""
echo "✅ ${ENV_FILE} 생성 완료"
echo "   DB_USER=root / DB_NAME=my_app / DB_HOST=127.0.0.1"
echo ""
echo "다음 단계: 배포를 실행하세요."
echo "  bash deploy/deploy.sh"
