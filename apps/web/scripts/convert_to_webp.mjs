import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');

async function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await processDirectory(fullPath);
        } else if (/\.(png|jpe?g)$/i.test(file)) {
            const ext = path.extname(file);
            const baseName = path.basename(file, ext);
            const dirName = path.dirname(fullPath);
            const newPath = path.join(dirName, `${baseName}.webp`);

            console.log(`Converting ${fullPath} to WebP...`);
            try {
                await sharp(fullPath)
                    .webp({ quality: 80 })
                    .toFile(newPath);
                console.log(`Success: ${newPath}`);
            } catch (err) {
                console.error(`Error converting ${fullPath}:`, err);
            }
        }
    }
}

async function main() {
    console.log(`Starting image conversion in ${PUBLIC_DIR}...`);
    await processDirectory(PUBLIC_DIR);
    console.log('Conversion complete!');
}

main().catch(console.error);
