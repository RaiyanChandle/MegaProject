import fs from 'fs';
import path from 'path';

const sourceFile = path.join('..', 'AgentConfigs', 'nexus_models.js');
const targetDir = path.join('models');

const code = fs.readFileSync(sourceFile, 'utf8');

// Find all model definitions
const modelRegex = /const (\w+) = sequelize\.define\('(\w+)',\s*({[\s\S]*?}),\s*({[\s\S]*?})\);/g;
let match;
const models = [];

while ((match = modelRegex.exec(code)) !== null) {
  const modelVarName = match[1];
  models.push(modelVarName);
}

// Associations
const assocMatch = code.match(/\/\/ =====================================================================\r?\n\/\/ ASSOCIATIONS\r?\n\/\/ =====================================================================([\s\S]*?)(?=\/\/ =====================================================================\r?\n\/\/ EXPORTS)/);
const associations = assocMatch ? assocMatch[1] : '';

// Create index.js
const imports = models.map(m => `import ${m}Model from './${m}.js';`).join('\n');
const inits = models.map(m => `const ${m} = ${m}Model(sequelize);`).join('\n');

const indexCode = `import sequelize from "../config/database.js";
import HealthCheck from "./HealthCheck.js";

${imports}

${inits}

// Associations
${associations}

const db = {
  sequelize,
  HealthCheck,
  ${models.join(',\n  ')}
};

export default db;
export { sequelize, HealthCheck, ${models.join(', ')} };
`;

fs.writeFileSync(path.join(targetDir, 'index.js'), indexCode);

console.log(`Successfully generated index.js with correct exports`);
