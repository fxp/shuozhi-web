// Telemetry-style radar — concentric circles, crosshair, signal-red plot.
// Each axis end labels its dimension with a STACKED text node (score on top,
// "DIM·NN · X" mono caption below), text-anchor switched per quadrant so
// the score number can never overlap the caption regardless of axis direction.

import type { Domain } from "@/lib/types";

export interface RadarDatum {
  domain: Domain;
  label: string;
  value: number;
}

export interface RadarChartProps {
  data: RadarDatum[];
  showNorm?: boolean;
  size?: number;
}

// SIZE > 2*R means generous outside padding for labels.
const SIZE = 560;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R  = 168;

// 5 axes from top, clockwise: O, C, E, A, N
const ANGLES_DEG = [-90, -18, 54, 126, 198];

function polar(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + Math.cos(a) * radius, CY + Math.sin(a) * radius];
}

// Decide horizontal alignment per axis so labels never visually collide
// with their score: text extends AWAY from the center along that axis.
const TEXT_ANCHORS: Array<"start" | "middle" | "end"> = [
  "middle", // i=0  top axis
  "start",  // i=1  upper-right
  "start",  // i=2  lower-right
  "end",    // i=3  lower-left
  "end",    // i=4  upper-left
];

// dy offset: bottom axes flip stack order so caption stays closer to chart
// (visually cleaner — caption hugs chart, score sits further out).
function isBottomAxis(i: number) { return i === 2 || i === 3; }

export function RadarChart({ data, showNorm = true }: RadarChartProps) {
  const order: Domain[] = ["O", "C", "E", "A", "N"];
  const indexed = order.map((d) => data.find((x) => x.domain === d)!);

  const dataPoints = indexed.map((d, i) => polar(ANGLES_DEG[i], (R * d.value) / 100));
  const dataPolygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto block"
      aria-label="五维人格雷达图"
    >
      {/* concentric scale circles */}
      <g fill="none" stroke="#d6d8cf">
        <circle cx={CX} cy={CY} r={R * 0.25} strokeWidth="0.5" strokeDasharray="2 4" />
        <circle cx={CX} cy={CY} r={R * 0.50} strokeWidth="0.7" />
        <circle cx={CX} cy={CY} r={R * 0.75} strokeWidth="0.5" strokeDasharray="2 4" />
        <circle cx={CX} cy={CY} r={R}        strokeWidth="0.7" />
      </g>

      {/* 5 axes */}
      <g stroke="#d6d8cf" strokeWidth="0.5">
        {ANGLES_DEG.map((a, i) => {
          const [x, y] = polar(a, R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />;
        })}
      </g>

      {/* center crosshair */}
      <g stroke="#0e0e0e" strokeWidth="1">
        <line x1={CX - 8} y1={CY} x2={CX + 8} y2={CY} />
        <line x1={CX} y1={CY - 8} x2={CX} y2={CY + 8} />
      </g>
      <circle cx={CX} cy={CY} r="2.5" fill="#0e0e0e" />

      {/* tick marks at 25 / 50 / 75 along top axis */}
      <g stroke="#6b6e6a" strokeWidth="0.8">
        {[0.25, 0.5, 0.75].map((s, i) => (
          <line key={i} x1={CX - 4} y1={CY - R * s} x2={CX + 4} y2={CY - R * s} />
        ))}
      </g>

      {/* norm ring (median) */}
      {showNorm && (
        <circle cx={CX} cy={CY} r={R * 0.5} fill="none" stroke="#a8a89e" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      )}

      {/* personal polygon */}
      <polygon points={dataPolygon} fill="none" stroke="#ff3a1c" strokeWidth="1.5" strokeLinejoin="round" />

      {/* data dots with halo */}
      <g>
        {dataPoints.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="7" fill="none" stroke="#ff3a1c" strokeWidth="0.7" opacity="0.5" />
            <circle cx={x} cy={y} r="3.5" fill="#ff3a1c" />
          </g>
        ))}
      </g>

      {/* stacked label + score per axis */}
      <g>
        {ANGLES_DEG.map((a, i) => {
          const d = indexed[i];
          // Anchor placed slightly outside the chart ring.
          // Use larger offset for top/bottom (vertical stacking has more height
          // to clear), smaller for sides (horizontal text fits naturally).
          const radialOffset = i === 0 ? 36 : isBottomAxis(i) ? 32 : 28;
          const [ax, ay] = polar(a, R + radialOffset);
          const ta = TEXT_ANCHORS[i];

          // Stack order:
          //  - top + sides: score on top, caption below (score further from chart)
          //  - bottom: caption on top, score below (caption nearer chart, score lower)
          const captionFirst = isBottomAxis(i);
          const score = Math.round(d.value).toString().padStart(2, "0");
          const caption = `DIM·0${i + 1} · ${d.domain}`;

          return (
            <text
              key={i}
              x={ax}
              y={ay}
              textAnchor={ta}
              fontFamily='"Geist Mono", monospace'
            >
              {captionFirst ? (
                <>
                  <tspan
                    x={ax}
                    fontSize="10"
                    fontWeight="500"
                    fill="#0e0e0e"
                    letterSpacing="1.6"
                  >
                    {caption}
                  </tspan>
                  <tspan
                    x={ax}
                    dy="22"
                    fontFamily='"Cabinet Grotesk", sans-serif'
                    fontSize="22"
                    fontWeight="500"
                    fill="#ff3a1c"
                    style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
                  >
                    {score}
                  </tspan>
                </>
              ) : (
                <>
                  <tspan
                    x={ax}
                    dy="-2"
                    fontFamily='"Cabinet Grotesk", sans-serif'
                    fontSize="22"
                    fontWeight="500"
                    fill="#ff3a1c"
                    style={{ fontFeatureSettings: '"tnum" 1', letterSpacing: "-0.02em" }}
                  >
                    {score}
                  </tspan>
                  <tspan
                    x={ax}
                    dy="16"
                    fontSize="10"
                    fontWeight="500"
                    fill="#0e0e0e"
                    letterSpacing="1.6"
                  >
                    {caption}
                  </tspan>
                </>
              )}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
