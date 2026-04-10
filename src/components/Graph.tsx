"use client";

import type { GraphData } from "@/lib/types";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4"];

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

function DataTable({ data }: { data: GraphData }) {
  const tableData = data.data as { headers: string[]; rows: string[][] };
  if (!tableData.headers) return null;
  return (
    <div className="my-3 overflow-x-auto">
      {data.title && <p className="text-xs text-zinc-400 mb-2 font-medium">{data.title}</p>}
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            {tableData.headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 bg-zinc-800/60 text-zinc-300 font-medium border border-zinc-700/50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 text-zinc-400 border border-zinc-800/50">
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
  const maxVal = Math.max(...items.map((d) => d.value));

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <svg viewBox={`0 0 400 ${items.length * 32 + 40}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Y axis label */}
        {data.yLabel && (
          <text x="0" y="12" fill="#71717a" fontSize="10">{data.yLabel}</text>
        )}
        {items.map((item, i) => {
          const barWidth = maxVal > 0 ? (item.value / maxVal) * 260 : 0;
          const y = i * 32 + 24;
          const color = item.color || COLORS[i % COLORS.length];
          return (
            <g key={i}>
              <text x="0" y={y + 14} fill="#a1a1aa" fontSize="11" textAnchor="start">
                {item.label}
              </text>
              <rect x="100" y={y + 2} width={barWidth} height="18" rx="3" fill={color} opacity="0.8" />
              <text x={105 + barWidth} y={y + 15} fill="#d4d4d8" fontSize="10">
                {item.value}
              </text>
            </g>
          );
        })}
        {data.xLabel && (
          <text x="200" y={items.length * 32 + 38} fill="#71717a" fontSize="10" textAnchor="middle">{data.xLabel}</text>
        )}
      </svg>
    </div>
  );
}

function LineChart({ data }: { data: GraphData }) {
  const series = data.series;
  const xVals = data.xValues;
  if (!series || !xVals || series.length === 0) return null;

  const allVals = series.flatMap((s) => s.values);
  const minY = Math.min(...allVals);
  const maxY = Math.max(...allVals);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const rangeY = maxY - minY || 1;
  const rangeX = maxX - minX || 1;

  const W = 360;
  const H = 200;
  const pad = { l: 45, r: 20, t: 20, b: 35 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  function toX(v: number) { return pad.l + ((v - minX) / rangeX) * plotW; }
  function toY(v: number) { return pad.t + plotH - ((v - minY) / rangeY) * plotH; }

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} y1={pad.t + plotH * (1 - f)} x2={W - pad.r} y2={pad.t + plotH * (1 - f)} stroke="#27272a" strokeWidth="0.5" />
            <text x={pad.l - 5} y={pad.t + plotH * (1 - f) + 4} fill="#71717a" fontSize="9" textAnchor="end">
              {Math.round(minY + rangeY * f)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {xVals.filter((_, i) => i % Math.ceil(xVals.length / 6) === 0 || i === xVals.length - 1).map((v) => (
          <text key={v} x={toX(v)} y={H - pad.b + 15} fill="#71717a" fontSize="9" textAnchor="middle">{v}</text>
        ))}
        {/* Lines */}
        {series.map((s, si) => {
          const points = xVals.map((x, i) => `${toX(x)},${toY(s.values[i])}`).join(" ");
          return (
            <polyline key={si} points={points} fill="none" stroke={s.color || COLORS[si % COLORS.length]} strokeWidth="2" strokeLinejoin="round" />
          );
        })}
        {/* Axes labels */}
        {data.xLabel && <text x={W / 2} y={H - 2} fill="#71717a" fontSize="9" textAnchor="middle">{data.xLabel}</text>}
        {data.yLabel && <text x="10" y={H / 2} fill="#71717a" fontSize="9" textAnchor="middle" transform={`rotate(-90,10,${H / 2})`}>{data.yLabel}</text>}
        {/* Legend */}
        {series.length > 1 && series.map((s, i) => (
          <g key={i}>
            <rect x={pad.l + i * 90} y="4" width="10" height="10" rx="2" fill={s.color || COLORS[i % COLORS.length]} />
            <text x={pad.l + i * 90 + 14} y="12" fill="#a1a1aa" fontSize="9">{s.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PieChart({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;
  const total = items.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 100, cy = 100, r = 80;

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 200 200" className="w-40 h-40 shrink-0" shapeRendering="geometricPrecision">
          {items.map((item, i) => {
            const angle = (item.value / total) * 2 * Math.PI;
            const x1 = cx + r * Math.cos(cumAngle);
            const y1 = cy + r * Math.sin(cumAngle);
            cumAngle += angle;
            const x2 = cx + r * Math.cos(cumAngle);
            const y2 = cy + r * Math.sin(cumAngle);
            const largeArc = angle > Math.PI ? 1 : 0;
            const color = item.color || COLORS[i % COLORS.length];
            return (
              <path
                key={i}
                d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                fill={color}
                opacity="0.85"
                stroke="#18181b"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
              <span className="text-zinc-400">{item.label}</span>
              <span className="text-zinc-500">{Math.round((item.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScatterPlot({ data }: { data: GraphData }) {
  const points = data.data as number[][];
  if (!Array.isArray(points) || points.length === 0) return null;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;

  const W = 360, H = 220;
  const pad = { l: 45, r: 20, t: 15, b: 35 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} y1={pad.t + plotH * (1 - f)} x2={W - pad.r} y2={pad.t + plotH * (1 - f)} stroke="#27272a" strokeWidth="0.5" />
            <text x={pad.l - 5} y={pad.t + plotH * (1 - f) + 4} fill="#71717a" fontSize="9" textAnchor="end">
              {Math.round(minY + rangeY * f)}
            </text>
          </g>
        ))}
        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={pad.l + ((p[0] - minX) / rangeX) * plotW}
            cy={pad.t + plotH - ((p[1] - minY) / rangeY) * plotH}
            r="3.5"
            fill="#6366f1"
            opacity="0.7"
          />
        ))}
        {data.xLabel && <text x={W / 2} y={H - 2} fill="#71717a" fontSize="9" textAnchor="middle">{data.xLabel}</text>}
        {data.yLabel && <text x="10" y={H / 2} fill="#71717a" fontSize="9" textAnchor="middle" transform={`rotate(-90,10,${H / 2})`}>{data.yLabel}</text>}
      </svg>
    </div>
  );
}

function BoxPlot({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length < 5) return null;
  // Expect: [min, Q1, median, Q3, max] as the first 5 values
  const [min, q1, med, q3, max] = items.map((d) => d.value);
  const range = max - min || 1;

  const W = 360, H = 80;
  const pad = { l: 30, r: 20 };
  const plotW = W - pad.l - pad.r;

  function toX(v: number) { return pad.l + ((v - min) / range) * plotW; }

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Whiskers */}
        <line x1={toX(min)} y1="30" x2={toX(q1)} y2="30" stroke="#6366f1" strokeWidth="1.5" />
        <line x1={toX(q3)} y1="30" x2={toX(max)} y2="30" stroke="#6366f1" strokeWidth="1.5" />
        {/* Min/Max caps */}
        <line x1={toX(min)} y1="22" x2={toX(min)} y2="38" stroke="#6366f1" strokeWidth="1.5" />
        <line x1={toX(max)} y1="22" x2={toX(max)} y2="38" stroke="#6366f1" strokeWidth="1.5" />
        {/* Box */}
        <rect x={toX(q1)} y="18" width={toX(q3) - toX(q1)} height="24" fill="#6366f1" opacity="0.2" stroke="#6366f1" strokeWidth="1.5" rx="2" />
        {/* Median */}
        <line x1={toX(med)} y1="18" x2={toX(med)} y2="42" stroke="#f59e0b" strokeWidth="2" />
        {/* Labels */}
        {[min, q1, med, q3, max].map((v, i) => (
          <text key={i} x={toX(v)} y="60" fill="#71717a" fontSize="9" textAnchor="middle">{v}</text>
        ))}
        {data.xLabel && <text x={W / 2} y="75" fill="#71717a" fontSize="9" textAnchor="middle">{data.xLabel}</text>}
      </svg>
    </div>
  );
}

function Histogram({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;
  const maxVal = Math.max(...items.map((d) => d.value));

  const W = 360, H = 180;
  const pad = { l: 40, r: 10, t: 15, b: 40 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
  const barW = plotW / items.length;

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} y1={pad.t + plotH * (1 - f)} x2={W - pad.r} y2={pad.t + plotH * (1 - f)} stroke="#27272a" strokeWidth="0.5" />
            <text x={pad.l - 5} y={pad.t + plotH * (1 - f) + 4} fill="#71717a" fontSize="9" textAnchor="end">
              {Math.round(maxVal * f)}
            </text>
          </g>
        ))}
        {/* Bars */}
        {items.map((item, i) => {
          const barH = maxVal > 0 ? (item.value / maxVal) * plotH : 0;
          return (
            <g key={i}>
              <rect
                x={pad.l + i * barW + 1}
                y={pad.t + plotH - barH}
                width={barW - 2}
                height={barH}
                fill={item.color || "#6366f1"}
                opacity="0.75"
                rx="1"
              />
              <text
                x={pad.l + i * barW + barW / 2}
                y={H - pad.b + 12}
                fill="#71717a"
                fontSize={items.length > 8 ? "7" : "9"}
                textAnchor="middle"
              >
                {item.label}
              </text>
            </g>
          );
        })}
        {data.xLabel && <text x={W / 2} y={H - 2} fill="#71717a" fontSize="9" textAnchor="middle">{data.xLabel}</text>}
        {data.yLabel && <text x="8" y={H / 2} fill="#71717a" fontSize="9" textAnchor="middle" transform={`rotate(-90,8,${H / 2})`}>{data.yLabel}</text>}
      </svg>
    </div>
  );
}

function NumberLine({ data }: { data: GraphData }) {
  const items = data.data as Array<{ label: string; value: number; color?: string }>;
  if (!Array.isArray(items) || items.length === 0) return null;

  const allVals = items.map((d) => d.value);
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;

  const W = 400, H = 90;
  const pad = { l: 30, r: 30 };
  const lineW = W - pad.l - pad.r;
  const lineY = 35;

  function toX(v: number) { return pad.l + ((v - minVal) / range) * lineW; }

  return (
    <div className="my-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
      {data.title && <p className="text-xs text-zinc-400 mb-3 font-medium">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" shapeRendering="geometricPrecision">
        {/* Main line */}
        <line x1={pad.l} y1={lineY} x2={W - pad.r} y2={lineY} stroke="#52525b" strokeWidth="2" />
        {/* End caps */}
        <line x1={pad.l} y1={lineY - 8} x2={pad.l} y2={lineY + 8} stroke="#52525b" strokeWidth="2" />
        <line x1={W - pad.r} y1={lineY - 8} x2={W - pad.r} y2={lineY + 8} stroke="#52525b" strokeWidth="2" />
        {/* Start/end labels */}
        {data.xLabel && (
          <>
            <text x={pad.l} y={lineY + 22} fill="#a1a1aa" fontSize="9" textAnchor="middle">{data.xLabel.split("||")[0]}</text>
            <text x={W - pad.r} y={lineY + 22} fill="#a1a1aa" fontSize="9" textAnchor="middle">{data.xLabel.split("||")[1] || ""}</text>
          </>
        )}
        {/* Arrows/markers */}
        {items.map((item, i) => {
          const x = toX(item.value);
          return (
            <g key={i}>
              {/* Tick mark */}
              <line x1={x} y1={lineY - 6} x2={x} y2={lineY + 6} stroke="#a1a1aa" strokeWidth="1.5" />
              {/* Arrow pointing down to tick */}
              <polygon points={`${x},${lineY - 8} ${x - 4},${lineY - 16} ${x + 4},${lineY - 16}`} fill={item.color || "#6366f1"} />
              {/* Label above arrow */}
              <text x={x} y={lineY - 20} fill="#d4d4d8" fontSize="11" fontWeight="bold" textAnchor="middle">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
