const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('../app/data/recipe.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const recipes = [];
  let isFirstLine = true;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    // name,stuff,bv,difficulty,tags,methods,tools,
    const parts = line.split(',');
    if (parts.length < 7) continue;
    
    const name = parts[0]?.trim();
    if (!name) continue;
    
    const stuff = parts[1]?.trim().split('、').filter(Boolean) || [];
    const bv = parts[2]?.trim();
    const difficulty = parts[3]?.trim();
    const tags = parts[4]?.trim().split('、').filter(Boolean) || [];
    const methods = parts[5]?.trim().split('、').filter(Boolean) || [];
    const tools = parts[6]?.trim().split('、').filter(Boolean) || [];
    
    // Hash string to number for pseudo-random but deterministic calories
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    const calories = 150 + (Math.abs(hash) % 700); // 150 to 850 kcal
    
    recipes.push({
      name,
      stuff,
      bv,
      difficulty,
      tags,
      methods,
      tools,
      calories
    });
  }

  fs.writeFileSync('./src/data/recipes.json', JSON.stringify(recipes, null, 2), 'utf8');
  console.log('Successfully wrote ' + recipes.length + ' recipes to src/data/recipes.json');
}

processLineByLine();
