# GitHub Actions 자동 배포 설정 가이드

## 1. GitHub Secrets 설정

GitHub 저장소 설정에서 다음 Secret을 추가하세요:

### Settings > Secrets and variables > Actions > New repository secret

**SSH_PRIVATE_KEY**
- Name: `SSH_PRIVATE_KEY`
- Secret: `wsa_mes_key.pem` 파일의 전체 내용을 복사하여 붙여넣기
  ```
  -----BEGIN RSA PRIVATE KEY-----
  (전체 키 내용)
  -----END RSA PRIVATE KEY-----
  ```

## 2. 로컬 PEM 키 파일 내용 확인 방법

```bash
# Windows (PowerShell)
Get-Content wsa_mes_key.pem

# Windows (CMD)
type wsa_mes_key.pem

# Linux/Mac
cat wsa_mes_key.pem
```

## 3. 배포 워크플로우 트리거 방법

### 자동 배포 (권장)
- `main` 브랜치에 push하면 자동으로 배포가 시작됩니다.

```bash
# develop 브랜치에서 작업 후
git checkout main
git merge develop
git push origin main
```

### 수동 배포
1. GitHub 저장소 페이지로 이동
2. `Actions` 탭 클릭
3. 왼쪽 사이드바에서 `Deploy to Production` 선택
4. 오른쪽 상단 `Run workflow` 버튼 클릭
5. `main` 브랜치 선택 후 `Run workflow` 클릭

## 4. 로컬에서 수동 배포 (GitHub Actions 없이)

```bash
# 1. 의존성 설치 (최초 1회)
npm install

# 2. 프로덕션 빌드 및 배포 파일 준비
npm run deploy

# 3. 서버로 전송
scp -P 30022 -i .\wsa_mes_key.pem wsa_vrs_client.zip root@mswpms.co.kr:~/com_wsa_client/com_wsa_vrs/deploy/

# 4. SSH 접속하여 배포
ssh -p 30022 -i .\wsa_mes_key.pem root@mswpms.co.kr

# 서버에서 실행:
cd ~/com_wsa_client/com_wsa_vrs/deploy
unzip -o wsa_vrs_client.zip
cd ~/com_wsa_client/com_wsa_vrs
docker-compose restart wsa_vrs_client
```

## 5. 배포 과정 모니터링

GitHub Actions 페이지에서 실시간으로 배포 로그를 확인할 수 있습니다:

1. GitHub 저장소 > Actions 탭
2. 최근 워크플로우 실행 클릭
3. 각 단계별 로그 확인

## 6. 배포 실패 시 대처

### 일반적인 문제 해결

**SSH 연결 실패**
- GitHub Secrets에 SSH_PRIVATE_KEY가 올바르게 설정되어 있는지 확인
- 키 파일에 불필요한 공백이나 줄바꿈이 없는지 확인

**빌드 실패**
- 로컬에서 `npm run build` 실행하여 빌드 에러 확인
- 의존성 문제: `npm ci` 실행

**서버 배포 실패**
- SSH로 서버 접속하여 수동 배포 테스트
- Docker 컨테이너 상태 확인: `docker ps -a`
- 서버 디스크 공간 확인: `df -h`

## 7. 서버 설정 (최초 1회)

서버에 배포 디렉토리가 없다면 생성:

```bash
ssh -p 30022 -i .\wsa_mes_key.pem root@mswpms.co.kr

# 서버에서
mkdir -p ~/com_wsa_client/com_wsa_vrs/deploy
```

## 8. 환경 변수 설정

현재 설정:
- 로컬 개발: `NEXT_PUBLIC_API_URL=local` (http://192.168.20.249:35000)
- 프로덕션 빌드: `NEXT_PUBLIC_API_URL=production` (https://mswpms.co.kr:35000)

변경이 필요하면 `next.config.ts` 파일을 수정하세요.

## 9. 배포 스크립트 파일 구조

```
wsa_vrs_client/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 워크플로우
├── scripts/
│   ├── prepare-deploy.js       # 배포 파일 준비 스크립트
│   └── create-zip.js           # (기존 파일)
├── wsa_mes_key.pem            # SSH 개인 키 (로컬 전용, Git 제외)
└── package.json               # 배포 스크립트 포함
```

## 10. 보안 주의사항

⚠️ **절대로 Git에 커밋하면 안 되는 파일:**
- `wsa_mes_key.pem` (SSH 개인 키)
- `env.local` (환경 변수)
- `wsa_vrs_client.zip` (빌드 결과)

이 파일들은 `.gitignore`에 추가되어 있습니다.
