const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'src', 'App.jsx');
let c = fs.readFileSync(appPath, 'utf8');

// Add standalone import if not present
const importLine = "import { Library as BookshelfIcon } from 'lucide-react';";
if (!c.includes(importLine) && !c.includes('BookshelfIcon from')) {
  // Insert after the Trophy import line
  c = c.replace(
    "import { Trophy } from 'lucide-react';",
    "import { Trophy } from 'lucide-react';\nimport { Library as BookshelfIcon } from 'lucide-react';"
  );
  console.log('Added standalone import after Trophy');
} else {
  console.log('Import already exists');
}

fs.writeFileSync(appPath, c);

// Verify
const final = fs.readFileSync(appPath, 'utf8');
const hasImport = final.includes(importLine);
const hasNavIcon = final.includes("icon: BookshelfIcon");
console.log('Import present:', hasImport);
console.log('Nav icon ok:', hasNavIcon);
