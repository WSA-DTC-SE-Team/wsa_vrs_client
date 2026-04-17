# VRS Client

차량 예약 시스템 (Vehicle Reservation System) 클라이언트

---

## 🚀 빠른 시작

### 로컬 개발
```bash
npm install
npm run dev
```
- 포트: `3028`
- API: `http://192.168.20.249:35000`

### 프로덕션 배포
```bash
npm install
npm run build
npm run start:prod
```
- 포트: `4005`
- API: `https://mswpms.co.kr:35000`

---

## 📋 환경 자동 감지

이 프로젝트는 **환경 변수 존재 여부**로 자동으로 환경을 감지합니다:

| 환경 변수 | API URL | 용도 |
|-----------|---------|------|
| `NEXT_PUBLIC_API_URL` **있음** | `http://192.168.20.249:35000` | 로컬 개발 |
| `NEXT_PUBLIC_API_URL` **없음** | `https://mswpms.co.kr:35000` | 프로덕션 배포 |

### 작동 방식:

1. **로컬 개발 시**: `npm run dev` 실행
   - `NEXT_PUBLIC_API_URL=local` 환경 변수 설정됨
   - → 로컬 API (`192.168.20.249`) 사용

2. **서버 배포 시**: `npm run build` 실행
   - 환경 변수 없음
   - → 프로덕션 API (`mswpms.co.kr`) 사용

**별도 설정 필요 없음!** ✅

---

## 📦 서버 배포 방법

### ZIP 파일 배포 (권장)

#### 로컬에서:
```bash
# 1. 프로덕션 빌드 (환경 변수 없이)
npm run build

# 2. 필요한 파일들을 압축
# .next, public, package.json, package-lock.json, ecosystem.config.js
```

#### 서버에서:
```bash
# 1. ZIP 파일 업로드 후 압축 해제
unzip deploy.zip

# 2. 의존성 설치
npm install --production

# 3. PM2로 실행
pm2 start ecosystem.config.js

# 또는 재시작
pm2 restart vrs-client
```

---

## 🔧 스크립트 설명

| 명령어 | 설명 | 환경 변수 | API URL |
|--------|------|-----------|---------|
| `npm run dev` | 로컬 개발 서버 | ✅ 있음 | `http://192.168.20.249:35000` |
| `npm run build` | 프로덕션 빌드 | ❌ 없음 | `https://mswpms.co.kr:35000` |
| `npm run start` | 빌드된 앱 실행 | - | 빌드 시 설정된 URL |
| `npm run start:prod` | 프로덕션 포트로 실행 (4005) | - | 빌드 시 설정된 URL |

---

## 📁 주요 파일

환경별 API URL이 적용되는 파일들:

- `next.config.ts` - Next.js rewrites (API 프록시)
- `middleware.ts` - 토큰 refresh API
- `app/components/features/getData.tsx` - 서버 컴포넌트 fetch
- `app/lib/axios.ts` - 클라이언트 axios (rewrites 통해 프록시)

---

## 🐛 트러블슈팅

### 빌드 시 API URL 확인

```bash
npm run build

# 출력 확인:
# 🔧 [next.config] API URL: https://mswpms.co.kr:35000
# 🔧 [next.config] ENV: undefined  ← 프로덕션 (환경 변수 없음)
```

### 로컬 개발 시 API URL 확인

```bash
npm run dev

# 출력 확인:
# 🔧 [next.config] API URL: http://192.168.20.249:35000
# 🔧 [next.config] ENV: local  ← 로컬 (환경 변수 있음)
```

### CSS 깨지는 경우 (서버)

**원인**: Nginx가 static 파일을 찾지 못함

**해결**: Nginx 설정 확인
```nginx
location /_next/static/ {
    alias /path/to/wsa_vrs_client/.next/static/;
    expires 365d;
    access_log off;
    add_header Cache-Control "public, immutable";
}
```

---

## 🔑 환경 관리

### 환경 변수 로직

```typescript
// next.config.ts, middleware.ts, getData.tsx
const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? "http://192.168.20.249:35000"  // 환경 변수 있음 → 로컬
    : "https://mswpms.co.kr:35000";  // 환경 변수 없음 → 프로덕션
```

### 핵심 원리

- ✅ 로컬: `npm run dev`가 `NEXT_PUBLIC_API_URL=local` 설정
- ✅ 서버: `npm run build` 실행 시 환경 변수 없음
- ✅ **서버에서 별도 설정 필요 없음!**

---

## 📄 License

Private
