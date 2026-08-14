import api from "@/api/apiClient";
import * as XLSX from "xlsx-js-style";

export interface SalesReport {
  kpis: { reservas: number; personas: number; subtotal: string; iva: string; total: string };
  series: { dia: string; reservas: number; personas: number; total: string }[];
}
export interface CommissionRow { compania: string; reservas: number; personas: number; subtotal: string; comision_pct: string; comision_monto: string; }
export interface OccupancyRow { actividad: string; horario: string; capacidad: number; reservado: number; ocupacion_pct: number; }
export interface ActivityRankRow { actividad: string; reservas: number; personas: number; ingresos: string; }
export interface StatusRow { status: string; reservas: number; personas: number; }
export interface TransportRow { chofer: string; traslados: number; personas: number; }
export interface GuideRow { guia: string; salidas: number; personas: number; }

type Range = { from: string; to: string };
const q = (r: Range) => ({ params: { from: r.from, to: r.to } });

export const fetchSalesReport = (r: Range) => api.get<SalesReport>("/api/reports/sales", q(r)).then((d) => d.data);
export const fetchCommissionsReport = (r: Range) => api.get<CommissionRow[]>("/api/reports/commissions", q(r)).then((d) => d.data);
export const fetchOccupancyReport = (r: Range) => api.get<OccupancyRow[]>("/api/reports/occupancy", q(r)).then((d) => d.data);
export const fetchActivitiesRanking = (r: Range) => api.get<ActivityRankRow[]>("/api/reports/activities-ranking", q(r)).then((d) => d.data);
export const fetchStatusReport = (r: Range) => api.get<StatusRow[]>("/api/reports/status", q(r)).then((d) => d.data);
export const fetchTransportReport = (r: Range) => api.get<TransportRow[]>("/api/reports/transport", q(r)).then((d) => d.data);
export const fetchGuidesReport = (r: Range) => api.get<GuideRow[]>("/api/reports/guides", q(r)).then((d) => d.data);

const BRAND = "0F766E";       // teal de la marca
const BRAND_DARK = "115E59";
const HEADER_TEXT = "FFFFFF";
const ROW_ALT = "F1F7F6";     // fila alterna suave
const BORDER = "D9E2EA";

const thinBorder = {
  top: { style: "thin", color: { rgb: BORDER } },
  bottom: { style: "thin", color: { rgb: BORDER } },
  left: { style: "thin", color: { rgb: BORDER } },
  right: { style: "thin", color: { rgb: BORDER } },
};

/**
 * Exporta filas a un .xlsx con diseño profesional: título, subtítulo con fecha,
 * encabezados en color de marca, autofiltro, anchos y formato de números.
 */
export function exportToExcel(
  rows: Record<string, unknown>[],
  sheetName: string,
  filename: string,
  title?: string
) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const nCols = Math.max(headers.length, 1);
  const lastCol = XLSX.utils.encode_col(nCols - 1);

  const TITLE_ROW = 0; // fila 1
  const SUB_ROW = 1;   // fila 2
  const HEAD_ROW = 2;  // fila 3
  const DATA_START = 3;

  const ws: XLSX.WorkSheet = {};

  // Título general (combinado)
  ws[XLSX.utils.encode_cell({ r: TITLE_ROW, c: 0 })] = {
    v: title || sheetName,
    t: "s",
    s: { font: { bold: true, sz: 15, color: { rgb: BRAND_DARK } }, alignment: { vertical: "center" } },
  };
  // Subtítulo con fecha de generación
  ws[XLSX.utils.encode_cell({ r: SUB_ROW, c: 0 })] = {
    v: `Generado el ${new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" })}`,
    t: "s",
    s: { font: { sz: 10, italic: true, color: { rgb: "667789" } } },
  };

  // Encabezados
  headers.forEach((h, c) => {
    ws[XLSX.utils.encode_cell({ r: HEAD_ROW, c })] = {
      v: h,
      t: "s",
      s: {
        font: { bold: true, color: { rgb: HEADER_TEXT }, sz: 11 },
        fill: { fgColor: { rgb: BRAND } },
        alignment: { horizontal: "left", vertical: "center" },
        border: thinBorder,
      },
    };
  });

  // Datos
  const colWidths = headers.map((h) => h.length + 2);
  rows.forEach((row, i) => {
    const r = DATA_START + i;
    const alt = i % 2 === 1;
    headers.forEach((h, c) => {
      const value = row[h];
      const isNum = typeof value === "number" && Number.isFinite(value);
      const cell: XLSX.CellObject = isNum
        ? { v: value as number, t: "n", z: Number.isInteger(value) ? "#,##0" : "#,##0.00" }
        : { v: value == null ? "" : String(value), t: "s" };
      cell.s = {
        border: thinBorder,
        alignment: { horizontal: isNum ? "right" : "left", vertical: "center" },
        ...(alt ? { fill: { fgColor: { rgb: ROW_ALT } } } : {}),
      };
      ws[XLSX.utils.encode_cell({ r, c })] = cell;
      const len = (isNum ? String(value) : String(value ?? "")).length + 2;
      if (len > colWidths[c]) colWidths[c] = len;
    });
  });

  const lastRow = DATA_START + rows.length - 1;
  ws["!ref"] = `A1:${lastCol}${Math.max(lastRow + 1, HEAD_ROW + 1)}`;
  ws["!merges"] = [
    { s: { r: TITLE_ROW, c: 0 }, e: { r: TITLE_ROW, c: nCols - 1 } },
    { s: { r: SUB_ROW, c: 0 }, e: { r: SUB_ROW, c: nCols - 1 } },
  ];
  ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(Math.max(w, 10), 40) }));
  ws["!rows"] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 20 }];
  // Autofiltro sobre los encabezados + datos
  if (rows.length) {
    ws["!autofilter"] = { ref: `A${HEAD_ROW + 1}:${lastCol}${lastRow + 1}` };
  }
  // Congela debajo de los encabezados
  ws["!freeze"] = { xSplit: 0, ySplit: DATA_START, topLeftCell: `A${DATA_START + 1}`, activePane: "bottomLeft", state: "frozen" };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
