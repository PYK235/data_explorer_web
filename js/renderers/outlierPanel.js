import { fetchOutlierAnalysis } from "../services/api.js";

const PANEL_ID = "outlierInsightPanel";

const SEVERITY_META = {
  critical: { color: "#fb7185", bg: "rgba(251,113,133,0.12)", label: "Cực kỳ bất thường" },
  high:     { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  label: "Bất thường cao" },
  medium:   { color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  label: "Hơi bất thường" },
  low:      { color: "#9db1d1", bg: "rgba(157,177,209,0.08)", label: "Vùng thưa" },
};

export async function renderOutlierPanel(payload) {
  destroyOutlierPanel();

  // Kiểm tra payload hợp lệ trước khi gọi API
  if (!payload?.data?.length || !payload?.labels?.length) {
    console.warn("outlierPanel: payload thiếu data hoặc labels", payload);
    return;
  }

  // Lọc chỉ lấy 2 cột số đầu tiên, đảm bảo là number
  const cleanData = payload.data.map(row => {
    if (Array.isArray(row)) {
      return [Number(row[0]) || 0, Number(row[1]) || 0];
    }
    const vals = Object.values(row).filter(v => !isNaN(Number(v)));
    return [Number(vals[0]) || 0, Number(vals[1]) || 0];
  });

  const cleanLabels = payload.labels.map(l => Number(l));
  const colNames = payload.col_names || ["income", "spending"];

  const panel = _createPanel();
  panel.innerHTML = _skeletonHTML();

  const res = await fetchOutlierAnalysis({
    data: cleanData,
    labels: cleanLabels,
    col_names: colNames,
  });

  if (!res.ok) {
    panel.innerHTML = _errorHTML(res.message);
    return;
  }

  panel.innerHTML = _buildPanelHTML(res.result);
  _attachToggleEvents(panel);
}

export function destroyOutlierPanel() {
  document.getElementById(PANEL_ID)?.remove();
}

function _createPanel() {
  const anchor = document.getElementById("compare") || document.querySelector(".compare-panel");
  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.className = "panel outlier-panel";
  panel.style.cssText = `
    margin-top: 24px;
    border-radius: 26px;
    padding: 28px;
    backdrop-filter: blur(18px);
    background: rgba(10,18,32,0.78);
    border: 1px solid rgba(251,113,133,0.22);
    box-shadow: 0 20px 50px rgba(0,0,0,0.28);
    animation: slideIn 0.35s ease;
  `;

  if (!document.getElementById("outlier-keyframes")) {
    const style = document.createElement("style");
    style.id = "outlier-keyframes";
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%,100% { opacity: 0.6; }
        50%      { opacity: 1; }
      }
      .outlier-card-detail { display: none; }
      .outlier-card.open .outlier-card-detail { display: block; }
      .outlier-card { cursor: pointer; transition: box-shadow 160ms; }
      .outlier-card:hover { box-shadow: 0 0 0 1px rgba(255,255,255,0.12); }
    `;
    document.head.appendChild(style);
  }

  if (anchor) {
    anchor.insertAdjacentElement("afterend", panel);
  } else {
    document.querySelector(".content")?.appendChild(panel);
  }

  return panel;
}

function _skeletonHTML() {
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <div style="width:200px;height:22px;border-radius:8px;background:rgba(255,255,255,0.07);animation:pulse 1.4s infinite;"></div>
    </div>
    ${Array(3).fill(`<div style="height:72px;border-radius:16px;background:rgba(255,255,255,0.04);margin-bottom:12px;animation:pulse 1.4s infinite;"></div>`).join("")}
  `;
}

function _errorHTML(msg) {
  return `
    <div style="color:#fb7185;padding:16px;border-radius:16px;background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);">
      Không thể tải phân tích outlier: ${msg || "lỗi không xác định"}
    </div>
  `;
}

