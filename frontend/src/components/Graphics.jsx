// Decorative Indian-theme SVG artwork. All purely visual (aria-hidden).

const SAFFRON = '#ff8a1f';
const GREEN = '#138808';
const NAVY = '#1a3a8f';

// Ashoka Chakra: navy wheel with 24 spokes
export const Chakra = ({ size = 64, color = NAVY, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" {...p}>
    <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="5" />
    <circle cx="50" cy="50" r="7" fill={color} />
    {Array.from({ length: 24 }, (_, i) => (
      <line key={i} x1="50" y1="50" x2="50" y2="7" stroke={color} strokeWidth="2" transform={`rotate(${i * 15} 50 50)`} />
    ))}
  </svg>
);

// Tricolour shield logo
export const ShieldLogo = (p) => (
  <svg width="40" height="44" viewBox="0 0 40 44" aria-hidden="true" {...p}>
    <defs>
      <clipPath id="slClip"><path d="M20 2l16 6v12c0 10-7 18-16 22C11 38 4 30 4 20V8l16-6z" /></clipPath>
    </defs>
    <path d="M20 2l16 6v12c0 10-7 18-16 22C11 38 4 30 4 20V8l16-6z" fill={NAVY} />
    <g clipPath="url(#slClip)">
      <rect x="0" y="9" width="40" height="9" fill={SAFFRON} />
      <rect x="0" y="18" width="40" height="9" fill="#ffffff" />
      <rect x="0" y="27" width="40" height="17" fill={GREEN} />
    </g>
    <path d="M20 2l16 6v12c0 10-7 18-16 22C11 38 4 30 4 20V8l16-6z" fill="none" stroke={NAVY} strokeWidth="2.5" />
    <circle cx="20" cy="22.5" r="3.2" fill="none" stroke={NAVY} strokeWidth="1.2" />
  </svg>
);

// Flowing tricolour ribbon
export const TricolorWave = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id="twSoft"><feGaussianBlur stdDeviation="1.2" /></filter>
    </defs>
    <path d="M0 70 C 90 10, 180 110, 260 50 S 380 10, 400 30 L400 62 C 360 44, 330 90, 260 86 S 90 52, 0 104 Z" fill={SAFFRON} opacity="0.85" filter="url(#twSoft)" />
    <path d="M0 104 C 90 52, 180 130, 260 86 S 360 44, 400 62 L400 92 C 360 80, 320 122, 260 120 S 90 92, 0 136 Z" fill="#ffffff" opacity="0.95" />
    <path d="M0 136 C 90 92, 180 156, 260 120 S 360 80, 400 92 L400 124 C 360 116, 320 158, 260 156 S 90 128, 0 160 Z" fill={GREEN} opacity="0.85" filter="url(#twSoft)" />
  </svg>
);

// Stylised India Gate with trees
export const IndiaGate = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 220 190" aria-hidden="true">
    <defs>
      <linearGradient id="igStone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6b16a" />
        <stop offset="1" stopColor="#e08a3a" />
      </linearGradient>
      <linearGradient id="igShade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c86d22" />
        <stop offset="1" stopColor="#e9954a" />
      </linearGradient>
    </defs>
    <ellipse cx="110" cy="178" rx="104" ry="10" fill="#e9dcc8" />
    {/* trees */}
    <g fill="#3f9b3a">
      <circle cx="22" cy="150" r="16" /><circle cx="36" cy="140" r="14" /><circle cx="198" cy="150" r="16" /><circle cx="184" cy="140" r="14" />
    </g>
    <g fill="#2f7f2c">
      <circle cx="14" cy="160" r="12" /><circle cx="206" cy="160" r="12" />
    </g>
    <rect x="27" y="150" width="4" height="26" fill="#7a4a22" /><rect x="189" y="150" width="4" height="26" fill="#7a4a22" />
    {/* gate */}
    <rect x="62" y="40" width="96" height="10" rx="1" fill="url(#igShade)" />
    <rect x="70" y="28" width="80" height="13" fill="url(#igStone)" />
    <rect x="80" y="18" width="60" height="11" fill="url(#igShade)" />
    <path d="M92 18 Q110 4 128 18 Z" fill="url(#igStone)" />
    <rect x="66" y="50" width="88" height="126" fill="url(#igStone)" />
    <path d="M86 176 V112 A24 24 0 0 1 134 112 V176 Z" fill="#fff4e6" />
    <path d="M86 176 V112 A24 24 0 0 1 134 112 V176" fill="none" stroke="#c86d22" strokeWidth="3" />
    <rect x="66" y="58" width="88" height="5" fill="#c86d22" opacity="0.7" />
    <rect x="72" y="70" width="10" height="100" fill="#d9802f" opacity="0.6" />
    <rect x="138" y="70" width="10" height="100" fill="#d9802f" opacity="0.6" />
    <text x="110" y="78" textAnchor="middle" fontSize="7" fontWeight="700" fill="#a85a1a" letterSpacing="1">INDIA</text>
  </svg>
);

// Banner illustration: tricolour wave, chakra, India Gate, birds
export const BannerArt = () => (
  <div className="banner-art" aria-hidden="true">
    <TricolorWave className="banner-art__wave" />
    <Chakra size={58} className="banner-art__chakra" />
    <IndiaGate className="banner-art__gate" />
    <svg className="banner-art__birds" viewBox="0 0 80 30">
      <path d="M2 14 q6 -8 12 0 q6 -8 12 0" fill="none" stroke="#e08a3a" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 6 q4 -5 8 0 q4 -5 8 0" fill="none" stroke="#e08a3a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  </div>
);

// Sidebar illustration
export const SidebarArt = () => (
  <div className="sidebar-art" aria-hidden="true">
    <TricolorWave className="sidebar-art__wave" />
    <IndiaGate className="sidebar-art__gate" />
  </div>
);
