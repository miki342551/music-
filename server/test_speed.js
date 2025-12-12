import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YT_DLP_PATH = path.join(__dirname, 'yt-dlp.exe');

function run(args) {
    return new Promise((resolve) => {
        const start = Date.now();
        const p = spawn(YT_DLP_PATH, args);
        let out = '';
        p.stdout.on('data', d => out += d);
        p.on('close', () => {
            console.log(`Command: ${args.join(' ')}`);
            console.log(`Time: ${Date.now() - start}ms`);
            console.log(`Output length: ${out.length}`);
            // Check if we have thumbnails in the first result
            const lines = out.trim().split('\n');
            if (lines.length > 0) {
                try {
                    const json = JSON.parse(lines[0]);
                    console.log('Has thumbnail:', !!json.thumbnail);
                    console.log('Sample title:', json.title);
                } catch (e) { console.log('Parse error'); }
            }
            resolve();
        });
    });
}

async function test() {
    console.log('--- Normal Search ---');
    await run(['ytsearch5:weeknd', '--dump-json', '--no-playlist', '--no-warnings']);

    console.log('\n--- Flat Search ---');
    await run(['ytsearch5:weeknd', '--dump-json', '--flat-playlist', '--no-warnings']);
}

test();
