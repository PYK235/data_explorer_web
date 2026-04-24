import { renderTable } from "../renderers/tableRenderer.js";

export function applyFilter(state, els) {
  const allRows = [...state.rows];

  switch (state.filter) {
    case "female":
      state.filteredRows = allRows.filter((row) => row.gender === "Female");
      break;
    case "male":
      state.filteredRows = allRows.filter((row) => row.gender === "Male");
      break;
    case "high-income":
      state.filteredRows = allRows.filter((row) => Number(row.income) >= 50);
      break;
    default:
      state.filteredRows = allRows;
      break;
  }

  renderTable(state, els);
}
