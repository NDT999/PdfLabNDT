/**
 * ProgressBar — Animated progress indicator.
 *
 * Props:
 *   value    — 0–100 (percentage)
 *   label    — optional text above the bar
 *   color    — tailwind color token (default: 'brand')
 */
export default function ProgressBar({ value = 0, label, color = 'brand' }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const bgMap = {
    brand:   'bg-brand-500',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
    rose:    'bg-rose-500',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">{label}</span>
          <span className="font-mono text-slate-500">{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${bgMap[color] || bgMap.brand}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
