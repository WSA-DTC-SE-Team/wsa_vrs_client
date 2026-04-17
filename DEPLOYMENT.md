# VRS Client 배포 가이드

## 환경 변수 설정

이 프로젝트는 `.env` 파일 없이 `package.json` 스크립트로 환경을 관리합니다.

### 환경별 API URL

| 환경 | API URL |
|------|---------|
| 로컬 개발 | `http://192.168.20.249:35000` |
| 프로덕션 | `https://mswpms.co.kr:35000` |

---

## 로컬 개발

```bash
npm install
npm run dev
```

- 포트: `3028`
- API URL: `http://192.168.20.249:35000`

---

## 프로덕션 배포

### 1. 서버에 코드 배포

```bash
# Git 사용 시
git pull origin main

# 또는 파일 직접 업로드
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 프로덕션 빌드

```bash
npm run build:prod
```

**중요:** 반드시 `build:prod` 스크립트를 사용해야 합니다!
- ✅ `npm run build:prod` - 프로덕션 API URL 자동 적용
- ❌ `npm run build` - 기본 빌드 (환경 변수 없음)

### 4. PM2로 실행

#### 방법 1: 직접 실행
```bash
pm2 start npm --name "vrs-client" -- run start:prod
```

#### 방법 2: Ecosystem 파일 사용 (추천)
```bash
pm2 start ecosystem.config.js
```

#### PM2 재시작
```bash
pm2 restart vrs-client
```

---

## Nginx 설정

**중요:** Next.js standalone 빌드를 사용하므로 static 파일을 Nginx가 직접 서빙해야 합니다.

```nginx
server {
    listen 444 ssl http2;
    server_name vrs.mswpms.co.kr;

    ssl_certificate     /etc/letsencrypt/live/mswpms.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mswpms.co.kr/privkey.pem;

    # Next.js static 파일 직접 서빙
    location /_next/static/ {
        alias /path/to/wsa_vrs_client/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # public 폴더
    location /static/ {
        alias /path/to/wsa_vrs_client/public/;
        expires 365d;
        access_log off;
    }

    # 나머지 _next 요청은 프록시
    location /_next/ {
        proxy_pass http://127.0.0.1:4005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 메인 애플리케이션
    location / {
        proxy_pass http://127.0.0.1:4005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API 프록시
    location /api/ {
        proxy_pass https://mswpms.co.kr:35000/api/;
        proxy_http_version 1.1;
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
    }
}
```

**주의:** `/path/to/wsa_vrs_client`를 실제 프로젝트 경로로 변경하세요!

---

## 배포 체크리스트

- [ ] `npm install` 실행
- [ ] `npm run build:prod` 실행 (환경 변수 자동 주입)
- [ ] Nginx 설정에서 static 파일 경로 확인
- [ ] PM2로 애플리케이션 실행
- [ ] 브라우저에서 접속 확인
- [ ] 개발자 도구에서 API 요청 URL 확인 (`https://mswpms.co.kr:35000`)

---

## 트러블슈팅

### CSS 파일이 404 에러로 깨지는 경우

**원인:** Nginx가 static 파일을 찾지 못함

**해결:**
1. Nginx 설정에서 `location /_next/static/` 블록 추가
2. `alias` 경로가 올바른지 확인
3. Nginx 재시작: `sudo systemctl restart nginx`

### API 요청이 로컬 URL로 가는 경우

**원인:** `build:prod` 대신 `build` 스크립트 사용

**해결:**
```bash
rm -rf .next
npm run build:prod
pm2 restart vrs-client
```

### 환경 변수가 적용되지 않는 경우

**확인 방법:**
빌드 시 콘솔에서 다음 로그 확인:
```
🔧 [next.config] API URL: https://mswpms.co.kr:35000
```

**해결:**
- `cross-env`가 설치되어 있는지 확인: `npm install --save-dev cross-env`
- 빌드 캐시 삭제: `rm -rf .next && npm run build:prod`

---

## 파일별 환경 변수 적용 현황

| 파일 | 환경 변수 사용 | 비고 |
|------|--------------|------|
| `next.config.ts` | ✅ `NEXT_PUBLIC_API_URL` | rewrites에서 사용 |
| `middleware.ts` | ✅ `NEXT_PUBLIC_API_URL` | refresh 토큰 API |
| `getData.tsx` | ✅ `NEXT_PUBLIC_API_URL` | 서버 컴포넌트 fetch |
| `axios.ts` | ❌ (불필요) | `/api` 사용 (rewrites 통해 프록시) |

---

## 추가 환경 변수 설정 방법

새로운 환경 변수를 추가하려면:

### 1. package.json 수정
```json
"scripts": {
  "dev": "cross-env NEXT_PUBLIC_API_URL=... NEXT_PUBLIC_NEW_VAR=value next dev -p 3028",
  "build:prod": "cross-env NEXT_PUBLIC_API_URL=... NEXT_PUBLIC_NEW_VAR=value next build"
}
```

### 2. 코드에서 사용
```typescript
const newVar = process.env.NEXT_PUBLIC_NEW_VAR;
```

**주의:** `NEXT_PUBLIC_` 접두사 필수 (브라우저에서 접근 가능하게)
