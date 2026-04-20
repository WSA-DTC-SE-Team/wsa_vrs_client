# GitHub Actions 자동 배포 설정 가이드

이 문서는 Next.js 애플리케이션을 GitHub Actions를 통해 프로덕션 서버에 자동으로 배포하는 방법을 설명합니다.

## 목차
1. [GitHub Secrets 설정](#1-github-secrets-설정)
2. [배포 워크플로우 이해하기](#2-배포-워크플로우-이해하기)
3. [코드 구조 및 동작 원리](#3-코드-구조-및-동작-원리)
4. [배포 트리거 방법](#4-배포-트리거-방법)
5. [문제 해결 가이드](#5-문제-해결-가이드)
6. [서버 설정](#6-서버-설정)

---

## 1. GitHub Secrets 설정

GitHub 저장소 설정에서 다음 Secret을 추가하세요:

### Settings > Secrets and variables > Actions > New repository secret

#### 1.1. SSH_PRIVATE_KEY
- Name: `SSH_PRIVATE_KEY`
- Secret: `wsa_mes_key.pem` 파일의 전체 내용을 복사하여 붙여넣기
  ```
  -----BEGIN RSA PRIVATE KEY-----
  (전체 키 내용)
  -----END RSA PRIVATE KEY-----
  ```

#### 1.2. SSH_PASSPHRASE (중요!)
- Name: `SSH_PASSPHRASE`
- Secret: SSH 키의 passphrase (예: `wsadtc!@#$`)
- **주의:** Passphrase는 평문(plain text)으로 입력하세요. 인코딩 필요 없습니다.

> **왜 Passphrase가 필요한가?**
> - SSH 키가 passphrase로 보호되어 있기 때문에, GitHub Actions에서도 이 passphrase를 입력해야 합니다.
> - `appleboy/scp-action`과 `appleboy/ssh-action`은 passphrase를 자동으로 처리해줍니다.

## 2. 로컬 PEM 키 파일 내용 확인 방법

```bash
# Windows (PowerShell)
Get-Content wsa_mes_key.pem

# Windows (CMD)
type wsa_mes_key.pem

# Linux/Mac
cat wsa_mes_key.pem
```

---

## 2. 배포 워크플로우 이해하기

### 2.1. deploy.yml 파일 구조

`.github/workflows/deploy.yml` 파일은 다음과 같은 단계로 구성되어 있습니다:

#### 단계 1-4: 빌드
```yaml
- Checkout code           # Git 저장소 코드 가져오기
- Setup Node.js          # Node.js 20 설치
- Install dependencies   # npm ci로 의존성 설치
- Build application      # npm run build (NEXT_PUBLIC_API_URL=production)
```

#### 단계 5: 배포 파일 준비
```yaml
- Prepare deployment files   # scripts/prepare-deploy.js 실행
```
- `.next/standalone/wsa_vrs_client/` 폴더에 `public`과 `.next/static` 복사
- ZIP 파일 생성

#### 단계 5-1: ZIP 내용 확인 (디버그)
```yaml
- Verify ZIP contents   # ZIP 파일 내용 검증
```
- ZIP 파일 크기 확인
- server.js, package.json, public, .next/static 파일 존재 여부 확인

#### 단계 6: 서버로 전송
```yaml
- Upload to server   # appleboy/scp-action 사용
```
- **중요:** `appleboy/scp-action`은 passphrase 보호된 SSH 키를 지원합니다
- `wsa_vrs_client.zip`을 서버의 `~/com_wsa_client/com_wsa_vrs/deploy/`로 전송

#### 단계 7: 서버에서 배포 실행
```yaml
- Deploy on server   # appleboy/ssh-action 사용
```
1. 기존 폴더를 백업 (타임스탬프 포함)
2. ZIP 압축 해제
3. **Docker 컨테이너 재생성** (환경 변수 포함)
   ```bash
   docker run -d \
     --name wsa-vrs-client \
     --network host \
     -v ~/com_wsa_client/com_wsa_vrs/deploy:/app \
     -w /app \
     -e PORT=4005 \
     -e NEXT_PUBLIC_API_URL=production  # ← 핵심!
     --health-cmd="curl -f http://localhost:4005 || exit 1" \
     --health-interval=30s \
     --health-timeout=10s \
     --health-retries=3 \
     --health-start-period=60s \
     node:20 \
     node wsa_vrs_client/server.js
   ```
4. 오래된 백업 삭제 (최근 3개만 유지)

---

## 3. 코드 구조 및 동작 원리

### 3.1. 환경 변수 처리 방식

#### next.config.ts
```typescript
async rewrites() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL === "local"
      ? "http://192.168.20.249:35000"    // 로컬 개발
      : "https://mswpms.co.kr:35000";    // 프로덕션

  return [
    {
      source: "/api/:path*",
      destination: `${apiUrl}/api/:path*`,
    },
  ];
}
```
- **빌드 타임**에 API URL이 결정됩니다
- 클라이언트 컴포넌트의 `/api` 호출은 이 설정으로 프록시됩니다

#### app/components/features/getData.tsx (서버 컴포넌트)
```typescript
// 환경 변수가 "local"이면 로컬(249:35000), 아니면 배포(localhost:8081)
const isLocal = process.env.NEXT_PUBLIC_API_URL === "local";
const baseUrl = isLocal
    ? "http://192.168.20.249:35000"
    : "http://localhost:8081";
const fullUrl = `${baseUrl}/api${realUrl}`;
```
- **런타임**에 서버 컴포넌트는 직접 API 서버로 호출합니다
- Docker 컨테이너 내부에서 `localhost:8081`이 실제 API 서버입니다

**중요한 차이점:**
- 클라이언트 컴포넌트: Next.js 서버의 `/api` 프록시 사용 (rewrites)
- 서버 컴포넌트: 직접 API 서버 호출 (getData.tsx)

### 3.2. scripts/prepare-deploy.js

이 스크립트는 배포 파일을 준비합니다:

```javascript
// 1. public 폴더 복사
await fs.copy(publicDir, path.join(standaloneDir, 'public'));

// 2. .next/static 폴더 복사
await fs.copy(staticDir, path.join(standaloneDir, '.next', 'static'));

// 3. ZIP 파일 생성
const archive = archiver('zip', { zlib: { level: 9 } });
archive.directory(standaloneDir, 'wsa_vrs_client');
await archive.finalize();
```

**왜 이 작업이 필요한가?**
- Next.js의 `standalone` 빌드는 `server.js`와 최소한의 파일만 포함합니다
- `public` 폴더 (정적 파일)와 `.next/static` (클라이언트 번들)은 수동으로 복사해야 합니다

---

## 4. 배포 트리거 방법

### 4.1. 자동 배포 (권장)
`main` 또는 `production` 브랜치에 push하면 자동으로 배포가 시작됩니다.

```bash
# 방법 1: main 브랜치에 직접 작업
git add .
git commit -m "메시지"
git push origin main

# 방법 2: develop 브랜치에서 작업 후 merge
git checkout develop
git add .
git commit -m "메시지"
git checkout main
git merge develop
git push origin main
```

### 4.2. 수동 배포
1. GitHub 저장소 페이지로 이동
2. `Actions` 탭 클릭
3. 왼쪽 사이드바에서 `Deploy to Production` 선택
4. 오른쪽 상단 `Run workflow` 버튼 클릭
5. `main` 브랜치 선택 후 `Run workflow` 클릭

### 4.3. 로컬에서 수동 배포 (GitHub Actions 없이)

```bash
# 1. 의존성 설치 (최초 1회)
npm install

# 2. 프로덕션 빌드 및 배포 파일 준비
npm run deploy

# 3. 서버로 전송 (passphrase 입력 필요)
scp -P 30022 -i .\wsa_mes_key.pem wsa_vrs_client.zip root@mswpms.co.kr:~/com_wsa_client/com_wsa_vrs/deploy/

# 4. SSH 접속하여 배포 (passphrase 입력 필요)
ssh -p 30022 -i .\wsa_mes_key.pem root@mswpms.co.kr

# 서버에서 실행:
cd ~/com_wsa_client/com_wsa_vrs/deploy

# 기존 컨테이너 중지 및 제거
docker stop wsa-vrs-client
docker rm wsa-vrs-client

# 백업 및 압축 해제
mv wsa_vrs_client wsa_vrs_client_backup_$(date +%Y%m%d_%H%M%S)
unzip -o wsa_vrs_client.zip

# 새 컨테이너 시작
docker run -d \
  --name wsa-vrs-client \
  --network host \
  -v ~/com_wsa_client/com_wsa_vrs/deploy:/app \
  -w /app \
  -e PORT=4005 \
  -e NEXT_PUBLIC_API_URL=production \
  --health-cmd="curl -f http://localhost:4005 || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=60s \
  node:20 \
  node wsa_vrs_client/server.js
```

---

## 5. 문제 해결 가이드

### 5.1. 배포 과정 모니터링

GitHub Actions 페이지에서 실시간으로 배포 로그를 확인할 수 있습니다:

1. GitHub 저장소 > Actions 탭
2. 최근 워크플로우 실행 클릭
3. 각 단계별 로그 확인

### 5.2. SSH 인증 실패

#### 증상
```
root@mswpms.co.kr: Permission denied (publickey).
```

#### 원인 및 해결 방법

**1) SSH_PASSPHRASE Secret이 없는 경우**
- GitHub Secrets에 `SSH_PASSPHRASE`를 추가하세요
- Passphrase는 평문으로 입력 (인코딩 불필요)

**2) ssh-agent가 작동하지 않는 경우**
- `shimataro/ssh-key-action`은 ssh-agent를 제대로 시작하지 못할 수 있습니다
- **해결:** `appleboy/scp-action`과 `appleboy/ssh-action` 사용 (현재 설정)
- 이 액션들은 ssh-agent 없이 passphrase를 직접 처리합니다

**3) 디버그 방법**
deploy.yml에 디버그 단계 추가:
```yaml
- name: Debug SSH Agent
  run: |
    echo "SSH_AUTH_SOCK: $SSH_AUTH_SOCK"
    ssh-add -l || echo "ssh-add failed"
    ps aux | grep ssh-agent
    ls -la ~/.ssh/
```

### 5.3. 서버 컴포넌트에서 데이터를 가져오지 못함

#### 증상
- 브라우저에서 "Application error: a client-side exception has occurred" 표시
- 데이터가 로드되지 않음

#### 원인
**1) Docker 컨테이너에 환경 변수가 없는 경우**
```bash
# 서버에서 확인
docker exec wsa-vrs-client env | grep NEXT_PUBLIC
```
- `NEXT_PUBLIC_API_URL=production`이 없다면 Docker run 명령어에 추가 필요

**2) getData.tsx에서 환경 변수를 잘못 체크하는 경우**
```typescript
// ❌ 잘못된 방법 (존재 여부만 체크)
const isLocal = !!process.env.NEXT_PUBLIC_API_URL;

// ✅ 올바른 방법 (값 체크)
const isLocal = process.env.NEXT_PUBLIC_API_URL === "local";
```
- 존재 여부로 체크하면 `production` 값도 `true`가 되어 로컬 API로 연결 시도
- 반드시 값을 체크해야 합니다

#### 해결
1. deploy.yml에서 Docker run 명령어에 `-e NEXT_PUBLIC_API_URL=production` 추가
2. getData.tsx에서 `===` 연산자로 값 비교

### 5.4. 빌드 실패

#### 증상
```
`destination` does not start with `/`, `http://`, or `https://` for route
```

#### 원인
next.config.ts에서 환경 변수가 URL로 매핑되지 않음

#### 해결
```typescript
// next.config.ts
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL === "local"
    ? "http://192.168.20.249:35000"
    : "https://mswpms.co.kr:35000";

  return [{
    source: "/api/:path*",
    destination: `${apiUrl}/api/:path*`,
  }];
}
```

### 5.5. Docker 컨테이너가 시작되지 않음

#### 확인 방법
```bash
# 서버에 SSH 접속 후
docker ps -a | grep wsa-vrs-client
docker logs --tail 50 wsa-vrs-client
```

#### 일반적인 원인
1. **포트 충돌:** 4005 포트가 이미 사용 중
   ```bash
   netstat -an | grep 4005
   ```
2. **파일 누락:** server.js 또는 필수 파일이 없음
   ```bash
   ls -la ~/com_wsa_client/com_wsa_vrs/deploy/wsa_vrs_client/
   ```
3. **메모리 부족:** 서버 리소스 확인
   ```bash
   free -h
   df -h
   ```

### 5.6. 배포는 성공했지만 이전 코드가 실행됨

#### 원인
`docker restart` 명령어는 기존 컨테이너를 재시작하므로 새 코드가 반영되지 않습니다.

#### 해결
컨테이너를 **재생성**해야 합니다:
```bash
docker stop wsa-vrs-client
docker rm wsa-vrs-client
docker run -d ...  # 새 컨테이너 생성
```
현재 deploy.yml은 이미 이 방식으로 설정되어 있습니다.

---

## 6. 서버 설정

### 6.1. 최초 서버 설정 (1회만)

서버에 배포 디렉토리 생성:

```bash
ssh -p 30022 -i .\wsa_mes_key.pem root@mswpms.co.kr

