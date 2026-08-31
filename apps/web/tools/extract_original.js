const fs = require('fs');
const readline = require('readline');

const logPath = 'C:/Users/Administrator/.gemini/antigravity/brain/941367df-5052-4f8f-a725-4084f0f7dd6a/.system_generated/logs/transcript_full.jsonl';
const fileStream = fs.createReadStream(logPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let latestContent = '';

rl.on('line', (line) => {
    try {
        const entry = JSON.parse(line);
        if (entry.tool_calls) {
            for (const call of entry.tool_calls) {
                if (call.name === 'write_to_file' || call.name === 'default_api:write_to_file') {
                    const args = call.arguments;
                    if (args.TargetFile && args.TargetFile.includes('admin/templates/page.tsx')) {
                        latestContent = args.CodeContent;
                    }
                }
            }
        }
    } catch(e) {}
});

rl.on('close', () => {
    if (latestContent) {
        fs.writeFileSync('src/app/admin/templates/page.tsx', latestContent);
        console.log('Restored from parent transcript tool calls!', latestContent.length);
    } else {
        console.log('Not found in parent transcript tool calls.');
    }
});
