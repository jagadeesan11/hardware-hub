/**
 * Purely decorative background for the hero card — a faint blueprint grid
 * plus a couple of door/panel outlines, hinting at the catalogue without
 * competing with the headline. aria-hidden and non-interactive.
 *
 * The pattern is drawn at a visible opacity, then covered by a rect filled
 * with a white-to-transparent gradient so it fades in from the left (where
 * the text sits) toward the right — no CSS mask needed, works everywhere.
 */
export default function HeroPattern() {
  return (
    <svg
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
    >
      <defs>
        <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#fdba74" strokeWidth="1" />
        </pattern>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Blueprint grid, full bleed */}
      <rect width="800" height="400" fill="url(#hero-grid)" opacity="0.5" />

      {/* Door outline with panel lines, evoking the catalogue */}
      <g stroke="#fb923c" strokeWidth="2" fill="none" opacity="0.8">
        <rect x="560" y="70" width="150" height="280" rx="4" />
        <rect x="582" y="100" width="106" height="90" rx="2" />
        <rect x="582" y="210" width="106" height="110" rx="2" />
        <circle cx="670" cy="215" r="4" fill="#fb923c" stroke="none" />
      </g>

      {/* A couple of stacked panel planks, lower-right */}
      <g stroke="#fdba74" strokeWidth="2" opacity="0.7">
        <line x1="480" y1="360" x2="760" y2="360" />
        <line x1="500" y1="378" x2="760" y2="378" />
      </g>

      {/* Fade toward the text side */}
      <rect width="800" height="400" fill="url(#hero-fade)" />
    </svg>
  );
}