# 서버에서
mkdir -p ~/com_wsa_client/com_wsa_vrs/deploy
```

### 6.2. 파일 구조

```
~/com_wsa_client/com_wsa_vrs/
├── deploy/
│   ├── wsa_vrs_client/              # 현재 배포된 버전
│   │   ├── server.js                # Next.js 서버
│   │   ├── package.json
│   │   ├── public/                  # 정적 파일
│   │   └── .next/
│   │       └── static/              # 클라이언트 번들
│   ├── wsa_vrs_client_backup_20260420_123456/  # 백업 1
│   ├── wsa_vrs_client_backup_20260419_103020/  # 백업 2
│   └── wsa_vrs_client_backup_20260418_153040/  # 백업 3 (이후 자동 삭제)
```

### 6.3. Docker 컨테이너 설정

현재 컨테이너 설정:
- **이름:** wsa-vrs-client
- **포트:** 4005 (host network 모드)
- **볼륨:** `~/com_wsa_client/com_wsa_vrs/deploy:/app`
- **환경 변수:** `PORT=4005`, `NEXT_PUBLIC_API_URL=production`
- **Health Check:** 30초마다 `curl -f http://localhost:4005` 실행

---

## 7. 환경 변수 정리

### 7.1. 로컬 개발
```bash
NEXT_PUBLIC_API_URL=local
```
- next.config.ts → `http://192.168.20.249:35000`
- getData.tsx → `http://192.168.20.249:35000`