function _buildPanelHTML(result) {
  const { n_total, n_noise, noise_pct, n_clusters, col_means, col_stds,
          outlier_details, summary_insights } = result;
  const colKeys = Object.keys(col_means);

  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;">
      <div>
        <p style="margin:0;color:#fb7185;text-transform:uppercase;letter-spacing:0.16em;font-size:0.74rem;font-weight:600;">
          TV3 — DBSCAN Outlier Analysis
        </p>
        <h3 style="margin:8px 0 0;font-family:'Space Grotesk',sans-serif;font-size:1.4rem;">
          Phân tích khách hàng bất thường
        </h3>
      </div>
      <button onclick="document.getElementById('${PANEL_ID}').remove()"
        style="border:1px solid rgba(255,255,255,0.1);background:transparent;color:#9db1d1;
               padding:8px 14px;border-radius:12px;cursor:pointer;font-size:0.85rem;">
        Đóng ✕
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:24px;">
      ${_statCard("Tổng khách", n_total, "#60a5fa")}
      ${_statCard("Khách bất thường", n_noise, "#fb7185")}
      ${_statCard("Tỉ lệ noise", noise_pct + "%", "#fbbf24")}
      ${_statCard("Cụm bình thường", n_clusters, "#2dd4bf")}
    </div>

    <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;margin-bottom:28px;align-items:center;">
      ${_donutSVG(noise_pct)}
      <div>
        <p style="margin:0 0 12px;font-weight:600;color:#f2f6ff;">Nhận xét tổng quan</p>
        ${summary_insights.map(s => `
          <div style="display:flex;gap:10px;margin-bottom:10px;padding:12px 14px;
                      border-radius:14px;background:rgba(255,255,255,0.03);
                      border-left:3px solid #fb7185;">
            <span style="color:#fb7185;flex-shrink:0;">→</span>
            <span style="color:#d1dff5;font-size:0.93rem;line-height:1.5;">${s}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <div style="margin-bottom:24px;padding:16px;border-radius:16px;
                background:rgba(45,212,191,0.06);border:1px solid rgba(45,212,191,0.15);">
      <p style="margin:0 0 12px;font-size:0.82rem;color:#2dd4bf;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
        Ngưỡng tham chiếu (trung bình nhóm bình thường)
      </p>
      <div style="display:flex;gap:24px;flex-wrap:wrap;">
        ${colKeys.map(k => `
          <div>
            <span style="color:#9db1d1;font-size:0.8rem;">${k}</span><br>
            <strong style="color:#f2f6ff;">TB: ${col_means[k]}</strong>
            <span style="color:#9db1d1;font-size:0.8rem;"> ± ${col_stds[k]}</span>
          </div>
        `).join("")}
      </div>
    </div>

    <div>
      <p style="margin:0 0 14px;font-weight:600;color:#f2f6ff;">
        Chi tiết ${n_noise} khách bất thường
        <span style="color:#9db1d1;font-size:0.82rem;font-weight:400;margin-left:8px;">(bấm để xem lý do)</span>
      </p>
      ${n_noise === 0
        ? `<div style="padding:24px;text-align:center;color:#9db1d1;border-radius:16px;background:rgba(255,255,255,0.03);">
             Không có outlier nào được phát hiện với tham số hiện tại.
           </div>`
        : outlier_details.map((od, i) => _outlierCard(od, i, colKeys)).join("")
      }
    </div>
  `;
}

function _statCard(label, value, color) {
  return `
    <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);">
      <span style="display:block;font-size:0.78rem;color:#9db1d1;">${label}</span>
      <strong style="display:block;margin-top:6px;font-size:1.5rem;color:${color};">${value}</strong>
    </div>
  `;
}

function _donutSVG(noisePct) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = (noisePct / 100) * circ;
  return `
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="#fb7185" stroke-width="12"
        stroke-dasharray="${filled.toFixed(1)} ${circ.toFixed(1)}"
        stroke-linecap="round" transform="rotate(-90 60 60)"/>
      <text x="60" y="56" text-anchor="middle"
        style="font-family:'Space Grotesk',sans-serif;font-size:18px;fill:#fb7185;font-weight:700;">
        ${noisePct}%
      </text>
      <text x="60" y="72" text-anchor="middle" style="font-size:10px;fill:#9db1d1;">noise</text>
    </svg>
  `;
}

function _outlierCard(od, index, colKeys) {
  const meta = SEVERITY_META[od.severity] || SEVERITY_META.low;
  const valStr = colKeys.map(k => `${k}: <strong>${od.values[k] ?? "?"}</strong>`).join(" · ");

  return `
    <div class="outlier-card" data-idx="${index}"
      style="margin-bottom:10px;border-radius:16px;padding:14px 16px;
             background:${meta.bg};border:1px solid ${meta.color}33;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${meta.color};flex-shrink:0;"></span>
          <span style="color:#f2f6ff;font-size:0.9rem;">Khách #${od.index + 1} — ${valStr}</span>
        </div>
        <span style="padding:4px 10px;border-radius:999px;background:${meta.color}22;
                     color:${meta.color};font-size:0.75rem;font-weight:600;white-space:nowrap;">
          ${meta.label}
        </span>
      </div>
      <div class="outlier-card-detail" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);">
        ${od.reasons.map(r => `
          <div style="display:flex;gap:8px;margin-bottom:6px;font-size:0.85rem;color:#d1dff5;">
            <span style="color:${meta.color};flex-shrink:0;">•</span>
            <span>${r}</span>
          </div>
        `).join("")}
        <div style="margin-top:10px;font-size:0.78rem;color:#9db1d1;">
          Mức độ bất thường: <strong style="color:${meta.color};">${od.severity_score.toFixed(1)}</strong> điểm
        </div>
      </div>
    </div>
  `;
}

function _attachToggleEvents(panel) {
  panel.querySelectorAll(".outlier-card").forEach(card => {
    card.addEventListener("click", () => card.classList.toggle("open"));
  });
}