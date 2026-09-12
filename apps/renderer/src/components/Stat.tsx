/**
 * KPI tile used across report/summary screens. `good`/`bad` carry a verdict
 * (green/red); `neutral` is for informational values mixed among them (an
 * invoice count, a warehouse name) that shouldn't compete visually with the
 * tiles that actually judge something.
 */

interface StatProps {
  label: string;
  value: string;
  good?: boolean;
  bad?: boolean;
  neutral?: boolean;
}

export function Stat({ label, value, good, bad, neutral }: StatProps) {
  const modifier = bad ? ' stat--bad' : good ? ' stat--good' : neutral ? ' stat--neutral' : '';
  return (
    <div className={`stat${modifier}`}>
      <span className="stat__value" dir="ltr">
        {value}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