### 7.2. 프로덕션 빌드
```bash
NEXT_PUBLIC_API_URL=production
```
- next.config.ts → `https://mswpms.co.kr:35000`
- getData.tsx → `http://localhost:8081` (Docker 내부)

### 7.3. 왜 다른 URL을 사용하나?
- **클라이언트 컴포넌트:** 브라우저에서 실행 → 외부 도메인 필요 (`mswpms.co.kr`)
- **서버 컴포넌트:** Docker 컨테이너 내부에서 실행 → localhost로 직접 연결

---

## 8. 배포 스크립트 파일 구조

```
wsa_vrs_client/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions 워크플로우
├── app/
│   └── components/
│       └── features/
│           └── getData.tsx         # 서버 컴포넌트 API 호출
├── scripts/
│   └── prepare-deploy.js           # 배포 파일 준비 스크립트
├── next.config.ts                  # Next.js 설정 (rewrites)
├── package.json                    # 배포 스크립트 포함
├── wsa_mes_key.pem                # SSH 개인 키 (로컬 전용, Git 제외)
└── GITHUB_ACTIONS_SETUP.md        # 이 문서
```

---

## 9. 보안 주의사항

⚠️ **절대로 Git에 커밋하면 안 되는 파일:**
- `wsa_mes_key.pem` (SSH 개인 키)
- `.env.local` (환경 변수)
- `wsa_vrs_client.zip` (빌드 결과)

