export function renderTable(state, els) {
  const rows = state.filteredRows;
  const columns = rows.length ? Object.keys(rows[0]) : ["empty"];
  const thead = `
    <thead>
      <tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr>
    </thead>
  `;
  const tbody = `
    <tbody>
      ${rows.map((row) => `<tr>${columns.map((column) => `<td>${row[column] ?? ""}</td>`).join("")}</tr>`).join("")}
    </tbody>
  `;

  els.dataTable.innerHTML = thead + tbody;
  els.rowCount.textContent = String(rows.length);
  els.columnCount.textContent = String(columns.length);
  els.datasetName.textContent = state.datasetName;
  els.fileNameLabel.textContent = state.datasetName;
  els.fileStatusLabel.textContent = state.fileStatus;
  els.tableTag.textContent = `${rows.length} dong hien thi`;
}
