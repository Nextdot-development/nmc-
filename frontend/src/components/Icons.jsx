const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const icon = (paths) => (props) => <svg {...base} {...props}>{paths}</svg>;

export const HomeIcon = icon(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h5v-6h4v6h5V10" /></>);
export const LayersIcon = icon(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17.5l9 5 9-5" opacity="0.6" /></>);
export const DatabaseIcon = icon(<><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>);
export const ClockIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const CogIcon = icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>);
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const BellIcon = icon(<><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>);
export const ChevronDownIcon = icon(<path d="M6 9l6 6 6-6" />);
export const ChevronLeftIcon = icon(<path d="M15 6l-6 6 6 6" />);
export const ChevronRightIcon = icon(<path d="M9 6l6 6-6 6" />);
export const MenuIcon = icon(<path d="M4 6h16M4 12h16M4 18h16" />);
export const TextIcon = icon(<><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>);
export const LinkIcon = icon(<><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" /></>);
export const ImageIcon = icon(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>);
export const VideoIcon = icon(<><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M16 10l6-3v10l-6-3" /></>);
export const MicIcon = icon(<><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" /></>);
export const DocIcon = icon(<><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>);
export const GlobeIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></>);
export const SparkIcon = (p) => (
  <svg {...base} fill="currentColor" stroke="none" {...p}><path d="M12 2c.6 4.8 2.7 7.4 8 8-5.3.6-7.4 3.2-8 8-.6-4.8-2.7-7.4-8-8 5.3-.6 7.4-3.2 8-8z" /><path d="M19 15c.3 2 1 3 3 3.3-2 .3-2.7 1.3-3 3.3-.3-2-1-3-3-3.3 2-.3 2.7-1.3 3-3.3z" opacity="0.8" /></svg>
);
export const ClipboardIcon = icon(<><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9z" /></>);
export const BulbIcon = icon(<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></>);
export const ArrowRightIcon = icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const ArrowUpRightIcon = icon(<path d="M7 17L17 7M8 7h9v9" />);
export const ShieldCheckIcon = icon(<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>);
export const BoltIcon = icon(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />);
export const ChartIcon = icon(<path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />);
export const MapPinIcon = icon(<><path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>);
export const TargetIcon = icon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>);
export const CalendarIcon = icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>);
export const LogoutIcon = icon(<><path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4" /><path d="M10 17l-5-5 5-5M5 12h11" /></>);
export const PrintIcon = icon(<><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>);
export const ExternalIcon = icon(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" /></>);
export const CheckCircleIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>);
export const AlertIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>);
export const XCircleIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>);
export const UploadIcon = icon(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></>);
export const UserIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>);

// Four-point star logo mark
export const LogoMark = (p) => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" {...p}>
    <defs>
      <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#c9cdd6" />
      </linearGradient>
    </defs>
    <path d="M20 2c1.4 10.2 5.8 14.6 16 16-10.2 1.4-14.6 5.8-16 16-1.4-10.2-5.8-14.6-16-16C14.2 16.6 18.6 12.2 20 2z" fill="url(#lm)" />
  </svg>
);
