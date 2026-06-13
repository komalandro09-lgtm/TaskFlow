import React from 'react';

interface TaskFlowLogoProps {
  variant?: 'icon' | 'full' | 'full-tagline';
  iconSize?: number;
  textSize?: number;
  className?: string;
  /** Force icon color for theme adaptation. Auto-detected if not set. */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * TaskFlow Logo — Pure inline SVG, fully theme-aware.
 * The TF monogram uses a vivid purple gradient that pops on both
 * white (light mode) and dark navy (dark mode) backgrounds.
 */
const TaskFlowLogo: React.FC<TaskFlowLogoProps> = ({
  variant = 'full',
  iconSize = 36,
  textSize = 22,
  className = '',
}) => {
  // Unique IDs to avoid SVG gradient conflicts when logo renders multiple times
  const uid = React.useId().replace(/:/g, '');
  const gradA = `tfGradA_${uid}`;
  const gradB = `tfGradB_${uid}`;

  /**
   * TF Monogram — carefully proportioned:
   *   ┌──────────────────┐  ← Wide top bar  (T crossbar + F top)
   *   ██                 │
   *   ██                 │  ← T left stem
   *   ██   ┌─────────┐   │
   *   ██   │         │      ← F middle crossbar
   *   ██
   *   ██                     ← T stem continues to bottom
   *
   * Three overlapping rounded rectangles produce the combined letterform.
   */
  const TFMark = ({ size }: { size: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TaskFlow"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        {/* Main gradient: pink-purple → deep violet (diagonal) */}
        <linearGradient id={gradA} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#c084fc" /> {/* purple-400 */}
          <stop offset="45%"  stopColor="#9333ea" /> {/* purple-600 */}
          <stop offset="100%" stopColor="#5b21b6" /> {/* violet-800 */}
        </linearGradient>
        {/* Accent gradient for wordmark text */}
        <linearGradient id={gradB} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#a855f7" /> {/* purple-500 */}
          <stop offset="100%" stopColor="#7c3aed" /> {/* violet-600 */}
        </linearGradient>
      </defs>

      {/* Top horizontal bar — full width (T crossbar + F top bar) */}
      <rect x="5"  y="5"  width="70" height="18" rx="7" fill={`url(#${gradA})`} />

      {/* Left vertical stem — T body (full height) */}
      <rect x="5"  y="5"  width="20" height="70" rx="7" fill={`url(#${gradA})`} />

      {/* F middle crossbar */}
      <rect x="32" y="40" width="43" height="17" rx="7" fill={`url(#${gradA})`} />
    </svg>
  );

  /* ── Icon only ── */
  if (variant === 'icon') {
    return (
      <span className={`inline-flex items-center justify-center select-none ${className}`}>
        <TFMark size={iconSize} />
      </span>
    );
  }

  /* ── Full / Full-tagline ── */
  return (
    <span
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: Math.round(iconSize * 0.28) }}
    >
      <TFMark size={iconSize} />

      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        {/* Wordmark */}
        <span
          style={{
            fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
            fontSize: textSize,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            /* Gradient text — visible on both light and dark */
            background: `linear-gradient(110deg, #a855f7 0%, #8b5cf6 45%, #6d28d9 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          TaskFlow
        </span>

        {/* Tagline (only in full-tagline variant) */}
        {variant === 'full-tagline' && (
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: Math.max(7, Math.round(textSize * 0.4)),
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginTop: 4,
              lineHeight: 1,
              color: 'rgba(139, 92, 246, 0.6)',
            }}
          >
            Plan · Track · Deliver
          </span>
        )}
      </span>
    </span>
  );
};

export default TaskFlowLogo;