이 파일들은 `.gitignore`에 추가되어 있습니다.

⚠️ **GitHub Secrets 보안:**
- SSH_PRIVATE_KEY와 SSH_PASSPHRASE는 GitHub에서 암호화되어 저장됩니다
- 워크플로우 로그에는 표시되지 않습니다 (자동으로 마스킹됨)
- Repository secrets는 저장소 관리자만 접근 가능합니다

---

## 10. 체크리스트

### 최초 설정 시
- [ ] GitHub Secrets에 `SSH_PRIVATE_KEY` 추가
- [ ] GitHub Secrets에 `SSH_PASSPHRASE` 추가
- [ ] 서버에 배포 디렉토리 생성
- [ ] 로컬에서 빌드 테스트 (`npm run build`)
- [ ] 수동 배포로 테스트

### 배포 전 확인
- [ ] 로컬에서 코드가 정상 작동하는지 확인
- [ ] `main` 브랜치가 최신 상태인지 확인
- [ ] 이전 배포가 완료되었는지 확인 (GitHub Actions)

### 배포 후 확인
- [ ] GitHub Actions 워크플로우가 성공했는지 확인
- [ ] 프로덕션 사이트에 접속하여 동작 확인
- [ ] 브라우저 콘솔에 에러가 없는지 확인
- [ ] 서버 컴포넌트에서 데이터가 정상적으로 로드되는지 확인

