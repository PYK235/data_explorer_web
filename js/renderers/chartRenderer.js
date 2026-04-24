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

  // ===== SCALE =====
  const xs = rows.map(r => Number(r[0] ?? r.income ?? 0));
  const ys = rows.map(r => Number(r[1] ?? r.spending ?? 0));

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const scaleX = (v) =>
    50 + ((v - minX) / (maxX - minX || 1)) * 320;

  const scaleY = (v) =>
    220 - ((v - minY) / (maxY - minY || 1)) * 180;

  // ===== AXES =====
  const axisColor = "rgba(255,255,255,0.3)";
  svg.append(svgNode("line", { x1: 40, y1: 220, x2: 390, y2: 220, stroke: axisColor }));
  svg.append(svgNode("line", { x1: 40, y1: 220, x2: 40, y2: 30, stroke: axisColor }));

  // ===== POINTS =====
  rows.forEach((row, i) => {
    const x = scaleX(Number(row[0] ?? row.income ?? 0));
    const y = scaleY(Number(row[1] ?? row.spending ?? 0));

    let cluster = labels[i] ?? 0;

    // DBSCAN noise
    if (variant === "dbscan" && cluster === -1) {
      svg.append(svgNode("circle", {
        cx: x,
        cy: y,
        r: 6,
        fill: "#f8fafc",
        stroke: "#fb7185",
        "stroke-width": 2
      }));
      return;
    }

    const color = chartColors[cluster % chartColors.length];

    svg.append(svgNode("circle", {
      cx: x,
      cy: y,
      r: 5,
      fill: color,
      stroke: "#111",
      "stroke-width": 1.2,
      opacity: 0.9
    }));
  });

  // ===== CENTROIDS =====
  if (centroids && centroids.length) {
    centroids.forEach((c, i) => {
      const cx = scaleX(c[0]);
      const cy = scaleY(c[1]);

      // vòng tròn centroid
      svg.append(svgNode("circle", {
        cx,
        cy,
        r: 8,
        fill: "#ffffff",
        stroke: chartColors[i % chartColors.length],
        "stroke-width": 3
      }));

      // label centroid
      const text = svgNode("text", {
        x: cx,
        y: cy - 12,
        "text-anchor": "middle",
        fill: "#ffffff",
        "font-size": "10"
      });

      text.textContent = `C${i + 1}`;
      svg.append(text);
    });
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
      x,
      y,
      width: 40,
      height,
      rx: 8,
      fill: chartColors[i % chartColors.length]
    }));

    // label
    const label = svgNode("text", {
      x: x + 20,
      y: 230,
      "text-anchor": "middle",
      fill: "#ccc",
      "font-size": "12"
    });

    label.textContent = `C${i + 1} (${v})`;
    svg.append(label);
  });
}