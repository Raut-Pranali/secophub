// utils/exportVulns.js
// Pure frontend export helpers — no backend calls needed.
// Exports whatever array of vulnerabilities is passed in (e.g. the currently filtered list).

function formatDateForExport(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ============================================
// CSV EXPORT
// ============================================
export function exportToCSV(vulns, filename = "vulnerabilities") {
  const headers = ["ID", "Title", "Description", "Severity", "Status", "Created", "Created By"];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    // Wrap in quotes if it contains comma, quote, or newline; escape internal quotes
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = vulns.map(v => [
    v.ID || "",
    v.title || "",
    v.description || "",
    v.severity || "",
    v.status || "Open",
    formatDateForExport(v.createdAt),
    v.createdBy || "",
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(escapeCSV).join(","))
    .join("\n");

  // Prepend BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// PDF EXPORT
// ============================================
export async function exportToPDF(vulns, filename = "vulnerabilities") {
  const { jsPDF } = await import("jspdf");
  const autoTable  = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("SecOpHub — Vulnerability Report", 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 58);
  doc.text(`Total entries: ${vulns.length}`, 40, 72);

  const severityColor = (sev) => {
    switch (sev) {
      case "Critical": return [239, 68, 68];
      case "High":      return [245, 158, 11];
      case "Medium":    return [59, 130, 246];
      case "Low":       return [34, 197, 94];
      default:          return [107, 114, 128];
    }
  };

  const body = vulns.map(v => [
    (v.ID || "").replace("VULN-", ""),
    v.title || "",
    v.severity || "",
    v.status || "Open",
    formatDateForExport(v.createdAt),
  ]);

  autoTable(doc, {
    startY: 90,
    head: [["ID", "Title", "Severity", "Status", "Created"]],
    body,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 90 },
      2: { cellWidth: 70 },
      3: { cellWidth: 80 },
      4: { cellWidth: 120 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const [r, g, b] = severityColor(data.cell.raw);
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.save(`${filename}-${new Date().toISOString().split("T")[0]}.pdf`);
}