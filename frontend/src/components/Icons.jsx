const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const ShieldIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const BookIcon = (p) => (
  <svg {...base} {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" /><path d="M4 19a2 2 0 012-2h13" /></svg>
);
export const ClockIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const TextIcon = (p) => (
  <svg {...base} {...p}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
);
export const LinkIcon = (p) => (
  <svg {...base} {...p}><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" /></svg>
);
export const UploadIcon = (p) => (
  <svg {...base} {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const ExternalIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" /></svg>
);
export const LogoutIcon = (p) => (
  <svg {...base} width={18} height={18} {...p}><path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4" /><path d="M10 17l-5-5 5-5M5 12h11" /></svg>
);
export const PrintIcon = (p) => (
  <svg {...base} width={18} height={18} {...p}><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" /></svg>
);
export const ChevronIcon = (p) => (
  <svg {...base} width={18} height={18} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const FileIcon = (p) => (
  <svg {...base} {...p}><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5z" /><path d="M14 3v5h5" /></svg>
);
