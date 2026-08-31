const fs = require('fs');
const readline = require('readline');

const logPath = 'C:/Users/Administrator/.gemini/antigravity/brain/941367df-5052-4f8f-a725-4084f0f7dd6a/.system_generated/logs/transcript_full.jsonl';
const fileStream = fs.createReadStream(logPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let latestContent = '';

rl.on('line', (line) => {
    try {
        const entry = JSON.parse(line);
        if (entry.content && entry.content.includes("import React, { useState, useEffect, useRef } from 'react';") && entry.content.length > 50000) {
            latestContent = entry.content;
        }
    } catch(e) {}
});

rl.on('close', () => {
    if (latestContent) {
        fs.writeFileSync('src/app/my-projects/page.tsx', latestContent);
        console.log('Saved to src/app/my-projects/page.tsx', latestContent.length);
    } else {
        console.log('Not found');
    }
});
