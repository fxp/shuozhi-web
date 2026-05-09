// Facet bar — mono name, signal-red fill, mono numeric tail
// (color prop kept for API compat but ignored — the design uses one signal across all dims)

interface FacetBarProps {
  name: string;
  value: number;     // 0..100
  color?: string;    // ignored
}

export function FacetBar({ name, value }: FacetBarProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="grid grid-cols-[140px_1fr_44px] sm:grid-cols-[160px_1fr_44px] items-center gap-4 py-2">
      <span className="label-mono-ink truncate">{name}</span>
      <div className="relative h-[3px] bg-frost-soft">
        {/* median tick */}
        <div className="absolute left-1/2 -top-[3px] -bottom-[3px] w-px bg-frost" />
        {/* fill */}
        <div className="absolute left-0 top-0 h-full bg-signal" style={{ width: `${v}%` }} />
      </div>
      <span
        className="font-mono text-[14px] text-ink text-right tnum"
        style={{ fontFeatureSettings: '"tnum" 1' }}
      >
        {Math.round(v).toString().padStart(2, "0")}
      </span>
    </div>
  );
}