---

## 부록: 문제 해결 히스토리

이 프로젝트에서 실제로 겪었던 문제와 해결 과정입니다.

### A.1. SSH Passphrase 인증 문제

**시도 1: webfactory/ssh-agent**
- ❌ 실패: passphrase 지원 안 함

**시도 2: shimataro/ssh-key-action**
- ❌ 실패: ssh-agent가 제대로 시작되지 않음
- 디버그 결과: `SSH_AUTH_SOCK` 비어있음, `Could not open a connection to your authentication agent`

**최종 해결: appleboy/scp-action + appleboy/ssh-action**
- ✅ 성공: ssh-agent 없이 passphrase를 직접 처리
- SCP와 SSH 작업에 특화된 액션

### A.2. 서버 컴포넌트 데이터 로딩 실패

**문제:** "Application error: a client-side exception has occurred"

**원인 1:** Docker 컨테이너에 환경 변수 없음
- 해결: `docker run`에 `-e NEXT_PUBLIC_API_URL=production` 추가

**원인 2:** getData.tsx에서 잘못된 환경 변수 체크
```typescript
// Before (잘못됨)
const isLocal = !!process.env.NEXT_PUBLIC_API_URL;

// After (올바름)
const isLocal = process.env.NEXT_PUBLIC_API_URL === "local";
```

### A.3. Build 실패 - Invalid Rewrite Destination

**에러:**
```
`destination` does not start with `/`, `http://`, or `https://` for route
{"source":"/api/:path*","destination":"production/api/:path*"}
```

**원인:** next.config.ts에서 "production" 문자열이 URL로 매핑되지 않음

**해결:** 삼항 연산자로 단순화
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL === "local"
  ? "http://192.168.20.249:35000"
  : "https://mswpms.co.kr:35000";
```

---

이 문서는 실제 배포 과정에서 겪었던 모든 문제와 해결 방법을 담고 있습니다.
질문이나 문제가 있으면 GitHub Issues에 등록해주세요.
