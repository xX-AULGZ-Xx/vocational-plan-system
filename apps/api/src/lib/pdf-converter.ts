import { exec, execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { extractFontsFromDocx } from "./font-extractor";

/**
 * Converts a .docx file on disk to a .pdf file.
 * Uses PowerShell COM automation on Windows, and LibreOffice on Linux.
 * @param docxPath Absolute path to input .docx
 * @param pdfPath Absolute path to output .pdf
 * @returns Path of the generated PDF file
 */
export function convertDocxToPdf(docxPath: string, pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const isWindows = os.platform() === 'win32';
    let cmd = '';

    if (isWindows) {
      let psScript = path.join(__dirname, "docx2pdf.ps1");
      if (!fs.existsSync(psScript)) {
        // Fallback for compiled dist directory
        psScript = path.join(process.cwd(), "src", "lib", "docx2pdf.ps1");
      }
      cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScript}" -docxPath "${docxPath}" -pdfPath "${pdfPath}"`;
    } else {
      // Linux / macOS fallback using LibreOffice
      // Extract embedded fonts so LibreOffice can render them correctly
      const userFontsDir = path.join(os.homedir(), '.fonts');
      try {
        const extracted = extractFontsFromDocx(docxPath, userFontsDir);
        if (extracted.length > 0) {
          // Rebuild font cache if fonts were extracted
          try {
            execSync('fc-cache -f ' + userFontsDir);
          } catch (e) {
            console.warn("Failed to rebuild font cache:", e);
          }
        }
      } catch (err) {
        console.warn("Failed to extract embedded fonts:", err);
      }

      const outDir = path.dirname(pdfPath);
      // Command uses soffice (or libreoffice)
      cmd = `libreoffice --headless --convert-to pdf:writer_pdf_Export "${docxPath}" --outdir "${outDir}"`;
    }
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("PDF conversion execution error:", stderr || error.message);
        return reject(new Error("การแปลงเป็น PDF ล้มเหลว: " + (stderr || error.message)));
      }
      
      // LibreOffice outputs to outdir with the same basename, we might need to rename it if pdfPath expects a specific name,
      // but usually the basename is the same. Let's ensure the file exists.
      // If docx is "file.docx", libreoffice makes "file.pdf" in outDir.
      const expectedPdfName = path.basename(docxPath, path.extname(docxPath)) + '.pdf';
      const actualPdfPath = path.join(path.dirname(pdfPath), expectedPdfName);

      // If the target pdfPath is different from what libreoffice generated, we rename it.
      if (actualPdfPath !== pdfPath && fs.existsSync(actualPdfPath)) {
          fs.renameSync(actualPdfPath, pdfPath);
      }

      if (fs.existsSync(pdfPath)) {
        resolve(pdfPath);
      } else {
        reject(new Error("เซิร์ฟเวอร์ไม่สามารถสร้างไฟล์ PDF ได้สำเร็จ"));
      }
    });
  });
}
