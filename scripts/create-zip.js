const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 배포용 ZIP 파일 생성 중...');

const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, '.next');
const publicDir = path.join(rootDir, 'public');
const packageJson = path.join(rootDir, 'package.json');
const packageLockJson = path.join(rootDir, 'package-lock.json');
const ecosystemConfig = path.join(rootDir, 'ecosystem.config.js');

// 날짜 형식으로 파일명 생성
const date = new Date();
const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
const zipFileName = `vrs-client-prod-${dateStr}.zip`;
const zipPath = path.join(rootDir, 'deploy', zipFileName);

// deploy 폴더 생성
const deployDir = path.join(rootDir, 'deploy');
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
}

console.log('압축할 파일들:');
console.log('  - .next/');
console.log('  - public/');
console.log('  - package.json');
console.log('  - package-lock.json');
console.log('  - ecosystem.config.js');

try {
    // Windows에서는 PowerShell의 Compress-Archive 사용
    if (process.platform === 'win32') {
        const powershellCmd = `
            $ProgressPreference = 'SilentlyContinue';
            Compress-Archive -Path '.next','public','package.json','package-lock.json','ecosystem.config.js' -DestinationPath '${zipPath}' -Force
        `;
        execSync(`powershell -Command "${powershellCmd}"`, { cwd: rootDir });
    } else {
        // Linux/Mac에서는 zip 명령어 사용
        execSync(`zip -r "${zipPath}" .next public package.json package-lock.json ecosystem.config.js`, { cwd: rootDir });
    }

    const stats = fs.statSync(zipPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('');
    console.log('✅ ZIP 파일 생성 완료!');
    console.log(`📁 위치: deploy/${zipFileName}`);
    console.log(`📊 크기: ${fileSizeMB} MB`);
    console.log('');
    console.log('🚀 서버 배포 방법:');
    console.log('   1. 서버에 zip 파일 업로드');
    console.log('   2. unzip ' + zipFileName);
    console.log('   3. npm install --production');
    console.log('   4. pm2 start ecosystem.config.js');
} catch (error) {
    console.error('❌ ZIP 파일 생성 실패:', error.message);
    process.exit(1);
}
