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
