// Decorative SVG artwork for the neon dashboard. All purely visual (aria-hidden).

export const SidebarWaves = () => (
  <svg className="waves" viewBox="0 0 248 360" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="wv1" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#c8f54a" stopOpacity="0" />
        <stop offset="0.5" stopColor="#c8f54a" stopOpacity="0.9" />
        <stop offset="1" stopColor="#7ef0b0" stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="wv2" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#8b6cff" stopOpacity="0" />
        <stop offset="1" stopColor="#c8f54a" stopOpacity="0.6" />
      </linearGradient>
      <filter id="wvGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
    </defs>
    <path d="M-10 330 C 60 260, 90 150, 260 80" fill="none" stroke="url(#wv1)" strokeWidth="26" filter="url(#wvGlow)" opacity="0.55" />
    <path d="M-10 330 C 60 260, 90 150, 260 80" fill="none" stroke="url(#wv1)" strokeWidth="2.5" />
    <path d="M-10 350 C 70 290, 120 190, 260 140" fill="none" stroke="url(#wv2)" strokeWidth="1.5" />
    <path d="M10 360 C 90 310, 150 230, 260 205" fill="none" stroke="url(#wv2)" strokeWidth="1" opacity="0.7" />
    <path d="M-10 300 C 40 230, 70 120, 200 40" fill="none" stroke="#c8f54a" strokeOpacity="0.18" strokeWidth="1" />
    <circle cx="64" cy="118" r="2" fill="#c8f54a" />
    <circle cx="190" cy="66" r="1.6" fill="#c8f54a" opacity="0.7" />
  </svg>
);

// Isometric stack of three glowing layers
export const StackGraphic = () => (
  <svg className="stack" viewBox="0 0 120 84" aria-hidden="true">
    <defs>
      <linearGradient id="stTop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e7ff8a" />
        <stop offset="1" stopColor="#7ee36b" />
      </linearGradient>
      <linearGradient id="stMid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7ef0b0" />
        <stop offset="1" stopColor="#2fb27a" />
      </linearGradient>
      <linearGradient id="stLow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b6a1ff" />
        <stop offset="1" stopColor="#5a3fd6" />
      </linearGradient>
      <filter id="stGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" /></filter>
    </defs>
    <ellipse cx="54" cy="66" rx="44" ry="10" fill="#c8f54a" opacity="0.25" filter="url(#stGlow)" />
    <path d="M10 54 L54 36 L98 54 L54 72 Z" fill="url(#stLow)" />
    <path d="M10 54 L54 72 L54 76 L10 58 Z" fill="#3a2a8f" />
    <path d="M98 54 L54 72 L54 76 L98 58 Z" fill="#2a1f6b" />
    <path d="M14 42 L54 26 L94 42 L54 58 Z" fill="url(#stMid)" opacity="0.95" />
    <path d="M14 42 L54 58 L54 62 L14 46 Z" fill="#1f7a55" />
    <path d="M94 42 L54 58 L54 62 L94 46 Z" fill="#17603f" />
    <path d="M18 30 L54 15 L90 30 L54 45 Z" fill="url(#stTop)" />
    <path d="M18 30 L54 45 L54 49 L18 34 Z" fill="#8fbf2f" />
    <path d="M90 30 L54 45 L54 49 L90 34 Z" fill="#6f9a22" />
    <path d="M30 30 L54 20 L78 30" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" />
  </svg>
);

// Shield with a medical cross inside neon orbits
export const ShieldOrbit = () => (
  <svg className="shield-orbit" viewBox="0 0 520 300" aria-hidden="true">
    <defs>
      <radialGradient id="soBg" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#7c4dff" stopOpacity="0.45" />
        <stop offset="0.6" stopColor="#3b1d8f" stopOpacity="0.15" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="soRingA" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d8ff4a" />
        <stop offset="0.5" stopColor="#7cf0a8" />
        <stop offset="1" stopColor="#8b6cff" />
      </linearGradient>
      <linearGradient id="soRingB" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b388ff" />
        <stop offset="1" stopColor="#c8f54a" />
      </linearGradient>
      <linearGradient id="soShield" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a2a8f" />
        <stop offset="1" stopColor="#150f3a" />
      </linearGradient>
      <linearGradient id="soEdge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d8ff4a" />
        <stop offset="1" stopColor="#8b6cff" />
      </linearGradient>
      <filter id="soGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
      <filter id="soSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
    <circle cx="300" cy="140" r="150" fill="url(#soBg)" />
    <g transform="rotate(-18 300 140)">
      <ellipse cx="300" cy="140" rx="170" ry="62" fill="none" stroke="url(#soRingB)" strokeWidth="1.2" strokeOpacity="0.55" />
      <ellipse cx="300" cy="140" rx="130" ry="96" fill="none" stroke="url(#soRingA)" strokeWidth="16" opacity="0.35" filter="url(#soGlow)" />
      <ellipse cx="300" cy="140" rx="130" ry="96" fill="none" stroke="url(#soRingA)" strokeWidth="5" strokeDasharray="420 260" strokeLinecap="round" />
    </g>
    <g transform="rotate(32 300 140)">
      <ellipse cx="300" cy="140" rx="120" ry="48" fill="none" stroke="#b388ff" strokeWidth="10" opacity="0.3" filter="url(#soGlow)" />
      <ellipse cx="300" cy="140" rx="120" ry="48" fill="none" stroke="url(#soRingB)" strokeWidth="3" strokeDasharray="260 200" strokeLinecap="round" />
    </g>
    <path d="M300 62 L360 86 V140 C360 184 334 212 300 228 C266 212 240 184 240 140 V86 Z" fill="#8b6cff" opacity="0.35" filter="url(#soGlow)" />
    <path d="M300 62 L360 86 V140 C360 184 334 212 300 228 C266 212 240 184 240 140 V86 Z" fill="url(#soShield)" stroke="url(#soEdge)" strokeWidth="4" />
    <path d="M300 78 L346 96 V140 C346 175 326 198 300 211 C274 198 254 175 254 140 V96 Z" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" />
    <path d="M290 112 H310 V132 H330 V152 H310 V172 H290 V152 H270 V132 H290 Z" fill="#ffffff" opacity="0.6" filter="url(#soSoft)" />
    <path d="M290 112 H310 V132 H330 V152 H310 V172 H290 V152 H270 V132 H290 Z" fill="#ffffff" />
    <g transform="rotate(-18 300 140)">
      <path d="M170 140 A130 96 0 0 0 430 140" fill="none" stroke="url(#soRingA)" strokeWidth="5" strokeLinecap="round" />
    </g>
    <circle cx="452" cy="58" r="3" fill="#c8f54a" />
    <circle cx="150" cy="226" r="4" fill="#c8f54a" />
    <circle cx="412" cy="236" r="2.5" fill="#b388ff" />
    <circle cx="190" cy="40" r="2" fill="#ffffff" opacity="0.7" />
  </svg>
);
