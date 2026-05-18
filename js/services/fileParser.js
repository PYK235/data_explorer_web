/**
 * Detect which header maps to which field, handling:
 *   - Mall_Customers:   CustomerID | Annual Income (k$) | Spending Score (1-100)
 *   - Shopping_Mall:    Customer ID (UUID) | Annual Income | Spending Score
 *   - Generic datasets: any header containing "income" / "spend"
 */
function detectColumnMap(headers) {
  const map = { id: -1, customer: -1, gender: -1, age: -1, income: -1, spending: -1 };

  headers.forEach((header, i) => {
    const h = header.toLowerCase().trim();
    // ID / customer identifier
    if (h === "customerid" || h === "customer id" || h === "id") {
      map.id = i;
    } else if (h.includes("customer")) {
      map.customer = i;
    }
    // Gender
    if (h.includes("gender")) map.gender = i;
    // Age
    if (h.includes("age")) map.age = i;
    // Income — match "annual income", "income (k$)", "annual income (k$)", etc.
    if (h.includes("income")) map.income = i;
    // Spending — match "spending score", "spending score (1-100)", "spending", etc.
    if (h.includes("spend") || h.includes("score")) map.spending = i;
  });

  return map;
}

/**
 * Auto-detect income scale and normalize to k$ (0–200 range).
 * If max income > 1000, assume raw dollar values → divide by 1000.
 */
function normalizeIncome(rawValues) {
  const nums = rawValues.map(Number).filter((v) => !isNaN(v) && v > 0);
  if (!nums.length) return rawValues;
  const max = Math.max(...nums);
  const needsScale = max > 1000; // raw dollars vs k$
  return rawValues.map((v) => {
    const n = Number(v);
    if (isNaN(n)) return 0;
    return needsScale ? Math.round(n / 1000) : n;
  });
}

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((cell) => cell.trim());
  const colMap = detectColumnMap(headers);
  const dataLines = lines.slice(1);

  // Pre-read raw income values for scale detection
  const rawIncomes = dataLines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    return colMap.income >= 0 ? cells[colMap.income] ?? "0" : "0";
  });
  const normalizedIncomes = normalizeIncome(rawIncomes);

  return dataLines.map((line, index) => {
    const cells = line.split(",").map((cell) => cell.trim());

    // Build base row — use numeric ID when Customer ID is a UUID or string
    const rawId = colMap.id >= 0 ? cells[colMap.id] : null;
    const numericId = rawId && !isNaN(Number(rawId)) ? Number(rawId) : 101 + index;
    const defaultLabel = `#${numericId}`;

    const row = {
      id: numericId,
      customer: colMap.customer >= 0
        ? (cells[colMap.customer] || defaultLabel)
        : (rawId || defaultLabel),
    };

    // Map remaining fields
    if (colMap.gender >= 0) {
      row.gender = cells[colMap.gender] || (index % 2 === 0 ? "Female" : "Male");
    }
    if (colMap.age >= 0) {
      row.age = Number(cells[colMap.age]) || 20 + index;
    }
    // Income: use the pre-normalized value (already converted to k$ scale)
    row.income = normalizedIncomes[index] || 20 + index * 4;
    // Spending Score: always 1–100, no scaling needed
    if (colMap.spending >= 0) {
      row.spending = Number(cells[colMap.spending]) || 30 + (index % 6) * 10;
    }

    // Fallback defaults for missing fields
    row.gender  = row.gender  || (index % 2 === 0 ? "Female" : "Male");
    row.age     = row.age     || 20 + index;
    row.income  = row.income  || 20 + index * 4;
    row.spending = row.spending || 30 + (index % 6) * 10;

    return row;
  });
}

export function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseCsv(String(reader.result)));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}