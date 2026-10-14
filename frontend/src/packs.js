// Display order and labels for the rule files served by /api/rules/pack
export const PACKS = [
  { id: 'nmc_ethical_advertising_2026', short: 'Ethical Advertising 2026', label: 'NMC Guidelines on Ethical Advertising & Public Communication, 2026', issuer: 'National Medical Commission · 06 Oct 2026' },
  { id: 'imc_professional_conduct_2002', short: 'IMC Code of Ethics 2002', label: 'IMC (Professional Conduct, Etiquette & Ethics) Regulations, 2002', issuer: 'Operative ethics code adopted by NMC' },
  { id: 'telemedicine_practice_guidelines_2020', short: 'Telemedicine 2020', label: 'Telemedicine Practice Guidelines, 2020', issuer: 'Appendix 5 to IMC Regulations 2002' },
  { id: 'nmc_clinical_practice_advisories', short: 'Clinical Advisories', label: 'NMC Clinical Practice Advisories', issuer: 'Live surgery, aesthetic procedures, stem cell, PCPNDT and more' },
  { id: 'nmc_registration_licensing', short: 'Registration & Licensing', label: 'Registration & Licensing', issuer: 'Registration Regulations 2023, temporary registration and NMC notices' },
];

export const packMeta = (id) => PACKS.find((p) => p.id === id) || { id, short: id, label: id, issuer: '' };
