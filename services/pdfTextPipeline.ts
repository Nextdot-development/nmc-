import pdfParse from 'pdf-parse';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Below this, the text layer is treated as missing and the PDF is OCR'd (short ad flyers are often ~200 chars)
const MIN_TEXT_LENGTH = 120;
const MAX_PAGES = 25;
const OCR_SCALE = 2;

const cleanText = (text: string) => {
  return (text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
};

const logPdf = (event: string, details: Record<string, unknown> = {}) => {
  console.log('[PDF Pipeline]', JSON.stringify({ event, ...details }));
};

const renderPageToPng = async (page: any) => {
  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toBuffer('image/png');
};

const ocrPdfWithTesseract = async (pdfBuffer: Buffer, language: string) => {
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;
  const pagesToProcess = Math.min(totalPages, MAX_PAGES);

  logPdf('ocr_start', { totalPages, pagesToProcess, language });

  const worker = await createWorker();

  try {
    await worker.loadLanguage(language);
    await worker.initialize(language);

    const textChunks: string[] = [];
    for (let pageIndex = 1; pageIndex <= pagesToProcess; pageIndex += 1) {
      const page = await doc.getPage(pageIndex);
      const imageBuffer = await renderPageToPng(page);
      const result = await worker.recognize(imageBuffer);
      const pageText = result?.data?.text || '';
      if (pageText.trim()) {
        textChunks.push(pageText);
      }
      logPdf('ocr_page_done', { page: pageIndex, length: pageText.length });
    }

    if (pagesToProcess < totalPages) {
      logPdf('ocr_page_limit', { totalPages, pagesToProcess });
    }

    return textChunks.join('\n');
  } finally {
    await worker.terminate();
  }
};

// pdf.js text layer; handles modern PDFs (xref streams) that pdf-parse 1.x rejects
const extractWithPdfjs = async (pdfBuffer: Buffer) => {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const pages = Math.min(doc.numPages, MAX_PAGES);
  const chunks: string[] = [];
  for (let i = 1; i <= pages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item: any) => item.str || '').join(' '));
  }
  return chunks.join('\n');
};

export const extractTextFromPdfPipeline = async (pdfBuffer: Buffer) => {
  logPdf('parse_start', { size: pdfBuffer.length });

  let rawText = '';
  try {
    const parsed = await pdfParse(pdfBuffer);
    rawText = parsed?.text || '';
  } catch (error: any) {
    logPdf('parse_failed', { error: error?.message });
    rawText = await extractWithPdfjs(pdfBuffer).catch((err: any) => {
      logPdf('pdfjs_failed', { error: err?.message });
      return '';
    });
  }
  const parsedText = cleanText(rawText);

  logPdf('parse_done', { length: parsedText.length });

  if (parsedText.length >= MIN_TEXT_LENGTH) {
    return parsedText;
  }

  logPdf('ocr_fallback', { reason: 'text_too_short', length: parsedText.length });

  const ocrLanguage = process.env.OCR_LANGUAGES || 'eng+hin';
  const ocrText = cleanText(await ocrPdfWithTesseract(pdfBuffer, ocrLanguage));

  logPdf('ocr_done', { length: ocrText.length });

  return ocrText;
};

export default {
  extractTextFromPdfPipeline
};
