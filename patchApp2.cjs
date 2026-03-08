const fs = require('fs');

const path = './src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add WhatToEat import
if (!content.includes("import WhatToEat")) {
    content = content.replace(
        "import AchievementSystem from './AchievementSystem';",
        "import AchievementSystem from './AchievementSystem';\nimport WhatToEat from './WhatToEat';"
    );
}

// Add Utensils to lucide-react (using a regex to find the lucide-react import block)
if (!content.includes("Utensils\n} from 'lucide-react'") && !content.includes("Utensils,")) {
    content = content.replace(
        "  Repeat\n} from 'lucide-react';",
        "  Repeat,\n  Utensils\n} from 'lucide-react';"
    );
    // Fallback if previous fails due to OS carriage returns
    content = content.replace(
        "  Repeat\r\n} from 'lucide-react';",
        "  Repeat,\r\n  Utensils\r\n} from 'lucide-react';"
    );
}

// Add the 6th tab
if (!content.includes("id: 'food', icon: Utensils")) {
    const navString = "{ id: 'achievements', icon: Trophy, label: '成就墙', color: 'bg-amber-500', text: 'text-amber-400' }";
    const newNavString = navString + ",\n          { id: 'food', icon: Utensils, label: '今天吃啥', color: 'bg-orange-500', text: 'text-orange-400' }";
    content = content.replace(navString, newNavString);
}

fs.writeFileSync(path, content, 'utf8');
console.log("App.jsx patched successfully via script.");
