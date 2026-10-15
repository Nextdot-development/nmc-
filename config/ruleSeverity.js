// Fixed severity per rule, so the same findings always give the same score.
// The model's own severity is ignored for rules listed here.

const CRITICAL = [
  // patient identity, before/after, celebrity patients
  'NMC-ADV-6.1', 'NMC-ADV-6.4', 'NMC-ADV-8.1-v', 'IMC-7.14', 'IMC-7.17', 'TPG-3.7.1.4-B',
  // doctor endorsing products
  'NMC-ADV-8.1-iv', 'IMC-6.1.1-C', 'IMC-6.8.1-H',
  // commissions, touts, kickbacks
  'NMC-ADV-8.1-vii', 'IMC-6.4', 'IMC-7.19',
  // sex determination
  'IMC-7.6', 'PCPNDT-ADV', 'PCPNDT-S5-6',
  // prohibited / unapproved therapies, magic remedies
  'STEMCELL-ICMR-2', 'STEMCELL-ICMR-3', 'STEMCELL-ICMR-5', 'STEMCELL-ASD-1', 'STEMCELL-ASD-3',
  'IMC-1.9', 'IMC-6.5', 'IMC-6.7', 'TPG-3.7.4-C',
];

const HIGH = [
  'NMC-ADV-3.2', 'NMC-ADV-3.2-EXP-V', 'NMC-ADV-5.1', 'NMC-ADV-5.2', 'NMC-ADV-7.2a', 'NMC-ADV-7.2b', 'NMC-ADV-7.5',
  'NMC-ADV-8.1-i', 'NMC-ADV-8.1-ii', 'NMC-ADV-8.1-iii', 'NMC-ADV-8.1-vi', 'NMC-ADV-8.1-ix', 'NMC-ADV-8.1-x',
  'NMC-ADV-8.1-xi', 'NMC-ADV-8.1-xii', 'NMC-ADV-8.3', 'NMC-ADV-9.2', 'NMC-ADV-9.4',
  'IMC-1.1.3', 'IMC-1.2.1', 'IMC-1.4.2', 'IMC-1.8', 'IMC-2.3', 'IMC-6.1.1-A', 'IMC-6.1.1-B', 'IMC-6.1.1-D',
  'IMC-6.3', 'IMC-6.8.1-A', 'IMC-7.7', 'IMC-7.8', 'IMC-7.11', 'IMC-7.12', 'IMC-7.20',
  'UNQADV-2', 'UNQADV-5', 'UNQADV-6', 'AESHT-1', 'AESHT-3', 'LIVESURG-SP-PROMO', 'LIVESURG-F-EDU',
  'ECIG-2023-1', 'RMPLR-2023-7', 'RMPLR-2023-8', 'RMPLR-2023-10', 'EBOOK-2023-C3', 'MCI-SINGHANIA-2020',
  'TRG-2024-1Bvi', 'TPG-1.2', 'TPG-1.3', 'TPG-3.1', 'TPG-3.5', 'TPG-3.7.1.4-A', 'TPG-5.4',
];

const LOW = ['NMC-ADV-8.2', 'NMC-ADV-10.1'];

const MAP = new Map([
  ...CRITICAL.map((id) => [id, 'Critical']),
  ...HIGH.map((id) => [id, 'High']),
  ...LOW.map((id) => [id, 'Low']),
]);

// Wording that always makes a finding Critical, whatever rule it is cited under:
// guaranteed or permanent cures and outcomes
const CRITICAL_CUES = [
  /\bguarantee[ds]?\b/i, /\b100\s*%/, /\bcure[sd]?\b/i, /\bpermanent(ly)?\b/i, /\bmiracle\b/i,
  /गारंटी/, /पक्का/, /जड़\s*से/, /हमेशा\s*के\s*लिए/, /खात्री/,
  /\bpakka\b/i, /\bjad\s*se\b/i, /\bguaranteed\b/i,
];

// Every rule not listed is Medium (disclosure and procedural gaps)
export const severityFor = (ruleId, line = '') => {
  if (CRITICAL_CUES.some((re) => re.test(line))) return 'Critical';
  return MAP.get(ruleId) || 'Medium';
};
