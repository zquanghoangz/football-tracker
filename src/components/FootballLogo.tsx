export function FootballLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Football">
      <circle cx="50" cy="50" r="48" fill="white" stroke="black" strokeWidth="3" />
      <polygon points="50,28 63,38 58,54 42,54 37,38" fill="black" />
      <path
        d="M50 28 L50 8 M63 38 L80 26 M58 54 L67 72 M42 54 L33 72 M37 38 L20 26"
        stroke="black"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M50 8 A48 48 0 0 1 80 26 M80 26 A48 48 0 0 1 67 72 M67 72 A48 48 0 0 1 33 72 M33 72 A48 48 0 0 1 20 26 M20 26 A48 48 0 0 1 50 8"
        stroke="black"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}
