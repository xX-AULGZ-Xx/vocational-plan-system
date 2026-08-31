import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

export function deobfuscateFont(buffer: Buffer, guidString: string): Buffer {
  const cleanGuid = guidString.replace(/[{}-]/g, '');
  if (cleanGuid.length !== 32) {
    return buffer;
  }

  // ECMA-376 Standard: The 16 key bytes are the GUID in reverse byte order
  const key = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    key[i] = parseInt(cleanGuid.substring((15 - i) * 2, (15 - i) * 2 + 2), 16);
  }

  const result = Buffer.from(buffer);
  const xorLen = Math.min(32, result.length);
  for (let i = 0; i < xorLen; i++) {
    result[i] ^= key[i % 16];
  }

  return result;
}

export function extractFontsFromDocx(filePath: string, outputDir: string): { fontName: string; fontFileName: string }[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);

  const fontTableXmlFile = zip.files['word/fontTable.xml'];
  const fontRelsFile = zip.files['word/_rels/fontTable.xml.rels'];

  if (!fontTableXmlFile) return [];

  const fontTableXml = fontTableXmlFile.asText();
  const fontRelsXml = fontRelsFile ? fontRelsFile.asText() : '';

  // Extract rels mapping: rId -> target file (e.g. fonts/font1.odttf)
  const relsMap: Record<string, string> = {};
  const relRegex = /Id="([^"]+)"[^>]*Target="([^"]+)"/g;
  let rMatch;
  while ((rMatch = relRegex.exec(fontRelsXml)) !== null) {
    relsMap[rMatch[1]] = rMatch[2].replace(/^fonts\//, '');
  }

  const extracted: { fontName: string; fontFileName: string }[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find fonts with w:embedRegular, w:embedBold
  const fontTagRegex = /<w:font w:name="([^"]+)">([\s\S]*?)<\/w:font>/g;
  let fMatch;
  while ((fMatch = fontTagRegex.exec(fontTableXml)) !== null) {
    const fontName = fMatch[1];
    const fontBody = fMatch[2];

    const embedRegex = /<w:embed(Regular|Bold|Italic|BoldItalic)[^>]*r:id="([^"]+)"[^>]*w:fontKey="([^"]+)"/g;
    let eMatch;
    while ((eMatch = embedRegex.exec(fontBody)) !== null) {
      const type = eMatch[1];
      const rId = eMatch[2];
      const fontKey = eMatch[3];

      const targetFileName = relsMap[rId];
      const zipFontPath = targetFileName ? `word/fonts/${targetFileName}` : null;

      if (zipFontPath && zip.files[zipFontPath]) {
        const rawFont = zip.files[zipFontPath].asNodeBuffer();
        const cleanTtf = deobfuscateFont(rawFont, fontKey);

        const safeFontName = fontName.replace(/[^a-zA-Z0-9\u0E00-\u0E7F_-]/g, '_');
        const outFileName = `${safeFontName}-${type}.ttf`;
        const outPath = path.join(outputDir, outFileName);

        fs.writeFileSync(outPath, cleanTtf);

        // Also save ASCII safe copy (e.g. TH_SarabunIT9-Regular.ttf)
        const asciiSafeName = `${safeFontName.replace(/[\u0E00-\u0E7F]/g, '9')}-${type}.ttf`;
        fs.writeFileSync(path.join(outputDir, asciiSafeName), cleanTtf);

        extracted.push({
          fontName,
          fontFileName: outFileName,
        });
      }
    }
  }

  return extracted;
}
