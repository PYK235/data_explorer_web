import { chartColors, customerGroupOrder } from "../data/mockData.js";

function getBaseGroup(income, spending) {
  if (income >= 60 && spending >= 60) {
    return { label: 0, name: "VIP" };
  }

  if (income >= 55 && spending < 60) {
    return { label: 1, name: "Tiềm năng" };
  }

  if (income <= 40 && spending <= 40) {
    return { label: 3, name: "Tiết kiệm" };
  }

  return { label: 2, name: "Bình thường" };
}

export function inferCustomerGroup(income, spending, algorithm = "kmeans") {
  const safeIncome = Number(income);
  const safeSpending = Number(spending);

  if (algorithm === "dbscan" && (safeIncome >= 75 || safeSpending <= 12)) {
    return {
      label: -1,
      name: "Bất thường",
      color: chartColors["Bất thường"],
      reason: "Khách có hành vi khác biệt rõ so với phần lớn dữ liệu."
    };
  }

  const base = getBaseGroup(safeIncome, safeSpending);
  return {
    ...base,
    color: chartColors[base.name],
    reason: buildReason(base.name)
  };
}

function buildReason(name) {
  switch (name) {
    case "VIP":
      return "Thu nhập cao và mức chi tiêu cao.";
    case "Tiềm năng":
      return "Thu nhập cao nhưng chi tiêu còn thấp, phù hợp để kích hoạt mua sắm.";
    case "Tiết kiệm":
      return "Thu nhập thấp và chi tiêu thấp.";
    case "Bất thường":
      return "Khách có hành vi chi tiêu hoặc thu nhập quá lệch so với trung bình.";
    default:
      return "Khách có hành vi ổn định, thuộc nhóm trung bình.";
  }
}

export function attachClusterInsights(rows, algorithm = "kmeans") {
  return rows.map((row) => {
    const cluster = inferCustomerGroup(row.income, row.spending, algorithm);
    return {
      ...row,
      clusterLabel: cluster.label,
      clusterName: cluster.name,
      clusterColor: cluster.color,
      clusterReason: cluster.reason
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
      color: chartColors[name]
    };
  });
}

export function buildClusterNameMap(rows) {
  const seen = new Map();
  rows.forEach((row) => {
    if (!seen.has(row.clusterLabel)) {
      seen.set(row.clusterLabel, {
        label: row.clusterLabel,
        name: row.clusterName,
        color: row.clusterColor,
        reason: row.clusterReason
      });
    }
  });

  return [...seen.values()].sort((a, b) => a.label - b.label);
}

export function buildPredictMessage(result) {
  return `Khách này thuộc nhóm: ${result.clusterName}`;
}
