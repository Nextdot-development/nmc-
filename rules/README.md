# Rule packs

The backend loads rules from `rules/<country>/common/*.json` + `rules/<country>/<category>/*.json`
(`services/rulesService.js`). Override the location with `RULES_ROOT`; cap rules sent to Gemini with
`MAX_PROMPT_RULES` (default 200).

Each rule: `{ id, regulation, section, title, description, source }`.

## India — NMC rule pack (built 14 Oct 2026)

Built from a full review of all 1014 notices at https://nmc.org.in/whats-new
(see `india/nmc_whats_new_index.csv` for the verdict on every notice) plus the operative ethics code.

| File (`india/common/`) | Rules | Source |
|---|---|---|
| `nmc_ethical_advertising_2026.json` | 31 | NMC Guidelines on Ethical Advertising & Public Communication, 06 Oct 2026 |
| `imc_professional_conduct_2002.json` | 33 | IMC (Professional Conduct, Etiquette & Ethics) Regulations 2002 — operative code |
| `telemedicine_practice_guidelines_2020.json` | 25 | Telemedicine Practice Guidelines 2020 (Appendix 5, IMC 2002) + 2020 medicine-list change |
| `nmc_clinical_practice_advisories.json` | 54 | Live surgery 2025, aesthetic/hair transplant 2022, unqualified practitioners 2022, stem cell (SC order 2026, ICMR), PCPNDT, e-cigarettes, lab report signing, remote e-signature 2026, generic prescribing, sexual boundaries |
| `nmc_registration_licensing.json` | 17 | Registration & Licence Regulations 2023, temporary registration 2024, EMRB case book, unpermitted courses |

`india/_reference/` holds notice-specific lists (de-registered doctors, forged registration numbers,
abeyance notice, student/teacher guidelines). They are kept for reference and are **not** sent to Gemini.

Notes:
- NMC RMP (Professional Conduct) Regulations 2023 are held in abeyance (notification 23 Aug 2023); not used.
- Drafts open for comments (38 notices) are not turned into rules.
- Index verdicts: 946 not-applicable (admissions, exams, seats, faculty, admin), 38 draft, 23 rule, 5 unreadable, 1 already covered, 1 superseded.

## AI providers

| Task | Provider |
|---|---|
| Compliance audit + claim extraction | Claude (`services/claudeService.js`), falls back to Gemini on any error (`services/aiProvider.js`) |
| Audio/video transcription, URL summary | OpenAI (unchanged) |
| Image OCR | Google Vision (unchanged) |
| Audio summary (TTS) | Gemini (unchanged) |

Env vars: `ANTHROPIC_API_KEY` (unset = Gemini only), `AUDIT_CLAUDE_MODEL` (default `claude-opus-5-5`),
`AUDIT_CLAUDE_EFFORT` (default `high`), `AUDIT_CLAUDE_TIMEOUT_MS` (default 120000), plus the existing
`VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `OPENAI_API_KEY`, `MONGODB_URI`, `JWT_SECRET`.
