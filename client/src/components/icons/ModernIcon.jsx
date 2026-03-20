const iconRegistry = {
  dashboard: () => (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-8" />
      <path d="M12 20V6" />
      <path d="M17 20v-4" />
    </>
  ),
  chartBar: () => (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6" />
      <path d="M12 20V9" />
      <path d="M17 20v-11" />
    </>
  ),
  fileText: () => (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6M9 9h2" />
    </>
  ),
  duplicate: () => (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  trash: () => (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  warning: () => (
    <>
      <path d="M10.3 3.9 2.9 17A2 2 0 0 0 4.7 20h14.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  checkCircle: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4L15.8 9.6" />
    </>
  ),
  xCircle: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  infoCircle: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </>
  ),
  search: () => (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  moreHorizontal: () => (
    <>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </>
  ),
  calendar: () => (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  refresh: () => (
    <>
      <path d="M20 11a8 8 0 0 0-14-4l-2 2" />
      <path d="M4 11V7h4" />
      <path d="M4 13a8 8 0 0 0 14 4l2-2" />
      <path d="M20 13v4h-4" />
    </>
  ),
  clipboardCheck: () => (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5h6M10 12l2 2 3-3M9 17h6" />
    </>
  ),
  chevronDown: () => <path d="m6 9 6 6 6-6" />,
  chevronRight: () => <path d="m9 6 6 6-6 6" />,
  eye: () => (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: () => (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.3A11.6 11.6 0 0 1 12 5c6.5 0 10 7 10 7a15.9 15.9 0 0 1-4.2 4.9" />
      <path d="M6.6 6.6A15.7 15.7 0 0 0 2 12s3.5 7 10 7c1 0 1.9-.2 2.8-.5" />
    </>
  ),
  hourglass: () => (
    <>
      <path d="M6 3h12M6 21h12" />
      <path d="M8 3c0 3.5 4 4.2 4 6s-4 2.5-4 6" />
      <path d="M16 3c0 3.5-4 4.2-4 6s4 2.5 4 6" />
    </>
  ),
  user: () => (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1.4-3.2 4.3-5 8-5s6.6 1.8 8 5" />
    </>
  ),
  logout: () => (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  rocket: () => (
    <>
      <path d="M6.5 17.5c-1.2.3-2.5.8-3.5 1.8 1-.2 2-.1 3.1.1.9.2 1.8-.1 2.4-.7l1.2-1.2" />
      <path d="M14 10 7 17l-2-2 7-7a9.2 9.2 0 0 1 8-2 9.2 9.2 0 0 1-2 8l-7 7-2-2 7-7" />
      <circle cx="16.5" cy="7.5" r="1.2" />
    </>
  ),
  package: () => (
    <>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
      <path d="M12 12v9" />
    </>
  ),
  flask: () => (
    <>
      <path d="M10 3v5l-5.5 9.5A2.2 2.2 0 0 0 6.4 21h11.2a2.2 2.2 0 0 0 1.9-3.5L14 8V3" />
      <path d="M8 14h8" />
    </>
  ),
  scale: () => (
    <>
      <path d="M12 4v16M6 8h12" />
      <path d="M6 8 3 13h6L6 8Z" />
      <path d="M18 8 15 13h6l-3-5Z" />
      <path d="M4 20h16" />
    </>
  ),
  mail: () => (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  trophy: () => (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M10 12v4M14 12v4M8 20h8" />
      <path d="M6 5H4a2 2 0 0 0 2 3M18 5h2a2 2 0 0 1-2 3" />
    </>
  ),
  pieChart: () => (
    <>
      <path d="M12 3v9h9A9 9 0 0 0 12 3Z" />
      <path d="M11 4a9 9 0 1 0 9 9" />
    </>
  ),
  bell: () => (
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  mapPin: () => (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  megaphone: () => (
    <>
      <path d="m4 12 11-5v10L4 12Z" />
      <path d="M15 9a5 5 0 0 1 0 6" />
      <path d="M6 13v4a2 2 0 0 0 2 2h1" />
    </>
  ),
  heartPulse: () => (
    <>
      <path d="M3 12h4l2-3 3 6 2-4h7" />
      <path d="M12 21s-7-4.5-9-9a5.5 5.5 0 0 1 9-6 5.5 5.5 0 0 1 9 6c-2 4.5-9 9-9 9Z" />
    </>
  ),
  conversionYield: () => (
    <>
      <path d="M3 20h18" />
      <path d="M4 16l5-5 4 3 7-8" />
    </>
  ),
  home: () => (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  leaf: () => (
    <>
      <path d="M20 4c-8 0-14 5.5-14 13 4.5 0 10-1.5 13-6" />
      <path d="M7 17c.5-3.5 3-6 6.5-7.5" />
    </>
  ),
};

function ModernIcon({ name, size = 20, className = '', strokeWidth = 1.8, ...props }) {
  const Glyph = iconRegistry[name] || iconRegistry.fileText;

  return (
    <svg
      className={`modern-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <Glyph />
    </svg>
  );
}

export default ModernIcon;
