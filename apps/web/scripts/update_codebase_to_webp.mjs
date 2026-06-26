import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_DIR = path.join(__dirname, '../app');
const COMPONENTS_DIR = path.join(__dirname, '../components');

const regex = /(\.png|\.jpe?g)/gi;

function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (regex.test(content)) {
        const updated = content.replace(regex, '.webp');
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (/\.(tsx|ts|jsx|js)$/i.test(file)) {
            replaceInFile(fullPath);
        }
    }
}

async function main() {
    console.log(`Starting code replacement in ${APP_DIR}...`);
    processDirectory(APP_DIR);
    console.log(`Starting code replacement in ${COMPONENTS_DIR}...`);
    processDirectory(COMPONENTS_DIR);
    console.log('Replacement complete!');
}

main().catch(console.error);
