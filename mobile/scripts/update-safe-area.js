const fs = require('fs');
const path = require('path');

const mobileDir = path.resolve(__dirname, '..');
const files = [
  'app/(tabs)/books.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/invoices.tsx',
  'app/(tabs)/learn.tsx',
  'app/(tabs)/profile.tsx',
  'app/(tabs)/tax.tsx',
  'app/expenses/review.tsx',
  'app/expenses/scan.tsx',
  'app/invoices/new.tsx',
  'app/learn/chat.tsx',
  'app/scan/index.tsx',
  'app/scan/readiness.tsx',
  'app/scan/report.tsx',
  'app/scan/review.tsx'
];

for (const rel of files) {
  const fullPath = path.join(mobileDir, rel);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const oldImport = "import { SafeAreaView } from 'react-native-safe-area-context';";
    const newImport = "import { SafeAreaView } from '../../src/components/SafeAreaView';";
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Updated: ' + rel);
    } else {
      console.log('Already up to date: ' + rel);
    }
  } else {
    console.warn('File not found: ' + fullPath);
  }
}
console.log('Done updating SafeAreaView imports.');
