const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function prepareDeploy() {
  console.log('🚀 배포 파일 준비 시작...');

  const rootDir = path.join(__dirname, '..');
  const standaloneDir = path.join(rootDir, '.next', 'standalone', 'wsa_vrs_client');
  const staticDir = path.join(rootDir, '.next', 'static');
  const publicDir = path.join(rootDir, 'public');

  try {
    // 1. public 폴더 복사
    console.log('📁 public 폴더 복사 중...');
    await fs.copy(publicDir, path.join(standaloneDir, 'public'));
    console.log('✅ public 폴더 복사 완료');

    // 2. .next/static 폴더 복사
    console.log('📁 .next/static 폴더 복사 중...');
    await fs.copy(staticDir, path.join(standaloneDir, '.next', 'static'));
    console.log('✅ .next/static 폴더 복사 완료');

    // 3. ZIP 파일 생성
    console.log('📦 ZIP 파일 생성 중...');
    const output = fs.createWriteStream(path.join(rootDir, 'wsa_vrs_client.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ ZIP 파일 생성 완료 (${archive.pointer()} bytes)`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(standaloneDir, 'wsa_vrs_client');
    await archive.finalize();

    console.log('🎉 배포 파일 준비 완료!');
  } catch (error) {
    console.error('❌ 배포 파일 준비 실패:', error);
    process.exit(1);
  }
}

prepareDeploy();
