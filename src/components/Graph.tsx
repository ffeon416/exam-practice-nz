"use client";

import type { GraphData } from "@/lib/types";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4"];

// Compute "nice" round axis bounds
function niceCeil(v: number): number {
  if (v === 0) return 1;
  const sign = Math.sign(v);
  const abs = Math.abs(v);
  const mag = Math.pow(10, Math.floor(Math.log10(abs)));
  const norm = abs / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return sign * nice * mag;
}

function niceStep(range: number, target: number): number {
  const rough = range / target;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

export default function Graph({ data }: { data: GraphData }) {
  if (data.type === "table") return <DataTable data={data} />;
  if (data.type === "bar") return <BarChart data={data} />;
  if (data.type === "line") return <LineChart data={data} />;
  if (data.type === "pie") return <PieChart data={data} />;
  if (data.type === "scatter") return <ScatterPlot data={data} />;
  if (data.type === "box-plot") return <BoxPlot data={data} />;
  if (data.type === "histogram") return <Histogram data={data} />;
  if (data.type === "number-line") return <NumberLine data={data} />;
  return null;
}

function ChartFrame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-4 bg-white rounded-lg p-5 border border-zinc-300 shadow-sm">
      {title && <p className="text-sm text-zinc-800 mb-3 font-semibold text-center">{title}</p>}
      {children}
    </div>
  );
}

