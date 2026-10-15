// Report headings in the audited content's language. The AI writes the report body
// in that language; these cover the fixed labels around it.
const EN = {
  auditResult: 'AUDIT RESULT',
  language: 'Language',
  thisLine: '✕ This line',
  replaceWith: '✓ Replace with',
  fix: '✓ Fix',
  removeLine: 'Remove this line.',
  whyFails: 'Why it fails',
  howToFix: 'How to fix',
  penalty: 'PENALTY RISK',
  ethical: 'ETHICAL MARKETING',
  issuesFound: (n) => `${n} issue${n > 1 ? 's' : ''} found`,
  noViolations: 'No violations found',
  sorted: 'Sorted by severity. Each issue cites the NMC / IMC clause it breaks.',
  compliantVersion: 'COMPLIANT VERSION — READY TO USE',
  copy: 'Copy',
  copyFull: 'Copy full text',
  english: 'English',
};

const HI = {
  auditResult: 'ऑडिट परिणाम',
  language: 'भाषा',
  thisLine: '✕ यह पंक्ति',
  replaceWith: '✓ इसकी जगह लिखें',
  fix: '✓ सुधार',
  removeLine: 'यह पंक्ति हटा दें।',
  whyFails: 'क्यों गलत है',
  howToFix: 'कैसे ठीक करें',
  penalty: 'जुर्माने का जोखिम',
  ethical: 'नैतिक मार्केटिंग',
  issuesFound: (n) => `${n} समस्याएँ मिलीं`,
  noViolations: 'कोई उल्लंघन नहीं मिला',
  sorted: 'गंभीरता के क्रम में। हर समस्या के साथ NMC / IMC नियम दिया गया है।',
  compliantVersion: 'सही संस्करण — उपयोग के लिए तैयार',
  copy: 'कॉपी',
  copyFull: 'पूरा टेक्स्ट कॉपी करें',
  english: 'English',
};

const HINGLISH = {
  auditResult: 'AUDIT RESULT',
  language: 'Bhasha',
  thisLine: '✕ Ye line',
  replaceWith: '✓ Iski jagah likhein',
  fix: '✓ Sudhar',
  removeLine: 'Ye line hata dein.',
  whyFails: 'Kyun galat hai',
  howToFix: 'Kaise theek karein',
  penalty: 'PENALTY KA RISK',
  ethical: 'ETHICAL MARKETING',
  issuesFound: (n) => `${n} galtiyan mili`,
  noViolations: 'Koi galti nahi mili',
  sorted: 'Gambhirta ke hisaab se. Har galti ke saath NMC / IMC ka niyam diya gaya hai.',
  compliantVersion: 'SAHI VERSION — USE KE LIYE TAIYAR',
  copy: 'Copy',
  copyFull: 'Poora text copy karein',
  english: 'English',
};

export const labelsFor = (language = '') => {
  const lang = String(language).toLowerCase();
  if (lang.includes('hinglish')) return HINGLISH;
  if (lang.includes('hindi') || lang.includes('हिन्दी') || lang.includes('हिंदी')) return HI;
  return EN;
};
