export function parseCsv(text){
  const lines=text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if(lines.length<2){
    return [];
  }

  const headers=lines[0]
    .split(",")
    .map(cell=>cell.trim());

  return lines
    .slice(1)
    .map((line,index)=>{

      const cells=line
        .split(",")
        .map(cell=>cell.trim());

      const row={
        id:101+index
      };

      headers.forEach((header,headerIndex)=>{
        const normalized=
          header.toLowerCase();
        const value=
          cells[headerIndex] ?? "";
        if(
          normalized.includes("customer")
        ){
          row.customer=value;
        }
        else if(
          normalized.includes("gender")
          ||
          normalized.includes("genre")
        ){
          row.gender=value;
        }
        else if(
          normalized.includes("age")
        ){
          row.age=Number(value);
        }
        else if(
          normalized.includes("income")
        ){
          row.income=Number(value);
        }
        else if(
          normalized.includes("spending")
        ){
          row.spending=Number(value);
        }
      });
      return row;
    });
}
export function readCsvFile(file){
  return new Promise((resolve,reject)=>{
    const reader=
      new FileReader();
    reader.onload=()=>{
      try{
        resolve(
          parseCsv(
            String(
              reader.result
            )
          )
        );
      }
      catch(error){
        reject(error);
      }
    };
    reader.onerror=reject;
    reader.readAsText(file);
  });
}