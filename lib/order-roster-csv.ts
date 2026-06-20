import { zipSync, strToU8 } from "fflate";
import {
  buildSheetRows,
  daySheetName,
  formatDeliveryWindow,
  groupOrdersByDay,
  groupOrdersBySlot,
  type RosterGroupMode,
  type RosterOrder,
  slotSheetName,
} from "@/lib/order-roster";

export interface RosterExportResult {
  body: Uint8Array;
  filename: string;
  contentType: string;
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

function csvToBuffer(csv: string): Uint8Array {
  return strToU8(`\uFEFF${csv}`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/*?:[\]"<>|]/g, "-").trim();
}

export function rosterExportFilename(
  mode: RosterGroupMode,
  startDate: string,
  endDate: string,
  options?: { slotLabel?: string; extension?: "csv" | "zip" }
): string {
  const ext = options?.extension ?? "csv";

  if (options?.slotLabel) {
    return sanitizeFilename(
      `order-roster-${startDate}-${options.slotLabel}.${ext}`
    );
  }

  if (mode === "slot" || startDate === endDate) {
    return `order-roster-${startDate}.${ext}`;
  }

  return `order-roster-${startDate}-to-${endDate}.${ext}`;
}

function slotCsvBasename(start: string, end: string): string {
  return sanitizeFilename(slotSheetName(start, end));
}

function dayCsvBasename(date: string): string {
  return sanitizeFilename(daySheetName(date));
}

function buildSingleCsvExport(
  orders: RosterOrder[],
  filename: string
): RosterExportResult {
  const rows =
    orders.length === 0
      ? [["No paid orders found for the selected date range."]]
      : buildSheetRows(orders);

  return {
    body: csvToBuffer(rowsToCsv(rows)),
    filename,
    contentType: "text/csv; charset=utf-8",
  };
}

function buildZipExport(
  files: { name: string; orders: RosterOrder[] }[],
  filename: string
): RosterExportResult {
  const zipEntries: Record<string, Uint8Array> = {};

  for (const file of files) {
    const rows = buildSheetRows(file.orders);
    zipEntries[`${file.name}.csv`] = csvToBuffer(rowsToCsv(rows));
  }

  return {
    body: zipSync(zipEntries),
    filename,
    contentType: "application/zip",
  };
}

export function buildOrderRosterExport(
  orders: RosterOrder[],
  mode: RosterGroupMode,
  startDate: string,
  endDate: string,
  options?: {
    slotFilter?: { windowStart: string; windowEnd: string };
    dayFilter?: string;
  }
): RosterExportResult {
  const slotFilter = options?.slotFilter;
  const dayFilter = options?.dayFilter;
  const filenameStart = dayFilter ?? startDate;
  const filenameEnd = dayFilter ?? endDate;

  let filtered = orders;

  if (slotFilter) {
    filtered = orders.filter(
      (o) =>
        o.delivery_window_start === slotFilter.windowStart &&
        o.delivery_window_end === slotFilter.windowEnd
    );
    const slotLabel = slotCsvBasename(
      slotFilter.windowStart,
      slotFilter.windowEnd
    );
    return buildSingleCsvExport(
      filtered,
      rosterExportFilename(mode, filenameStart, filenameEnd, { slotLabel })
    );
  }

  if (filtered.length === 0) {
    return buildSingleCsvExport(
      filtered,
      rosterExportFilename(mode, filenameStart, filenameEnd)
    );
  }

  if (mode === "slot") {
    const groups = groupOrdersBySlot(filtered);
    const entries = [...groups.entries()].map(([key, slotOrders]) => {
      const [start, end] = key.split("|");
      return { name: slotCsvBasename(start, end), orders: slotOrders };
    });

    if (entries.length === 1) {
      return buildSingleCsvExport(
        entries[0].orders,
        rosterExportFilename(mode, filenameStart, filenameEnd)
      );
    }

    return buildZipExport(
      entries,
      rosterExportFilename(mode, filenameStart, filenameEnd, {
        extension: "zip",
      })
    );
  }

  const groups = groupOrdersByDay(filtered);
  const entries = [...groups.entries()].map(([date, dayOrders]) => ({
    name: dayCsvBasename(date),
    orders: dayOrders,
  }));

  if (entries.length === 1) {
    return buildSingleCsvExport(
      entries[0].orders,
      rosterExportFilename(mode, filenameStart, filenameEnd)
    );
  }

  return buildZipExport(
    entries,
    rosterExportFilename(mode, filenameStart, filenameEnd, { extension: "zip" })
  );
}
