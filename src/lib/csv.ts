const convertToCSV = (data: any[], headers: { key: string; label: string }[]) => {
  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header.key];
      // Handle potential commas, quotes, and newlines in data
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // If the value contains a comma, a quote, or a newline, wrap it in double quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
};

export const downloadCSV = (data: any[], headers: { key: string; label: string }[], filename: string) => {
  if (!data || data.length === 0) {
    console.error("No data to export.");
    return;
  }
  const csvString = convertToCSV(data, headers);
  // Add BOM for UTF-8 support in Excel
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};