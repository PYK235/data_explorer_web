function svgClear(svg) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function showTooltip(tooltipEl, event, row) {
  if (!tooltipEl) return;
  tooltipEl.hidden = false;
  tooltipEl.innerHTML = `
    <strong>Khách: ${row.customer ?? `#${row.id}`}</strong>
    <span>Income: ${row.income}</span>
    <span>Spending: ${row.spending}</span>
    <span>Nhóm: ${row.clusterName}</span>
  `;

  const bounds = tooltipEl.parentElement.getBoundingClientRect();
  const x = event.clientX - bounds.left + 12;
  const y = event.clientY - bounds.top + 12;
  tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
}

function hideTooltip(tooltipEl) {
  if (!tooltipEl) return;
  tooltipEl.hidden = true;
}

export function renderScatter(svg, rows, tooltipEl = null) {
  svgClear(svg);
  const axisColor = "rgba(255,255,255,0.28)";
  svg.append(svgNode("line", { x1: 40, y1: 220, x2: 390, y2: 220, stroke: axisColor }));
  svg.append(svgNode("line", { x1: 40, y1: 220, x2: 40, y2: 30, stroke: axisColor }));

  const xLabel = svgNode("text", {
    x: 335,
    y: 248,
    fill: "#9db1d1",
    "font-size": "12"
  });
  xLabel.textContent = "Income";
  svg.append(xLabel);

  const yLabel = svgNode("text", {
    x: 10,
    y: 36,
    fill: "#9db1d1",
    "font-size": "12"
  });
  yLabel.textContent = "Spending";
  svg.append(yLabel);

  rows.forEach((row) => {
    const x = 50 + Number(row.income) * 4.1;
    const y = 225 - Number(row.spending) * 1.8;
    const circle = svgNode("circle", {
      cx: x,
      cy: y,
      r: row.clusterLabel === -1 ? 6.8 : 6,
      fill: row.clusterColor,
      stroke: row.clusterLabel === -1 ? "#ffffff" : "#09111f",
      "stroke-width": row.clusterLabel === -1 ? 2.4 : 2
    });

    if (tooltipEl) {
      circle.addEventListener("mouseenter", (event) => showTooltip(tooltipEl, event, row));
      circle.addEventListener("mousemove", (event) => showTooltip(tooltipEl, event, row));
      circle.addEventListener("mouseleave", () => hideTooltip(tooltipEl));
    }

    svg.append(circle);
  });
}

export function renderBars(svg, stats) {
  svgClear(svg);
  const max = Math.max(...stats.map((item) => item.percent), 1);

  stats.forEach((item, index) => {
    const width = 46;
    const gap = 18;
    const height = (item.percent / max) * 150;
    const x = 35 + index * (width + gap);
    const y = 210 - height;

    svg.append(svgNode("rect", {
      x,
      y,
      width,
      height,
      rx: 12,
      fill: item.color
    }));

    const percentLabel = svgNode("text", {
      x: x + 23,
      y: y - 8,
      "text-anchor": "middle",
      fill: "#f2f6ff",
      "font-size": "12"
    });
    percentLabel.textContent = `${item.percent}%`;
    svg.append(percentLabel);

    const nameLabel = svgNode("text", {
      x: x + 23,
      y: 232,
      "text-anchor": "middle",
      fill: "#9db1d1",
      "font-size": "10"
    });
    nameLabel.textContent = item.name === "Tiềm năng" ? "Tiềm năng" : item.name;
    svg.append(nameLabel);
  });
}

export function renderClusterNameList(container, clusterMap) {
  container.innerHTML = clusterMap.map((item) => `
    <div class="cluster-item">
      <span class="cluster-dot" style="background:${item.color}"></span>
      <div>
        <strong>Cluster ${item.label} → ${item.name}</strong>
        <p>${item.reason}</p>
      </div>
    </div>
  `).join("");
}

export function renderDashboardStats(container, stats) {
  container.innerHTML = stats.map((item) => `
    <div class="stats-row">
      <div class="stats-name">
        <span class="cluster-dot" style="background:${item.color}"></span>
        <span>${item.name}</span>
      </div>
      <strong>${item.percent}%</strong>
    </div>
  `).join("");
}
