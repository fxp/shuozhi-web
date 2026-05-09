import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="group inline-flex items-baseline gap-3">
      <span className="font-display text-[19px] font-medium tracking-tight text-ink">朔知</span>
      <span className="label-mono group-hover:text-ink transition-colors">SHUOZHI/v0</span>
    </Link>
  );
}
