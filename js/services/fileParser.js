export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((cell) => cell.trim());
  return lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const row = { id: index + 1 };

    headers.forEach((header, headerIndex) => {
      const normalized = header.toLowerCase();
      const value = cells[headerIndex] ?? "";

      if (normalized.includes("gender")) row.gender = value || "Unknown";
      else if (normalized.includes("age")) row.age = Number(value) || value;
      else if (normalized.includes("income")) row.income = Number(value) || value;
      else if (normalized.includes("spending")) row.spending = Number(value) || value;
      else row[header] = value;
    });

    row.segment = row.segment || "Imported";
    row.gender = row.gender || (index % 2 === 0 ? "Female" : "Male");
    row.age = row.age || 20 + index;
    row.income = row.income || 20 + index * 4;
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
