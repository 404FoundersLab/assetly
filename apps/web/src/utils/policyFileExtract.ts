import mammoth from 'mammoth';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type PolicyUploadKind = 'text' | 'docx' | 'pdf';

export function detectPolicyUploadKind(file: File): PolicyUploadKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown') || file.type === 'text/plain' || file.type === 'text/markdown') {
    return 'text';
  }
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  // Legacy .doc is not supported by mammoth
  if (name.endsWith('.doc')) {
    return null;
  }
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return 'pdf';
  }
  return null;
}

async function extractTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that text file.'));
    reader.readAsText(file);
  });
}

async function extractDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
}

async function extractPdf(file: File): Promise<string> {
  // Dynamic import keeps pdf.js out of the critical app boot path.
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) pages.push(line);
  }

  return pages.join('\n\n');
}

/**
 * Extract plain text from HR policy uploads (.txt, .md, .docx, .pdf).
 * Scanned/image-only PDFs may return little or no text.
 */
export async function extractPolicyTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('File is too large. Please keep policy documents under 5 MB.');
  }

  const kind = detectPolicyUploadKind(file);
  if (!kind) {
    if (file.name.toLowerCase().endsWith('.doc')) {
      throw new Error('Legacy .doc is not supported. Please save as .docx, .pdf, .txt, or .md.');
    }
    throw new Error('Unsupported file type. Use .txt, .md, .docx, or .pdf.');
  }

  let text = '';
  if (kind === 'text') text = await extractTextFile(file);
  else if (kind === 'docx') text = await extractDocx(file);
  else text = await extractPdf(file);

  text = text.replace(/\u0000/g, '').trim();
  if (!text) {
    throw new Error(
      kind === 'pdf'
        ? 'No readable text found in this PDF. If it is a scanned image, convert it to text first or paste the content manually.'
        : 'The selected file appears to be empty.',
    );
  }
  return text;
}
