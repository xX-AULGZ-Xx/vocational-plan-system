import PizZip from 'pizzip';

export interface DocxTextRun {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  fontSizePt?: number;
  fontFamily?: string;
  color?: string;
}

export interface DocxImageItem {
  id: string;
  name?: string;
  widthPx: number;
  heightPx: number;
  widthCm: number;
  heightCm: number;
  src?: string;
  targetVar?: string;
}

export interface DocxTableCell {
  text: string;
  runs: DocxTextRun[];
  isBold?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify' | 'thaiDistribute';
  fontSizePt?: number;
  gridSpan?: number;
  widthPercent?: number;
  borders?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
  };
  bgColor?: string;
}

export interface DocxTableRow {
  cells: DocxTableCell[];
  isHeader?: boolean;
}

export interface DocxTable {
  rows: DocxTableRow[];
}

export interface DocxParagraph {
  text: string;
  runs: DocxTextRun[];
  align?: 'left' | 'center' | 'right' | 'justify' | 'thaiDistribute';
  firstLineIndentCm?: number;
  leftIndentCm?: number;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  lineSpacing?: number;
  hasBottomBorder?: boolean;
  images?: DocxImageItem[];
}

export interface DocxPage {
  pageNumber: number;
  elements: Array<{
    type: 'paragraph' | 'table' | 'image' | 'separator';
    paragraph?: DocxParagraph;
    table?: DocxTable;
    image?: DocxImageItem;
  }>;
}

export interface DocxScanResult {
  variables: string[];
  totalPages: number;
  pages: DocxPage[];
  extractedMedia: Record<string, string>;
}

function emuToPx(emu: number): number {
  return Math.round((emu / 914400) * 96);
}

function emuToCm(emu: number): number {
  return parseFloat((emu / 360000).toFixed(2));
}

