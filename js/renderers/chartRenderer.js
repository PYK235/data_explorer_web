import { chartColors } from "../data/mockData.js";

// ================= SVG HELPERS =================
function svgClear(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

// ================= SCATTER =================
export function renderScatter(svg, rows, labels = [], variant, centroids = []) {
  svgClear(svg);
  if (!rows || !rows.length) return;

  const xs = rows.map(r => Number(r[0] ?? r.income ?? 0));
  const ys = rows.map(r => Number(r[1] ?? r.spending ?? 0));

  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const scaleX = v => 50 + ((v - minX) / (maxX - minX || 1)) * 320;
  const scaleY = v => 220 - ((v - minY) / (maxY - minY || 1)) * 180;

  // Axes
  const axisColor = "rgba(255,255,255,0.3)";
  svg.append(svgNode("line", { x1: 40, y1: 220, x2: 390, y2: 220, stroke: axisColor }));
  svg.append(svgNode("line", { x1: 40, y1: 220, x2: 40, y2: 30, stroke: axisColor }));

  rows.forEach((row, i) => {
    const x = scaleX(Number(row[0] ?? row.income ?? 0));
    const y = scaleY(Number(row[1] ?? row.spending ?? 0));
    const cluster = labels[i] ?? 0;

    if (variant === "dbscan" && cluster === -1) {
      // Noise point — hình X màu đỏ
      const size = 5;
      svg.append(svgNode("line", {
        x1: x - size, y1: y - size, x2: x + size, y2: y + size,
        stroke: "#fb7185", "stroke-width": 2.5, "stroke-linecap": "round"
      }));
      svg.append(svgNode("line", {
        x1: x + size, y1: y - size, x2: x - size, y2: y + size,
        stroke: "#fb7185", "stroke-width": 2.5, "stroke-linecap": "round"
      }));
      return;
    }

    const color = chartColors[cluster % chartColors.length];

    // Vòng glow nhẹ cho core point (nếu có thông tin)
    svg.append(svgNode("circle", {
      cx: x, cy: y, r: 7,
      fill: color, opacity: 0.15
    }));

    svg.append(svgNode("circle", {
      cx: x, cy: y, r: 5,
      fill: color, stroke: "#111", "stroke-width": 1.2, opacity: 0.9
    }));
  });

  // Centroids / pseudo-centroids
  if (centroids?.length) {
    centroids.forEach((c, i) => {
      const cx = scaleX(c[0]);
      const cy = scaleY(c[1]);

      svg.append(svgNode("circle", {
        cx, cy, r: 10,
        fill: "none",
        stroke: chartColors[i % chartColors.length],
        "stroke-width": 2.5,
        "stroke-dasharray": "4 3"
      }));

      svg.append(svgNode("circle", {
        cx, cy, r: 4,
        fill: "#ffffff"
      }));

      const text = svgNode("text", {
        x: cx, y: cy - 14,
        "text-anchor": "middle",
        fill: "#ffffff",
        "font-size": "10"
      });
      text.textContent = variant === "dbscan" ? `D${i + 1}` : `C${i + 1}`;
      svg.append(text);
    });
  }

  // Legend DBSCAN
  if (variant === "dbscan") {
    const legendY = 15;

    // Core/border dot
    svg.append(svgNode("circle", { cx: 55, cy: legendY, r: 4, fill: chartColors[0], opacity: 0.9 }));
    const t1 = svgNode("text", { x: 63, y: legendY + 4, fill: "#ccc", "font-size": "9" });
    t1.textContent = "Điểm cụm";
    svg.append(t1);

    // Noise X
    svg.append(svgNode("line", { x1: 133, y1: legendY - 4, x2: 141, y2: legendY + 4, stroke: "#fb7185", "stroke-width": 2 }));
    svg.append(svgNode("line", { x1: 141, y1: legendY - 4, x2: 133, y2: legendY + 4, stroke: "#fb7185", "stroke-width": 2 }));
    const t2 = svgNode("text", { x: 146, y: legendY + 4, fill: "#ccc", "font-size": "9" });
    t2.textContent = "Noise";
    svg.append(t2);
  }
}

export function renderDendrogram(svg, dendrogramData, cutThreshold = null) {
  svgClear(svg);
  if (!dendrogramData?.icoord?.length || !dendrogramData?.dcoord?.length) return;

  const allX = dendrogramData.icoord.flat();
  const allY = dendrogramData.dcoord.flat();
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = 0;
  const maxY = Math.max(...allY, cutThreshold ?? 0, 1);

  const scaleX = (v) => 24 + ((v - minX) / (maxX - minX || 1)) * 372;
  const scaleY = (v) => 220 - ((v - minY) / (maxY - minY || 1)) * 180;
  const axisColor = "rgba(255,255,255,0.3)";

  svg.append(svgNode("line", { x1: 24, y1: 220, x2: 396, y2: 220, stroke: axisColor }));
  svg.append(svgNode("line", { x1: 24, y1: 220, x2: 24, y2: 26, stroke: axisColor }));

  for (let i = 0; i < dendrogramData.icoord.length; i += 1) {
    const xs = dendrogramData.icoord[i];
    const ys = dendrogramData.dcoord[i];
    const path = [
      `M ${scaleX(xs[0])} ${scaleY(ys[0])}`,
      `L ${scaleX(xs[1])} ${scaleY(ys[1])}`,
      `L ${scaleX(xs[2])} ${scaleY(ys[2])}`,
      `L ${scaleX(xs[3])} ${scaleY(ys[3])}`
    ].join(" ");

    svg.append(svgNode("path", {
      d: path,
      fill: "none",
      stroke: "#7dd3fc",
      "stroke-width": 1.6,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }));
  }

  if (cutThreshold !== null && cutThreshold !== undefined) {
    const y = scaleY(cutThreshold);
    svg.append(svgNode("line", {
      x1: 24,
      y1: y,
      x2: 396,
      y2: y,
      stroke: "#f59e0b",
      "stroke-width": 2,
      "stroke-dasharray": "6 4"
    }));
  }
}

// ================= BAR CHART =================
export function renderBars(svg, values) {
  svgClear(svg);
  if (!values || !values.length) return;

  const max = Math.max(...values);

  values.forEach((v, i) => {
    const height = (v / max) * 150;
    const x = 50 + i * 60;
    const y = 210 - height;

    svg.append(svgNode("rect", {
      x, y, width: 40, height, rx: 8,
      fill: chartColors[i % chartColors.length]
    }));

    const label = svgNode("text", {
      x: x + 20, y: 230,
      "text-anchor": "middle",
      fill: "#ccc", "font-size": "12"
    });
    label.textContent = `C${i + 1} (${v})`;
    svg.append(label);
  });
}

// ================= DBSCAN HEATMAP (bonus) =================
export function renderDbscanHeatmap(svg, rows, labels) {
  svgClear(svg);
  if (!rows?.length || !labels?.length) return;

  const W = 360, H = 220;
  const GRID = 18;
  const cols = Math.ceil(W / GRID);
  const rows_g = Math.ceil(H / GRID);

  const xs = rows.map(r => Number(r[0] ?? r.income ?? 0));
  const ys = rows.map(r => Number(r[1] ?? r.spending ?? 0));
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // Tạo grid density
  const density = Array.from({ length: rows_g }, () => new Array(cols).fill(0));

  rows.forEach((row, i) => {
    if (labels[i] === -1) return; // bỏ qua noise
    const gx = Math.min(cols - 1, Math.floor(((Number(row[0] ?? row.income ?? 0)) - minX) / (maxX - minX || 1) * cols));
    const gy = Math.min(rows_g - 1, Math.floor(((maxY - Number(row[1] ?? row.spending ?? 0))) / (maxY - minY || 1) * rows_g));
    density[gy][gx]++;
  });

  const maxD = Math.max(...density.flat(), 1);

  density.forEach((row_arr, gy) => {
    row_arr.forEach((d, gx) => {
      if (d === 0) return;
      const alpha = (d / maxD) * 0.85 + 0.1;
      svg.append(svgNode("rect", {
        x: gx * GRID, y: gy * GRID,
        width: GRID, height: GRID,
        fill: `rgba(45,212,191,${alpha.toFixed(2)})`,
        rx: 2
      }));
    });
  });

  // Noise overlay
  rows.forEach((row, i) => {
    if (labels[i] !== -1) return;
    const x = ((Number(row[0] ?? row.income ?? 0)) - minX) / (maxX - minX || 1) * W;
    const y = (maxY - Number(row[1] ?? row.spending ?? 0)) / (maxY - minY || 1) * H;
    svg.append(svgNode("circle", { cx: x, cy: y, r: 3, fill: "#fb7185", opacity: 0.8 }));
  });
}
