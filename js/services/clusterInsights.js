import { chartColors, customerGroupOrder } from "../data/mockData.js";

/**
 * Compute dynamic thresholds from the actual dataset instead of hardcoding k$ values.
 * Called once after rows are loaded; result stored and reused.
 */
let _thresholds = null;

export function calibrateThresholds(rows) {
  if (!rows || rows.length === 0) {
    _thresholds = null;
    return;
  }
  const incomes  = rows.map((r) => Number(r.income)).filter((v) => !isNaN(v) && v > 0);
  const spendings = rows.map((r) => Number(r.spending)).filter((v) => !isNaN(v) && v > 0);

  const pct = (arr, p) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * p)];
  };

  _thresholds = {
    incomeHigh:    pct(incomes,   0.65),   // top-35% income → high
    incomeLow:     pct(incomes,   0.35),   // bottom-35% income → low
    spendingHigh:  pct(spendings, 0.65),   // top-35% spending → high
    spendingLow:   pct(spendings, 0.35),   // bottom-35% spending → low
    incomeOutlier: pct(incomes,   0.95),   // top-5% income → dbscan outlier candidate
    spendingFloor: pct(spendings, 0.05),   // bottom-5% spending → dbscan outlier candidate
  };
}

function getThresholds(rows) {
  // Auto-calibrate on first call or if thresholds are not set
  if (!_thresholds && rows && rows.length) calibrateThresholds(rows);
  // Absolute fallback — assumes k$ scale (original Mall_Customers dataset)
  return _thresholds || {
    incomeHigh:    75,
    incomeLow:     40,
    spendingHigh:  60,
    spendingLow:   40,
    incomeOutlier: 110,
    spendingFloor: 12,
  };
}

function getBaseGroup(income, spending, t) {
  if (income >= t.incomeHigh && spending >= t.spendingHigh) {
    return { label: 0, name: "VIP" };
  }
  if (income >= t.incomeHigh && spending < t.spendingHigh) {
    return { label: 1, name: "Tiềm năng" };
  }
  if (income <= t.incomeLow && spending <= t.spendingLow) {
    return { label: 3, name: "Tiết kiệm" };
  }
  return { label: 2, name: "Bình thường" };
}

export function inferCustomerGroup(income, spending, algorithm = "kmeans", rows = null) {
  const safeIncome   = Number(income);
  const safeSpending = Number(spending);
  const t = getThresholds(rows);

  if (algorithm === "dbscan" && (safeIncome >= t.incomeOutlier || safeSpending <= t.spendingFloor)) {
    return {
      label: -1,
      name: "Bất thường",
      color: chartColors["Bất thường"],
      reason: "Khách có hành vi khác biệt rõ so với phần lớn dữ liệu.",
    };
  }

  const base = getBaseGroup(safeIncome, safeSpending, t);
  return {
    ...base,
    color: chartColors[base.name],
    reason: buildReason(base.name),
  };
}

function buildReason(name) {
  switch (name) {
    case "VIP":        return "Thu nhập cao và mức chi tiêu cao.";
    case "Tiềm năng":  return "Thu nhập cao nhưng chi tiêu còn thấp, phù hợp để kích hoạt mua sắm.";
    case "Tiết kiệm":  return "Thu nhập thấp và chi tiêu thấp.";
    case "Bất thường": return "Khách có hành vi chi tiêu hoặc thu nhập quá lệch so với trung bình.";
    default:           return "Khách có hành vi ổn định, thuộc nhóm trung bình.";
  }
}

export function attachClusterInsights(rows, algorithm = "kmeans") {
  // Calibrate thresholds from the actual rows being processed
  calibrateThresholds(rows);
  return rows.map((row) => {
    const cluster = inferCustomerGroup(row.income, row.spending, algorithm, rows);
    return {
      ...row,
      clusterLabel:  cluster.label,
      clusterName:   cluster.name,
      clusterColor:  cluster.color,
      clusterReason: cluster.reason,
    };
  });
}

export function buildDashboardStats(rows) {
  const total = rows.length || 1;
  return customerGroupOrder.map((name) => {
    const count = rows.filter((row) => row.clusterName === name).length;
    return {
      name,
      count,
      percent: Math.round((count / total) * 100),
      color: chartColors[name],
    };
  });
}

export function buildClusterNameMap(rows) {
  const seen = new Map();
  rows.forEach((row) => {
    if (!seen.has(row.clusterLabel)) {
      seen.set(row.clusterLabel, {
        label:  row.clusterLabel,
        name:   row.clusterName,
        color:  row.clusterColor,
        reason: row.clusterReason,
      });
    }
  });
  return [...seen.values()].sort((a, b) => a.label - b.label);
}

export function buildPredictMessage(result) {
  return `Khách này thuộc nhóm: ${result.clusterName}`;
}