export function scanDocxTemplate(buffer: Buffer | ArrayBuffer): DocxScanResult {
  const zip = new PizZip(buffer);
  
  const extractedMedia: Record<string, string> = {};
  try {
    const relsFile = zip.files['word/_rels/document.xml.rels'];
    if (relsFile) {
      const relsXml = relsFile.asText();
      const relMatches = relsXml.match(/<Relationship[^>]+Target="media\/([^"]+)"[^>]+Id="([^"]+)"|<Relationship[^>]+Id="([^"]+)"[^>]+Target="media\/([^"]+)"/g) || [];
      
      relMatches.forEach((relTag) => {
        const idMatch = relTag.match(/Id="([^"]+)"/);
        const targetMatch = relTag.match(/Target="media\/([^"]+)"/);
        if (idMatch && targetMatch) {
          const relId = idMatch[1];
          const mediaName = targetMatch[1];
          const mediaZipPath = 'word/media/' + mediaName;
          const mediaFile = zip.files[mediaZipPath];
          if (mediaFile) {
            const ext = mediaName.split('.').pop()?.toLowerCase() || 'jpeg';
            const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
            let b64 = '';
            if (typeof Buffer !== 'undefined' && mediaFile.asNodeBuffer) {
              b64 = mediaFile.asNodeBuffer().toString('base64');
            } else {
              b64 = btoa(
                new Uint8Array(mediaFile.asArrayBuffer()).reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  ''
                )
              );
            }
            extractedMedia[relId] = `data:${mime};base64,${b64}`;
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to parse docx relationships:', e);
  }

  const docFile = zip.files['word/document.xml'];
  if (!docFile) {
    throw new Error('Invalid DOCX: missing word/document.xml');
  }

  const rawXml = docFile.asText();
  const cleanXml = rawXml.replace(/<w:proofErr[^>]*\/>/g, '').replace(/<w:noProof[^>]*\/>/g, '');

  // Extract all variables from plain text representation
  const plainText = cleanXml.replace(/<[^>]+>/g, '');
  const varMatches = plainText.match(/\{+([^\{\}]+)\}+/g) || [];
  const varSet = new Set<string>();
  varMatches.forEach((v) => {
    const cleaned = v.replace(/[\{\}]/g, '').trim();
    if (cleaned && !cleaned.includes('http') && !cleaned.includes('schemas')) {
      varSet.add(cleaned);
    }
  });

  const rawPageChunks = cleanXml.split(/<w:br w:type="page"\/>|<w:lastRenderedPageBreak\/>|<w:sectPr/);
  const pages: DocxPage[] = [];

  rawPageChunks.forEach((chunkXml) => {
    const pageElements: DocxPage['elements'] = [];
    const blockMatches = chunkXml.match(/<w:tbl[\s\S]*?<\/w:tbl>|<w:p[\s\S]*?<\/w:p>/g) || [];

    blockMatches.forEach((blockXml) => {
      if (blockXml.startsWith('<w:tbl')) {
        const table: DocxTable = { rows: [] };
        const rowMatches = blockXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];

        rowMatches.forEach((trXml, rIdx) => {
          const cells: DocxTableCell[] = [];
          const cellMatches = trXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];

          cellMatches.forEach((tcXml) => {
            const runs: DocxTextRun[] = [];
            const rMatches = tcXml.match(/<w:r[\s\S]*?<\/w:r>/g) || [];

            rMatches.forEach((rXml) => {
              const textMatch = rXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
              const text = textMatch ? textMatch[1] : '';
              if (!text) return;

              const isBold = /<w:b\/>|<w:b w:val="true"\/>|<w:bCs\/>/.test(rXml);
              const isItalic = /<w:i\/>|<w:i w:val="true"\/>/.test(rXml);
              const szMatch = rXml.match(/<w:sz w:val="(\d+)"\/>/);
              const fontSizePt = szMatch ? parseInt(szMatch[1], 10) / 2 : 14;

              runs.push({ text, isBold, isItalic, fontSizePt });
            });

            const cellText = tcXml.replace(/<[^>]+>/g, '').trim();
            const gridSpanMatch = tcXml.match(/<w:gridSpan w:val="(\d+)"\/>/);
            const gridSpan = gridSpanMatch ? parseInt(gridSpanMatch[1], 10) : 1;
            const isCenter = /<w:jc w:val="center"\/>/.test(tcXml);
            const isRight = /<w:jc w:val="right"\/>/.test(tcXml);

            cells.push({
              text: cellText,
              runs,
              gridSpan,
              align: isCenter ? 'center' : isRight ? 'right' : 'left',
              borders: {
                top: true,
                bottom: true,
                left: true,
                right: true,
              },
            });
          });

          if (cells.length > 0) {
            table.rows.push({
              cells,
              isHeader: rIdx === 0,
            });
          }
        });

        if (table.rows.length > 0) {
          pageElements.push({
            type: 'table',
            table,
          });
        }
      } else if (blockXml.startsWith('<w:p')) {
        const isCenter = /<w:jc w:val="center"\/>/.test(blockXml);
        const isRight = /<w:jc w:val="right"\/>/.test(blockXml);
        const isThaiDistribute = /<w:jc w:val="thaiDistribute"\/>|<w:jc w:val="both"\/>/.test(blockXml);

        const firstLineMatch = blockXml.match(/<w:ind[^>]*w:firstLine="(\d+)"/);
        const firstLineEmu = firstLineMatch ? parseInt(firstLineMatch[1], 10) : 0;
        const firstLineIndentCm = firstLineEmu > 0 ? parseFloat((firstLineEmu / 567).toFixed(2)) : undefined;

        const images: DocxImageItem[] = [];
        const extentMatches = blockXml.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>[\s\S]*?<a:blip[^>]+r:embed="([^"]+)"|<a:blip[^>]+r:embed="([^"]+)"[\s\S]*?<wp:extent cx="(\d+)" cy="(\d+)"\/>/g) || [];

        extentMatches.forEach((drawXml) => {
          const cxMatch = drawXml.match(/cx="(\d+)"/);
          const cyMatch = drawXml.match(/cy="(\d+)"/);
          const embedMatch = drawXml.match(/r:embed="([^"]+)"/);

          if (cxMatch && cyMatch) {
            const cx = parseInt(cxMatch[1], 10);
            const cy = parseInt(cyMatch[1], 10);
            const relId = embedMatch ? embedMatch[1] : '';
            const src = extractedMedia[relId] || '';

            images.push({
              id: relId,
              widthPx: emuToPx(cx),
              heightPx: emuToPx(cy),
              widthCm: emuToCm(cx),
              heightCm: emuToCm(cy),
              src,
            });
          }
        });

        const runs: DocxTextRun[] = [];
        const rMatches = blockXml.match(/<w:r[\s\S]*?<\/w:r>/g) || [];

        rMatches.forEach((rXml) => {
          const textMatch = rXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
          const text = textMatch ? textMatch[1] : '';
          if (!text) return;

          const isBold = /<w:b\/>|<w:b w:val="true"\/>|<w:bCs\/>/.test(rXml);
          const isItalic = /<w:i\/>|<w:i w:val="true"\/>/.test(rXml);
          const szMatch = rXml.match(/<w:sz w:val="(\d+)"\/>/);
          const fontSizePt = szMatch ? parseInt(szMatch[1], 10) / 2 : 16;
          const fontMatch = rXml.match(/<w:rFonts[^>]*w:ascii="([^"]+)"/);
          const fontFamily = fontMatch ? fontMatch[1] : 'TH SarabunIT๙';

          runs.push({
            text,
            isBold,
            isItalic,
            fontSizePt,
            fontFamily,
          });
        });

        const fullText = blockXml.replace(/<[^>]+>/g, '').trim();

        if (fullText || images.length > 0) {
          pageElements.push({
            type: 'paragraph',
            paragraph: {
              text: fullText,
              runs,
              align: isCenter ? 'center' : isRight ? 'right' : isThaiDistribute ? 'thaiDistribute' : 'left',
              firstLineIndentCm,
              images: images.length > 0 ? images : undefined,
            },
          });
        }
      }
    });

    if (pageElements.length > 0) {
      pages.push({
        pageNumber: pages.length + 1,
        elements: pageElements,
      });
    }
  });

  return {
    variables: Array.from(varSet),
    totalPages: pages.length,
    pages,
    extractedMedia,
  };
}
