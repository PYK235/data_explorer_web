function svgClear(svg) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

  Object.entries(attrs).forEach(
    ([key, value]) =>
      node.setAttribute(key, value)
  );

  return node;
}

function showTooltip(
  tooltipEl,
  event,
  row
) {
  if (!tooltipEl) return;

  tooltipEl.hidden = false;

  tooltipEl.innerHTML = `
    <strong>
      Khách:
      ${row.customer ?? `#${row.id}`}
    </strong>

    <span>
      Income: ${row.income}
    </span>

    <span>
      Spending: ${row.spending}
    </span>

    <span>
      Nhóm: ${row.clusterName}
    </span>
  `;

  const bounds =
    tooltipEl.parentElement
      .getBoundingClientRect();

  const x =
    event.clientX -
    bounds.left +
    12;

  const y =
    event.clientY -
    bounds.top +
    12;

  tooltipEl.style.transform =
    `translate(${x}px, ${y}px)`;
}

function hideTooltip(tooltipEl) {
  if (!tooltipEl) return;

  tooltipEl.hidden = true;
}

export function renderScatter(
  svg,
  rows,
  tooltipEl = null,
  state = null
) {

  svgClear(svg);

  const axisColor =
    "rgba(255,255,255,0.28)";

  svg.append(
    svgNode("line", {
      x1: 40,
      y1: 220,
      x2: 390,
      y2: 220,
      stroke: axisColor
    })
  );

  svg.append(
    svgNode("line", {
      x1: 40,
      y1: 220,
      x2: 40,
      y2: 30,
      stroke: axisColor
    })
  );

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

    const x =
      50 + Number(row.income) * 4.1;

    const y =
      225 - Number(row.spending) * 1.8;

    const circle = svgNode("circle", {
      cx: x,
      cy: y,
      r:
        row.clusterLabel === -1
          ? 6.8
          : 6,

      fill: row.clusterColor,

      stroke:
        row.clusterLabel === -1
          ? "#ffffff"
          : "#09111f",

      "stroke-width":
        row.clusterLabel === -1
          ? 2.4
          : 2
    });

    if (tooltipEl) {

      circle.addEventListener(
        "mouseenter",
        (event) =>
          showTooltip(
            tooltipEl,
            event,
            row
          )
      );

      circle.addEventListener(
        "mousemove",
        (event) =>
          showTooltip(
            tooltipEl,
            event,
            row
          )
      );

      circle.addEventListener(
        "mouseleave",
        () =>
          hideTooltip(
            tooltipEl
          )
      );
    }

    svg.append(circle);
  });

  if (
    state &&
    state.algorithm === "kmeans" &&
    Array.isArray(state.centroids)
  ) {

    state.centroids.forEach(
      (centroid) => {

        const x =
          50 +
          Number(centroid[0]) * 4.1;

        const y =
          225 -
          Number(centroid[1]) * 1.8;

        const glow = svgNode(
          "circle",
          {
            cx: x,
            cy: y,
            r: 12,
            fill:
              "rgba(255,77,109,0.18)"
          }
        );

        svg.append(glow);

        const centroidCircle =
          svgNode("circle", {
            cx: x,
            cy: y,
            r: 9,
            fill: "#ffffff",
            stroke: "#ff4d6d",
            "stroke-width": 4
          });

        svg.append(
          centroidCircle
        );

        const centroidText =
          svgNode("text", {
            x,
            y: y + 4,
            "text-anchor":
              "middle",

            fill: "#ff4d6d",

            "font-size": "10",

            "font-weight":
              "bold"
          });

        centroidText.textContent =
          "X";

        svg.append(
          centroidText
        );
      }
    );
  }
}



const dendrogramColorMap = {
  C0: "#60a5fa",
  C1: "#0ea5e9",
  C2: "#22c55e",
  C3: "#facc15",
  C4: "#fb7185",
  C5: "#a855f7",
  C6: "#f97316",
  C7: "#2dd4bf",
  C8: "#e879f9",
  C9: "#38bdf8"
};

function normalizeDendrogramColor(color) {
  if (!color) return "#60a5fa";
  if (dendrogramColorMap[color]) return dendrogramColorMap[color];
  if (/^C\d$/.test(color)) return dendrogramColorMap[color] || "#60a5fa";
  return color;
}

export function renderDendrogram(svg, dendrogram, cutThreshold, distanceRange, leafColors = []) {
  svgClear(svg);
  const width = 420;
  const height = 260;
  const margin = 36;

  if (!dendrogram || !Array.isArray(dendrogram.icoord) || dendrogram.icoord.length === 0) {
    const message = svgNode("text", {
      x: width / 2,
      y: height / 2,
      fill: "#9db1d1",
      "font-size": "14",
      "text-anchor": "middle"
    });
    message.textContent = "Chọn Hierarchical để xem dendrogram";
    svg.append(message);
    return;
  }

  const allX = dendrogram.icoord.flat();
  const allY = dendrogram.dcoord.flat();
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = 0;
  const maxY = Math.max(...allY, cutThreshold ?? 0, ...(distanceRange ?? [0, 0]));

  const xScale = (value) => {
    if (maxX === minX) return width / 2;
    return margin + ((value - minX) / (maxX - minX)) * (width - margin * 2);
  };

  const yScale = (value) => {
    if (maxY === minY) return height - margin;
    return height - margin - ((value - minY) / (maxY - minY)) * (height - margin * 2);
  };

  svg.append(svgNode("line", {
    x1: margin,
    y1: margin,
    x2: margin,
    y2: height - margin,
    stroke: "rgba(255,255,255,0.16)",
    "stroke-width": "1"
  }));

  svg.append(svgNode("line", {
    x1: margin,
    y1: height - margin,
    x2: width - margin,
    y2: height - margin,
    stroke: "rgba(255,255,255,0.16)",
    "stroke-width": "1"
  }));

  dendrogram.icoord.forEach((xCoords, idx) => {
    const yCoords = dendrogram.dcoord[idx] || [];
    const path = xCoords
      .map((x, index) => `${xScale(x)} ${yScale(yCoords[index] ?? 0)}`)
      .join(" ");
    svg.append(svgNode("polyline", {
      points: path,
      fill: "none",
      stroke: normalizeDendrogramColor(dendrogram.color_list?.[idx]),
      "stroke-width": "2"
    }));
  });

  // Vẽ điểm lá để thể hiện cluster theo thứ tự leaves
  const leafXPositions = [...new Set(allX.filter((x, index) => {
    return dendrogram.dcoord.some((yCoords) => yCoords[index] === 0);
  }))].sort((a, b) => a - b);

  leafXPositions.forEach((xValue, i) => {
    const x = xScale(xValue);
    const color = leafColors[i] || "#fff";
    svg.append(svgNode("circle", {
      cx: x,
      cy: height - margin + 10,
      r: 5,
      fill: color,
      stroke: "#0f172a",
      "stroke-width": "1.5"
    }));
  });

  if (cutThreshold != null) {
    const cutY = yScale(cutThreshold);
    svg.append(svgNode("line", {
      x1: margin,
      y1: cutY,
      x2: width - margin,
      y2: cutY,
      stroke: "#f97316",
      "stroke-width": "2",
      "stroke-dasharray": "8 6"
    }));
  }

  const title = svgNode("text", {
    x: margin,
    y: margin - 10,
    fill: "#9db1d1",
    "font-size": "12"
  });
  title.textContent = "Dendrogram";
  svg.append(title);
}

export function renderBars(svg, stats) {
  svgClear(svg);

  const max = Math.max(
    ...stats.map(
      (item) => item.percent
    ),
    1
  );

  stats.forEach(
    (item, index) => {

      const width = 46;
      const gap = 18;

      const height =
        (item.percent / max) * 150;

      const x =
        35 +
        index * (width + gap);

      const y =
        210 - height;

      svg.append(
        svgNode("rect", {
          x,
          y,
          width,
          height,
          rx: 12,
          fill: item.color
        })
      );

      const percentLabel =
        svgNode("text", {
          x: x + 23,
          y: y - 8,

          "text-anchor":
            "middle",

          fill: "#f2f6ff",

          "font-size": "12"
        });

      percentLabel.textContent =
        `${item.percent}%`;

      svg.append(
        percentLabel
      );

      const nameLabel =
        svgNode("text", {
          x: x + 23,
          y: 232,

          "text-anchor":
            "middle",

          fill: "#9db1d1",

          "font-size": "10"
        });

      nameLabel.textContent =
        item.name === "Tiềm năng"
          ? "Tiềm năng"
          : item.name;

      svg.append(nameLabel);
    }
  );
}

export function renderClusterNameList(
  container,
  clusterMap
) {

  container.innerHTML =
    clusterMap.map(
      (item) => `
      <div class="cluster-item">

        <span
          class="cluster-dot"
          style="
            background:${item.color}
          "
        ></span>

        <div>

          <strong>
            Cluster ${item.label}
            →
            ${item.name}
          </strong>

          <p>
            ${item.reason}
          </p>

        </div>

      </div>
    `
    ).join("");
}

export function renderDashboardStats(
  container,
  stats
) {

  container.innerHTML =
    stats.map(
      (item) => `
      <div class="stats-row">

        <div class="stats-name">

          <span
            class="cluster-dot"
            style="
              background:${item.color}
            "
          ></span>

          <span>
            ${item.name}
          </span>

        </div>

        <strong>
          ${item.percent}%
        </strong>

      </div>
    `
    ).join("");
}