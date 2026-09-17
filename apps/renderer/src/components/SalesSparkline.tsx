/**
 * Bar chart for the dashboard's sales trend. Deliberately not a charting
 * library — one small SVG drawn to the data's own max. Values are real
 * piastres from salesReport.trend(); never interpolated or invented.
 * Supports 7/14/30-point ranges (the period filter in Dashboard.tsx):
 * bar width and axis-label density both adapt to the point count so bars
 * never collide and labels never overlap, per this app's own "draw charts
 * to the scale" rule — every label shown still names a real point.
 *
 * Kept deliberately quiet to match the rest of the dashboard: one baseline
 * line, no gridlines, no drawn stub for zero-value bars (an early version
 * added both and it made a mostly-empty week look busier than a mostly-
 * empty week actually is — the loudest element on an otherwise plain page).
 *
 * Each bar's color is scaled to its own value relative to the period's max
 * — a quiet day fades toward a pale tint, the biggest day sits at full
 * primary saturation — one color family, not a multi-hue heatmap, so the
 * chart still reads as calm and single-purpose next to the rest of the
 * dashboard. Every bar also carries its own soft top-to-bottom gradient
 * (full tone at the top easing toward the baseline) for a bit of depth
 * without adding a second visual element to the chart.
 */

interface Point {
  label: string;
  value: number;
  /** Preformatted display amount, e.g. "1,250.00" — already run through the
      app's own money formatting, never reformatted here. */
  displayValue: string;
}

const WIDTH = 640;
const HEIGHT = 140;
const PAD_X = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const BAR_GAP_RATIO = 0.35;

/** Single-hue ramp bars are colored against, built from this app's own
    --primary-* scale — a quiet day reads as a pale tint, the biggest day
    lands on the dashboard's usual saturated primary blue. */
const COLOR_STOPS: [number, number, number][] = [
  [224, 235, 255], // primary-100 — quiet day
  [91, 141, 239], // primary-400 — typical day
  [29, 78, 216], // primary-600 — peak day
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Interpolates along COLOR_STOPS for t in [0, 1]. */
function rampColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const segments = COLOR_STOPS.length - 1;
  const pos = clamped * segments;
  const i = Math.min(Math.floor(pos), segments - 1);
  const localT = pos - i;
  const [r1, g1, b1] = COLOR_STOPS[i]!;
  const [r2, g2, b2] = COLOR_STOPS[i + 1]!;
  return `rgb(${lerp(r1, r2, localT)}, ${lerp(g1, g2, localT)}, ${lerp(b1, b2, localT)})`;
}

/** At most ~10 axis labels regardless of point count, evenly spaced and
    always including the first and last point. */
function labelStride(n: number): number {
  return Math.max(1, Math.ceil(n / 10));
}

export function SalesSparkline({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);

  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotW / points.length;
  const barW = slot * (1 - BAR_GAP_RATIO);

  const bars = points.map((p, i) => {
    const barH = max > 0 ? (p.value / max) * plotH : 0;
    const x = PAD_X + i * slot + (slot - barW) / 2;
    const y = PAD_TOP + plotH - barH;
    const cx = x + barW / 2;
    // Each bar's own share of the max drives its color, not just whether it
    // happens to be the single tallest — a 90%-of-max day should read as
    // nearly as significant as the peak, not lumped in with a 5%-of-max day.
    const ratio = p.value / max;
    const gradientId = `dash-chart-bar-${i}`;
    return { x, y, cx, barH, ratio, gradientId, ...p };
  });

  const stride = labelStride(bars.length);
  const peakIndex = values.indexOf(max);
  const lastIndex = bars.length - 1;
  // Label the peak bar (the number the chart exists to show), unless the
  // last bar already is the peak — then one label covers both roles.
  const labelIndices = new Set([peakIndex, lastIndex]);

  return (
    <svg
      className="dash-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="اتجاه المبيعات خلال آخر أيام"
    >
      <defs>
        {/* One gradient per bar: full value-scaled tone at the top, easing
            toward the same color at reduced opacity at the base — a plain
            "glass" fade rather than a two-tone blend, so it reads as one
            deliberate color per bar instead of a smear. */}
        {bars.map((b) => {
          const tone = rampColor(b.ratio);
          return (
            <linearGradient key={b.gradientId} id={b.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="1" />
              <stop offset="100%" stopColor={tone} stopOpacity="0.55" />
            </linearGradient>
          );
        })}
      </defs>

      <line
        x1={PAD_X}
        y1={HEIGHT - PAD_BOTTOM}
        x2={WIDTH - PAD_X}
        y2={HEIGHT - PAD_BOTTOM}
        stroke="var(--border-default)"
        strokeWidth="1"
      />

      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={Math.max(barW, 1)}
          height={Math.max(b.barH, 0)}
          rx={Math.min(3, barW / 3)}
          fill={`url(#${b.gradientId})`}
        />
      ))}

      {bars.map((b, i) =>
        labelIndices.has(i) && b.value > 0 ? (
          <text
            key={`v-${i}`}
            x={b.cx}
            y={Math.max(b.y - 6, PAD_TOP - 6)}
            textAnchor={b.cx > WIDTH - 40 ? 'end' : b.cx < 40 ? 'start' : 'middle'}
            fontSize="11"
            fill={rampColor(b.ratio)}
            fontWeight="700"
          >
            {b.displayValue}
          </text>
        ) : null
      )}

      {bars.map((b, i) =>
        i % stride === 0 || i === lastIndex ? (
          <text
            key={`l-${i}`}
            x={b.cx}
            y={HEIGHT - 8}
            textAnchor={i === lastIndex ? 'end' : i === 0 ? 'start' : 'middle'}
            fontSize="10"
            fill="var(--text-tertiary)"
          >
            {b.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
