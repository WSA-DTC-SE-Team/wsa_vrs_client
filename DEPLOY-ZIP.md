# VRS Client - ZIP 배포 가이드

## 📦 로컬에서 배포용 빌드 만들기

### 1단계: 프로덕션 빌드 + ZIP 생성

```bash
npm run build:zip
```

이 명령어는:
1. ✅ 프로덕션 환경 변수로 빌드 (`https://mswpms.co.kr:35000`)
2. ✅ 자동으로 ZIP 파일 생성 (`deploy/vrs-client-prod-YYYYMMDD_HHMM.zip`)

생성되는 ZIP 파일에 포함되는 것들:
- `.next/` - 빌드된 파일들
- `public/` - 정적 파일들
- `package.json` - 의존성 목록
- `package-lock.json` - 정확한 버전 고정
- `ecosystem.config.js` - PM2 설정

### 2단계: ZIP 파일 확인

```bash
ls deploy/
```

출력 예시:
```
vrs-client-prod-20260323_1530.zip  (약 50-100MB)
```

---

## 🚀 서버에 배포하기

### 1단계: 서버에 ZIP 파일 업로드

**방법 1: SCP 사용**
```bash
scp deploy/vrs-client-prod-*.zip user@server:/path/to/deploy/
```

**방법 2: FTP/SFTP 클라이언트 사용**
- FileZilla, WinSCP 등으로 업로드

### 2단계: 서버에서 압축 해제

```bash
# 서버에 접속
ssh user@server

# 배포 디렉토리로 이동
cd /path/to/deploy

# 기존 파일 백업 (선택사항)
mv .next .next.backup
mv public public.backup

# ZIP 압축 해제
unzip vrs-client-prod-20260323_1530.zip

# 또는 기존 파일 덮어쓰기
unzip -o vrs-client-prod-20260323_1530.zip
```

### 3단계: 의존성 설치

```bash
# 프로덕션 의존성만 설치
npm install --production

# 또는 모든 의존성 설치
npm install
```

### 4단계: PM2로 실행

```bash
# 새로 시작
pm2 start ecosystem.config.js

# 또는 재시작 (이미 실행 중인 경우)
pm2 restart vrs-client

# 또는 reload (무중단 재시작)
pm2 reload vrs-client
```

### 5단계: 확인

```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs vrs-client --lines 50

# 브라우저에서 접속
# https://vrs.mswpms.co.kr:444
```

---

## 🔍 환경 변수 확인

빌드된 파일에 올바른 API URL이 들어갔는지 확인:

```bash
# 로컬에서 빌드 후 확인
npm run build:prod

# 빌드 로그에서 확인
# 🔧 [next.config] API URL: https://mswpms.co.kr:35000

# 또는 빌드된 파일 직접 확인
grep -r "mswpms.co.kr:35000" .next/
```

---

## 📋 배포 스크립트 (자동화)

서버에 `deploy.sh` 스크립트 만들기:

```bash
#!/bin/bash

# 변수 설정
DEPLOY_DIR="/path/to/wsa_vrs_client"
ZIP_FILE="$1"

if [ -z "$ZIP_FILE" ]; then
    echo "❌ 사용법: ./deploy.sh <zip-file-name>"
    exit 1
fi

echo "🚀 배포 시작: $ZIP_FILE"

cd $DEPLOY_DIR

# 백업
echo "📦 기존 파일 백업..."
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
mv .next $BACKUP_DIR/ 2>/dev/null
mv public $BACKUP_DIR/ 2>/dev/null

# 압축 해제
echo "📂 압축 해제..."
unzip -o $ZIP_FILE

# 의존성 설치
echo "📥 의존성 설치..."
npm install --production

# PM2 재시작
echo "🔄 애플리케이션 재시작..."
pm2 reload vrs-client

echo "✅ 배포 완료!"
pm2 status vrs-client
```

사용:
```bash
chmod +x deploy.sh
./deploy.sh vrs-client-prod-20260323_1530.zip
```

---

## ⚠️ 주의사항

### 1. 로컬에서 꼭 `build:zip` 사용

```bash
# ❌ 틀린 방법 (로컬 API URL로 빌드됨)
npm run build
zip -r deploy.zip .next public

# ✅ 올바른 방법 (프로덕션 API URL로 빌드됨)
npm run build:zip
```

### 2. node_modules는 포함 안됨

- ZIP 파일에 `node_modules`는 포함되지 않습니다
- 서버에서 `npm install` 필요합니다
- 이유: 파일 크기 절약 (수백 MB 차이)

### 3. Nginx 설정 필요

서버의 Nginx가 static 파일을 직접 서빙하도록 설정되어 있어야 합니다.

```nginx
location /_next/static/ {
    alias /path/to/wsa_vrs_client/.next/static/;
    expires 365d;
    access_log off;
}
```

---

## 🔧 트러블슈팅

### ZIP 생성 실패

**Windows에서 PowerShell 에러:**
```bash
# Node.js 스크립트 직접 실행
node scripts/create-zip.js
```

**수동 ZIP 생성:**
```bash
# 프로덕션 빌드
npm run build:prod

# 수동으로 압축 (PowerShell)
Compress-Archive -Path .next,public,package.json,package-lock.json,ecosystem.config.js -DestinationPath deploy/manual.zip
```

### API URL이 로컬 주소로 나오는 경우

빌드 로그 확인:
```bash
npm run build:prod

# 출력에서 확인:
# 🔧 [next.config] API URL: https://mswpms.co.kr:35000
```

만약 `http://192.168.20.249:35000`로 나온다면:
- `build:prod` 대신 `build`를 실행한 것
- 다시 `npm run build:zip` 실행

### 서버에서 404 에러 (CSS 깨짐)

1. Nginx 설정에서 `/_next/static/` 경로 확인
2. 파일 권한 확인: `chmod -R 755 .next`
3. Nginx 재시작: `sudo systemctl restart nginx`

---

## 📊 버전 관리

배포할 때마다 자동으로 날짜가 포함된 ZIP 파일이 생성됩니다:

```
deploy/
├── vrs-client-prod-20260323_1530.zip  (오늘 15:30 빌드)
├── vrs-client-prod-20260323_1200.zip  (오늘 12:00 빌드)
└── vrs-client-prod-20260320_1700.zip  (3일 전 빌드)
```

이전 버전으로 롤백이 필요하면 이전 ZIP 파일을 사용하세요.

---

## 🎯 요약

| 작업 | 명령어 |
|------|--------|
| 배포용 빌드 | `npm run build:zip` |
| ZIP 파일 위치 | `deploy/vrs-client-prod-*.zip` |
| 서버 압축 해제 | `unzip vrs-client-prod-*.zip` |
| 의존성 설치 | `npm install --production` |
| PM2 재시작 | `pm2 reload vrs-client` |

**환경 변수는 자동 적용됩니다!** 서버에서 별도 설정 불필요 ✅
