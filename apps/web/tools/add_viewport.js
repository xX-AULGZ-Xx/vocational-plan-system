const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

if (!code.includes('export const viewport')) {
    code = code.replace(
        `export const metadata: Metadata = {`,
        `export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {`
    );
    fs.writeFileSync('src/app/layout.tsx', code);
    console.log('Added viewport to layout.tsx');
} else {
    console.log('Viewport already exists');
}