function DataTable({ data }: { data: GraphData }) {
  const tableData = data.data as { headers: string[]; rows: string[][] };
  if (!tableData.headers) return null;
  return (
    <div className="my-4 overflow-x-auto bg-white rounded-lg p-4 border border-zinc-300 shadow-sm">
      {data.title && <p className="text-sm text-zinc-800 mb-3 font-semibold text-center">{data.title}</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {tableData.headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 bg-zinc-100 text-zinc-900 font-bold border border-zinc-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-zinc-800 border border-zinc-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarChart({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;

  const maxData = Math.max(...items.map((d) => d.value));
  const maxY = niceCeil(maxData * 1.05);
  const step = niceStep(maxY, 10);
  const tickCount = Math.round(maxY / step);

  const W = 560;
  const barCount = items.length;
  const barH = 28;
  const gap = 8;
  const labelW = 110;
  const valueW = 60;
  const pad = { l: labelW, r: valueW, t: 40, b: 30 };
  const plotW = W - pad.l - pad.r;
  const H = pad.t + barCount * (barH + gap) + pad.b;

  function toX(v: number) { return pad.l + (v / maxY) * plotW; }

  return (
    <ChartFrame title={data.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Vertical grid lines */}
        {Array.from({ length: tickCount + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={toX(v)} y1={pad.t} x2={toX(v)} y2={H - pad.b} stroke="#d4d4d8" strokeWidth="0.6" strokeDasharray="2,3" />
            <text x={toX(v)} y={pad.t - 8} fill="#52525b" fontSize="11" textAnchor="middle" fontWeight="500">{v}</text>
          </g>
        ))}
        {/* Top scale line */}
        <line x1={pad.l} y1={pad.t} x2={W - pad.r} y2={pad.t} stroke="#52525b" strokeWidth="1.5" />
        {/* Left axis */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#52525b" strokeWidth="1.5" />
        {/* Bars */}
        {items.map((item, i) => {
          const y = pad.t + i * (barH + gap) + 4;
          const w = (item.value / maxY) * plotW;
          const color = item.color || COLORS[i % COLORS.length];
          return (
            <g key={i}>
              <text x={pad.l - 10} y={y + barH / 2 + 4} fill="#18181b" fontSize="13" textAnchor="end" fontWeight="500">
                {item.label}
              </text>
              <rect x={pad.l} y={y} width={w} height={barH} fill={color} stroke={color} strokeWidth="1" rx="2" />
              <text x={pad.l + w + 6} y={y + barH / 2 + 4} fill="#18181b" fontSize="13" fontWeight="600">
                {item.value}
              </text>
            </g>
          );
        })}
        {data.xLabel && <text x={W / 2} y={H - 8} fill="#52525b" fontSize="12" textAnchor="middle" fontWeight="500">{data.xLabel}</text>}
      </svg>
    </ChartFrame>
  );
}

function LineChart({ data }: { data: GraphData }) {
  const series = data.series;
  const xVals = data.xValues;
  if (!series || !xVals || series.length === 0) return null;

  const allVals = series.flatMap((s) => s.values);
  const dataMaxY = Math.max(...allVals);
  const dataMinY = Math.min(...allVals);
  const minY = dataMinY < 0 ? niceCeil(dataMinY * 1.1) : 0;
  const maxY = niceCeil(dataMaxY * 1.05);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const rangeY = maxY - minY || 1;
  const rangeX = maxX - minX || 1;

  const W = 580;
  const H = 380;
  const pad = { l: 65, r: 30, t: 50, b: 60 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  function toX(v: number) { return pad.l + ((v - minX) / rangeX) * plotW; }
  function toY(v: number) { return pad.t + plotH - ((v - minY) / rangeY) * plotH; }

  // Major y-axis ticks: ~10 of them
  const yStep = niceStep(rangeY, 10);
  const yTicks: number[] = [];
  for (let v = minY; v <= maxY + yStep / 2; v += yStep) yTicks.push(v);
  // Minor y ticks (4 between each major)
  const minorY: number[] = [];
  for (let i = 0; i < yTicks.length - 1; i++) {
    for (let j = 1; j < 5; j++) {
      minorY.push(yTicks[i] + (yStep * j) / 5);
    }
  }

  // Minor x grid lines (5 between each major x value)
  const minorX: number[] = [];
  for (let i = 0; i < xVals.length - 1; i++) {
    for (let j = 1; j < 5; j++) {
      minorX.push(xVals[i] + ((xVals[i + 1] - xVals[i]) * j) / 5);
    }
  }

  return (
    <ChartFrame title={data.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Plot background */}
        <rect x={pad.l} y={pad.t} width={plotW} height={plotH} fill="#fafafa" stroke="none" />

        {/* Minor grid (Y) */}
        {minorY.map((v, i) => (
          <line key={`my-${i}`} x1={pad.l} y1={toY(v)} x2={W - pad.r} y2={toY(v)} stroke="#e4e4e7" strokeWidth="0.5" />
        ))}
        {/* Minor grid (X) */}
        {minorX.map((v, i) => (
          <line key={`mx-${i}`} x1={toX(v)} y1={pad.t} x2={toX(v)} y2={pad.t + plotH} stroke="#e4e4e7" strokeWidth="0.5" />
        ))}

        {/* Major grid (Y) with labels */}
        {yTicks.map((v, i) => (
          <g key={`y-${i}`}>
            <line x1={pad.l} y1={toY(v)} x2={W - pad.r} y2={toY(v)} stroke="#a1a1aa" strokeWidth="0.8" />
            <line x1={pad.l - 5} y1={toY(v)} x2={pad.l} y2={toY(v)} stroke="#27272a" strokeWidth="1.2" />
            <text x={pad.l - 10} y={toY(v) + 4} fill="#27272a" fontSize="13" textAnchor="end" fontWeight="500">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Major grid (X) with labels */}
        {xVals.map((v, i) => (
          <g key={`x-${i}`}>
            <line x1={toX(v)} y1={pad.t} x2={toX(v)} y2={pad.t + plotH} stroke="#a1a1aa" strokeWidth="0.8" />
            <line x1={toX(v)} y1={pad.t + plotH} x2={toX(v)} y2={pad.t + plotH + 5} stroke="#27272a" strokeWidth="1.2" />
            <text x={toX(v)} y={pad.t + plotH + 20} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="500">{v}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="#27272a" strokeWidth="2" />
        <line x1={pad.l} y1={pad.t + plotH} x2={W - pad.r} y2={pad.t + plotH} stroke="#27272a" strokeWidth="2" />

        {/* Lines */}
        {series.map((s, si) => {
          const points = xVals.map((x, i) => `${toX(x)},${toY(s.values[i])}`).join(" ");
          const color = s.color || COLORS[si % COLORS.length];
          return (
            <g key={si}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {xVals.map((x, i) => (
                <circle key={i} cx={toX(x)} cy={toY(s.values[i])} r="5" fill="white" stroke={color} strokeWidth="2.5" />
              ))}
            </g>
          );
        })}

        {/* Axis labels */}
        {data.xLabel && <text x={pad.l + plotW / 2} y={H - 12} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="600">{data.xLabel}</text>}
        {data.yLabel && (
          <text x={18} y={pad.t + plotH / 2} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="600" transform={`rotate(-90, 18, ${pad.t + plotH / 2})`}>{data.yLabel}</text>
        )}

        {/* Legend */}
        {series.length > 1 && (
          <g>
            {series.map((s, i) => (
              <g key={i} transform={`translate(${pad.l + i * 120}, ${pad.t - 32})`}>
                <line x1="0" y1="6" x2="20" y2="6" stroke={s.color || COLORS[i % COLORS.length]} strokeWidth="3" />
                <circle cx="10" cy="6" r="4" fill="white" stroke={s.color || COLORS[i % COLORS.length]} strokeWidth="2" />
                <text x="26" y="10" fill="#27272a" fontSize="12" fontWeight="500">{s.name}</text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </ChartFrame>
  );
}

function PieChart({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;
  const total = items.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 130, cy = 130, r = 110;

  return (
    <ChartFrame title={data.title}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox="0 0 260 260" className="w-56 h-56 shrink-0" shapeRendering="geometricPrecision">
          {items.map((item, i) => {
            const angle = (item.value / total) * 2 * Math.PI;
            const x1 = cx + r * Math.cos(cumAngle);
            const y1 = cy + r * Math.sin(cumAngle);
            const midAngle = cumAngle + angle / 2;
            cumAngle += angle;
            const x2 = cx + r * Math.cos(cumAngle);
            const y2 = cy + r * Math.sin(cumAngle);
            const largeArc = angle > Math.PI ? 1 : 0;
            const color = item.color || COLORS[i % COLORS.length];
            const pct = Math.round((item.value / total) * 100);
            const labelX = cx + (r * 0.65) * Math.cos(midAngle);
            const labelY = cy + (r * 0.65) * Math.sin(midAngle);
            return (
              <g key={i}>
                <path
                  d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                />
                {pct >= 5 && (
                  <text x={labelX} y={labelY + 4} fill="white" fontSize="14" fontWeight="700" textAnchor="middle">{pct}%</text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
              <span className="text-zinc-900 font-medium">{item.label}</span>
              <span className="text-zinc-600">({item.value})</span>
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function ScatterPlot({ data }: { data: GraphData }) {
  const points = data.data as number[][];
  if (!Array.isArray(points) || points.length === 0) return null;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const dataMinX = Math.min(...xs), dataMaxX = Math.max(...xs);
  const dataMinY = Math.min(...ys), dataMaxY = Math.max(...ys);
  const minX = dataMinX > 0 ? 0 : niceCeil(dataMinX * 1.1);
  const maxX = niceCeil(dataMaxX * 1.05);
  const minY = dataMinY > 0 ? 0 : niceCeil(dataMinY * 1.1);
  const maxY = niceCeil(dataMaxY * 1.05);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

  const W = 580, H = 380;
  const pad = { l: 65, r: 30, t: 30, b: 60 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  function toX(v: number) { return pad.l + ((v - minX) / rangeX) * plotW; }
  function toY(v: number) { return pad.t + plotH - ((v - minY) / rangeY) * plotH; }

  const xStep = niceStep(rangeX, 10);
  const yStep = niceStep(rangeY, 10);
  const xTicks: number[] = [];
  for (let v = minX; v <= maxX + xStep / 2; v += xStep) xTicks.push(v);
  const yTicks: number[] = [];
  for (let v = minY; v <= maxY + yStep / 2; v += yStep) yTicks.push(v);

  return (
    <ChartFrame title={data.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        <rect x={pad.l} y={pad.t} width={plotW} height={plotH} fill="#fafafa" />
        {/* Y grid */}
        {yTicks.map((v, i) => (
          <g key={`y-${i}`}>
            <line x1={pad.l} y1={toY(v)} x2={W - pad.r} y2={toY(v)} stroke="#a1a1aa" strokeWidth="0.7" />
            <text x={pad.l - 8} y={toY(v) + 4} fill="#27272a" fontSize="12" textAnchor="end">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
          </g>
        ))}
        {/* X grid */}
        {xTicks.map((v, i) => (
          <g key={`x-${i}`}>
            <line x1={toX(v)} y1={pad.t} x2={toX(v)} y2={pad.t + plotH} stroke="#a1a1aa" strokeWidth="0.7" />
            <text x={toX(v)} y={pad.t + plotH + 18} fill="#27272a" fontSize="12" textAnchor="middle">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
          </g>
        ))}
        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="#27272a" strokeWidth="2" />
        <line x1={pad.l} y1={pad.t + plotH} x2={W - pad.r} y2={pad.t + plotH} stroke="#27272a" strokeWidth="2" />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={toX(p[0])} cy={toY(p[1])} r="5" fill="#6366f1" stroke="white" strokeWidth="1.5" />
        ))}
        {data.xLabel && <text x={pad.l + plotW / 2} y={H - 10} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="600">{data.xLabel}</text>}
        {data.yLabel && <text x={18} y={pad.t + plotH / 2} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="600" transform={`rotate(-90, 18, ${pad.t + plotH / 2})`}>{data.yLabel}</text>}
      </svg>
    </ChartFrame>
  );
}

function BoxPlot({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length < 5) return null;
  const [min, q1, med, q3, max] = items.map((d) => d.value);
  const fullRange = max - min;
  const padding = fullRange * 0.1;
  const axisMin = niceCeil((min - padding) * (min - padding < 0 ? 1.1 : 0.9));
  const axisMax = niceCeil(max + padding);
  const range = axisMax - axisMin || 1;

  const W = 560, H = 220;
  const pad = { l: 50, r: 50, t: 50, b: 60 };
  const plotW = W - pad.l - pad.r;

  function toX(v: number) { return pad.l + ((v - axisMin) / range) * plotW; }

  const step = niceStep(range, 10);
  const ticks: number[] = [];
  for (let v = axisMin; v <= axisMax + step / 2; v += step) ticks.push(v);

  const boxY = pad.t + 30;
  const boxH = 60;

  return (
    <ChartFrame title={data.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Box */}
        <rect x={toX(q1)} y={boxY} width={toX(q3) - toX(q1)} height={boxH} fill="#c7d2fe" stroke="#4338ca" strokeWidth="2" />
        {/* Whiskers */}
        <line x1={toX(min)} y1={boxY + boxH / 2} x2={toX(q1)} y2={boxY + boxH / 2} stroke="#4338ca" strokeWidth="2" />
        <line x1={toX(q3)} y1={boxY + boxH / 2} x2={toX(max)} y2={boxY + boxH / 2} stroke="#4338ca" strokeWidth="2" />
        {/* Whisker caps */}
        <line x1={toX(min)} y1={boxY + 10} x2={toX(min)} y2={boxY + boxH - 10} stroke="#4338ca" strokeWidth="2.5" />
        <line x1={toX(max)} y1={boxY + 10} x2={toX(max)} y2={boxY + boxH - 10} stroke="#4338ca" strokeWidth="2.5" />
        {/* Median line */}
        <line x1={toX(med)} y1={boxY} x2={toX(med)} y2={boxY + boxH} stroke="#dc2626" strokeWidth="3" />
        {/* Value labels above */}
        {[min, q1, med, q3, max].map((v, i) => (
          <text key={i} x={toX(v)} y={boxY - 8} fill="#18181b" fontSize="12" textAnchor="middle" fontWeight="600">{v}</text>
        ))}
        {/* Number line */}
        <line x1={pad.l} y1={boxY + boxH + 25} x2={W - pad.r} y2={boxY + boxH + 25} stroke="#27272a" strokeWidth="1.5" />
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={toX(v)} y1={boxY + boxH + 22} x2={toX(v)} y2={boxY + boxH + 28} stroke="#27272a" strokeWidth="1.5" />
            <text x={toX(v)} y={boxY + boxH + 42} fill="#52525b" fontSize="11" textAnchor="middle">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
          </g>
        ))}
        {data.xLabel && <text x={W / 2} y={H - 8} fill="#27272a" fontSize="12" textAnchor="middle" fontWeight="500">{data.xLabel}</text>}
      </svg>
    </ChartFrame>
  );
}

function Histogram({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;
  const dataMax = Math.max(...items.map((d) => d.value));
  const maxY = niceCeil(dataMax * 1.05);

  const W = 580, H = 360;
  const pad = { l: 65, r: 30, t: 30, b: 70 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const barW = plotW / items.length;

  const yStep = niceStep(maxY, 10);
  const yTicks: number[] = [];
  for (let v = 0; v <= maxY + yStep / 2; v += yStep) yTicks.push(v);
  // Minor ticks
  const minorY: number[] = [];
  for (let i = 0; i < yTicks.length - 1; i++) {
    for (let j = 1; j < 5; j++) {
      minorY.push(yTicks[i] + (yStep * j) / 5);
    }
  }

  return (
    <ChartFrame title={data.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        <rect x={pad.l} y={pad.t} width={plotW} height={plotH} fill="#fafafa" />
        {/* Minor Y grid */}
        {minorY.map((v, i) => {
          const y = pad.t + plotH - (v / maxY) * plotH;
          return <line key={`my-${i}`} x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#e4e4e7" strokeWidth="0.5" />;
        })}
        {/* Major Y grid + labels */}
        {yTicks.map((v, i) => {
          const y = pad.t + plotH - (v / maxY) * plotH;
          return (
            <g key={`y-${i}`}>
              <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#a1a1aa" strokeWidth="0.7" />
              <text x={pad.l - 8} y={y + 4} fill="#27272a" fontSize="12" textAnchor="end" fontWeight="500">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
            </g>
          );
        })}
        {/* Bars */}
        {items.map((item, i) => {
          const barH = (item.value / maxY) * plotH;
          const x = pad.l + i * barW;
          return (
            <g key={i}>
              <rect x={x + 2} y={pad.t + plotH - barH} width={barW - 4} height={barH} fill={item.color || "#6366f1"} stroke="#312e81" strokeWidth="1" />
              <text x={x + barW / 2} y={H - pad.b + 18} fill="#27272a" fontSize={items.length > 8 ? "10" : "12"} textAnchor="middle" fontWeight="500">{item.label}</text>
              <text x={x + barW / 2} y={pad.t + plotH - barH - 5} fill="#18181b" fontSize="11" textAnchor="middle" fontWeight="600">{item.value}</text>
            </g>
          );
        })}
        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="#27272a" strokeWidth="2" />
        <line x1={pad.l} y1={pad.t + plotH} x2={W - pad.r} y2={pad.t + plotH} stroke="#27272a" strokeWidth="2" />
        {data.xLabel && <text x={pad.l + plotW / 2} y={H - 10} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="600">{data.xLabel}</text>}
        {data.yLabel && <text x={18} y={pad.t + plotH / 2} fill="#27272a" fontSize="13" textAnchor="middle" fontWeight="600" transform={`rotate(-90, 18, ${pad.t + plotH / 2})`}>{data.yLabel}</text>}
      </svg>
    </ChartFrame>
  );
}

function NumberLine({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;

  const leftVal = data.xValues?.[0] ?? 0;
  const rightVal = data.xValues?.[1] ?? Math.max(...items.map((d) => d.value));
  const reversed = leftVal > rightVal;
  const range = Math.abs(rightVal - leftVal) || 1;

  const W = 600, H = 160;
  const pad = { l: 60, r: 60 };
  const lineW = W - pad.l - pad.r;
  const lineY = 70;

  function toX(v: number) {
    if (reversed) return pad.l + ((leftVal - v) / range) * lineW;
    return pad.l + ((v - leftVal) / range) * lineW;
  }

  // Generate major tick marks at nice intervals
  const minVal = Math.min(leftVal, rightVal);
  const maxVal = Math.max(leftVal, rightVal);
  const step = niceStep(range, 10);
  const tickValues: number[] = [];
  for (let v = minVal; v <= maxVal + step / 2; v += step) tickValues.push(v);

  return (
    <ChartFrame title={data.title}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Main line */}
        <line x1={pad.l} y1={lineY} x2={W - pad.r} y2={lineY} stroke="#27272a" strokeWidth="2.5" />
        {/* End arrows */}
        <polygon points={`${pad.l - 12},${lineY} ${pad.l},${lineY - 6} ${pad.l},${lineY + 6}`} fill="#27272a" />
        <polygon points={`${W - pad.r + 12},${lineY} ${W - pad.r},${lineY - 6} ${W - pad.r},${lineY + 6}`} fill="#27272a" />

        {/* Background tick marks (showing the scale) */}
        {tickValues.map((v, i) => (
          <g key={`tk-${i}`}>
            <line x1={toX(v)} y1={lineY - 4} x2={toX(v)} y2={lineY + 4} stroke="#71717a" strokeWidth="1" />
            <text x={toX(v)} y={lineY + 18} fill="#52525b" fontSize="10" textAnchor="middle">{v}</text>
          </g>
        ))}

        {/* End labels */}
        {data.xLabel && (
          <>
            <text x={pad.l} y={lineY + 38} fill="#18181b" fontSize="13" textAnchor="middle" fontWeight="600">{data.xLabel.split("||")[0]}</text>
            <text x={W - pad.r} y={lineY + 38} fill="#18181b" fontSize="13" textAnchor="middle" fontWeight="600">{data.xLabel.split("||")[1] || ""}</text>
          </>
        )}

        {/* Marker arrows from items */}
        {items.map((item, i) => {
          const x = toX(item.value);
          const color = item.color || "#6366f1";
          return (
            <g key={i}>
              {/* Vertical line down from label to tick */}
              <line x1={x} y1={lineY - 35} x2={x} y2={lineY - 4} stroke={color} strokeWidth="2" />
              {/* Arrow head */}
              <polygon points={`${x},${lineY - 4} ${x - 5},${lineY - 14} ${x + 5},${lineY - 14}`} fill={color} />
              {/* Label circle and number */}
              <circle cx={x} cy={lineY - 45} r="11" fill={color} stroke="white" strokeWidth="2" />
              <text x={x} y={lineY - 41} fill="white" fontSize="13" fontWeight="700" textAnchor="middle">{item.label}</text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
