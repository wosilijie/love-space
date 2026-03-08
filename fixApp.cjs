const fs = require('fs');
const appPath = './src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');

// Patch 1: Mock Auth
app = app.replace(
  /\/\/ Auth 认证\s*useEffect\(\(\) => \{/g,
  "// Auth 认证\n  useEffect(() => {\n    if (firebaseConfig.apiKey === 'AIzaSyDummyKeyForLocalPreviewDoNotUse123') { setUser({ uid: 'mock' }); return; }"
);

// Patch 2: Mock Data Sync
app = app.replace(
  /\/\/ 数据同步\s*useEffect\(\(\) => \{\s*if \(!user\) return;/g,
  "// 数据同步\n  useEffect(() => {\n    if (!user) return;\n    if (firebaseConfig.apiKey === 'AIzaSyDummyKeyForLocalPreviewDoNotUse123') return;"
);

fs.writeFileSync(appPath, app, 'utf8');
console.log('App.jsx patched.');
