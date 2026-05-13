export function exportClusteredExcel(rows) {
  if (!rows || rows.length === 0) {
    return;
  }

 const exportRows = rows.map((row) => {
  const {
    clusterLabel,
    clusterColor,
    ...cleanRow
  } = row;

  return {
    ID: cleanRow.id,
    Gender: cleanRow.gender,
    Age: cleanRow.age,
    Income: cleanRow.income,
    Spending: cleanRow.spending,
    Cluster: row.clusterName,
    Insight: row.clusterReason
  };
});

  const worksheet =
    XLSX.utils.json_to_sheet(exportRows);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Clustered Customers"
  );

  XLSX.writeFile(
    workbook,
    "clustered_customers.xlsx"
  );
}