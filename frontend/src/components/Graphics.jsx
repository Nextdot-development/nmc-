// Decorative SVG artwork. Purely visual (aria-hidden).
import { COUNTRY } from '../country.js';

const NAVY = '#1a3a8f';
const ORANGE = '#f26a1b';

// Brand mark: navy shield with a check and an orange accent dot
export const ShieldLogo = (p) => (
  <svg width="38" height="42" viewBox="0 0 40 44" aria-hidden="true" {...p}>
    <defs>
      <linearGradient id="slFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2c55c9" />
        <stop offset="1" stopColor={NAVY} />
      </linearGradient>
    </defs>
    <path d="M20 2l16 6v12c0 10-7 18-16 22C11 38 4 30 4 20V8l16-6z" fill="url(#slFill)" />
    <path d="M13 21.5l5 5 9-10" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="33" cy="7" r="4" fill={ORANGE} stroke="#fff" strokeWidth="1.5" />
  </svg>
);

// India Gate in soft line art
const IndiaGateLine = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 220 190" aria-hidden="true">
    <ellipse cx="110" cy="180" rx="100" ry="8" fill="#efe6da" />
    <g fill="#e9eefb">
      <circle cx="26" cy="152" r="16" /><circle cx="40" cy="142" r="13" /><circle cx="194" cy="152" r="16" /><circle cx="180" cy="142" r="13" />
    </g>
    <g fill="none" stroke={NAVY} strokeOpacity="0.55" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M92 18 Q110 4 128 18" />
      <rect x="80" y="18" width="60" height="11" />
      <rect x="70" y="29" width="80" height="12" />
      <rect x="62" y="41" width="96" height="9" />
      <path d="M66 50 V178 H86 V112 A24 24 0 0 1 134 112 V178 H154 V50" />
      <path d="M74 66 H146" />
      <path d="M76 74 V170 M144 74 V170" strokeOpacity="0.3" />
    </g>
    <path d="M86 178 V112 A24 24 0 0 1 134 112 V178 Z" fill={ORANGE} fillOpacity="0.08" />
  </svg>
);

const LANDMARKS = { indiaGate: IndiaGateLine };

export const Landmark = ({ className = '' }) => {
  const Art = LANDMARKS[COUNTRY.landmark];
  return Art ? <Art className={className} /> : null;
};

// Soft abstract shapes behind the landmark
const Blobs = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 300 160" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <radialGradient id="blA" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={ORANGE} stopOpacity="0.22" />
        <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="blB" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#2c55c9" stopOpacity="0.16" />
        <stop offset="1" stopColor="#2c55c9" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="200" cy="70" r="90" fill="url(#blA)" />
    <circle cx="90" cy="110" r="80" fill="url(#blB)" />
  </svg>
);

export const BannerArt = () => (
  <div className="banner-art" aria-hidden="true">
    <Blobs className="banner-art__blobs" />
    <Landmark className="banner-art__gate" />
  </div>
);

export const SidebarArt = () => (
  <div className="sidebar-art" aria-hidden="true">
    <Blobs className="sidebar-art__blobs" />
    <Landmark className="sidebar-art__gate" />
  </div>
);

// Empty-state illustration: report sheet with a magnifier
export const EmptyArt = () => (
  <svg className="empty-art" viewBox="0 0 160 120" aria-hidden="true">
    <ellipse cx="80" cy="110" rx="56" ry="6" fill="#efe6da" />
    <rect x="44" y="14" width="64" height="86" rx="8" fill="#ffffff" stroke="#d8dff2" strokeWidth="2" />
    <rect x="56" y="28" width="30" height="6" rx="3" fill={NAVY} opacity="0.85" />
    <rect x="56" y="44" width="40" height="5" rx="2.5" fill="#d8dff2" />
    <rect x="56" y="56" width="34" height="5" rx="2.5" fill="#d8dff2" />
    <rect x="56" y="68" width="38" height="5" rx="2.5" fill="#d8dff2" />
    <circle cx="104" cy="74" r="16" fill="#fff1e7" stroke={ORANGE} strokeWidth="3" />
    <path d="M115 86 L128 99" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" />
    <path d="M97 74 l5 5 9-10" fill="none" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
