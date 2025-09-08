import * as XLSX from 'xlsx';

const convertToXLSX = (data: any[], headers: { key: string; label: string }[], sheetName: string = 'Sheet1') => {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers.map(h => h.key) });
  
  // Apply header labels
  XLSX.utils.sheet_add_aoa(ws, [headers.map(h => h.label)], { origin: "A1" });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
};

export const downloadXLSX = (data: any[], headers: { key: string; label: string }[], filename: string, sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) {
    console.error("No data to export.");
    return;
  }
  const workbook = convertToXLSX(data, headers, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};