import type { Student } from "@/lib/store";

// UUID
export function uuid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Format VND
export function formatVND(n: number): string {
  return n.toLocaleString("vi-VN") + " ₫";
}

// Format date DD/MM/YYYY
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Get week number (ISO)
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Get Monday of a week
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get week days (Mon-Sun)
export function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Format date to YYYY-MM-DD
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Day names Vietnamese
export const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Hours range for schedule
export const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5:00 - 23:00

// Color palette
export const TIER1_COLORS = [
  // Blues
  "#3b82f6", "#2563eb", "#1d4ed8", "#60a5fa", "#93c5fd", "#1e40af",
  // Indigos
  "#6366f1", "#4f46e5", "#4338ca", "#818cf8", "#6c63ff", "#a5b4fc",
  // Purples
  "#8b5cf6", "#7c3aed", "#6d28d9", "#a78bfa", "#c4b5fd", "#5b21b6",
  // Violets / Fuchsia
  "#9333ea", "#7e22ce", "#d946ef", "#c026d3", "#a21caf", "#e879f9",
  // Pinks / Rose
  "#ec4899", "#db2777", "#be185d", "#f472b6", "#f43f5e", "#e11d48",
  "#be123c", "#fb7185", "#fda4af",
  // Reds / Oranges
  "#ef4444", "#dc2626", "#b91c1c", "#f87171", "#f97316", "#ea580c",
  "#c2410c", "#fb923c", "#fdba74",
  // Ambers / Yellows
  "#f59e0b", "#d97706", "#b45309", "#fbbf24", "#eab308", "#ca8a04",
  "#a16207", "#fde047",
  // Limes / Greens
  "#84cc16", "#65a30d", "#4d7c0f", "#a3e635", "#22c55e", "#16a34a",
  "#15803d", "#4ade80", "#86efac",
  // Emeralds / Teals
  "#10b981", "#059669", "#047857", "#34d399", "#14b8a6", "#0d9488",
  "#0f766e", "#2dd4bf", "#5eead4",
  // Cyans / Sky
  "#06b6d4", "#0891b2", "#0e7490", "#22d3ee", "#0ea5e9", "#0284c7",
  "#0369a1", "#38bdf8", "#7dd3fc",
  // Slate / Neutral-colored (distinctive)
  "#64748b", "#475569", "#334155", "#94a3b8",
  "#78716c", "#57534e", "#44403c", "#a8a29e",
];

// Get next available color
export function getNextColor(usedColors: string[]): string {
  const available = TIER1_COLORS.find((c) => !usedColors.includes(c));
  if (available) return available;
  // Tier 2: generate
  const index = usedColors.length;
  const total = Math.max(index + 1, 50);
  const hue = Math.round((index / total) * 360);
  const sat = 65 + (index % 3) * 10;
  const light = 45 + (index % 2) * 10;
  return hslToHex(hue, sat, light);
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Text color for contrast
export function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = r * 0.299 + g * 0.587 + b * 0.114;
  return brightness > 160 ? "#1e1b4b" : "#ffffff";
}

// Get student's effective price at a given date (dựa vào priceHistory)
export function getPriceAtDate(student: Student, date: string): number {
  const history = student.priceHistory;
  if (!history || history.length === 0) return student.pricePerHour;
  const sorted = [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let price = sorted[0].price;
  for (const entry of sorted) {
    if (entry.effectiveFrom <= date) price = entry.price;
    else break;
  }
  return price;
}

// Check session overlap
export function hasOverlap(
  sessions: { id: string; studentId: string; date: string; startHour: number; duration: number }[],
  newSession: { id: string; studentId: string; date: string; startHour: number; duration: number }
): string | null {
  const conflict = sessions.find(
    (existing) =>
      existing.id !== newSession.id &&
      existing.studentId === newSession.studentId &&
      existing.date === newSession.date &&
      existing.startHour < newSession.startHour + newSession.duration &&
      newSession.startHour < existing.startHour + existing.duration
  );
  return conflict?.id ?? null;
}

// Get sessions in date range
export function sessionsInRange(
  sessions: { date: string; studentId: string; attended: boolean; duration: number }[],
  studentId: string,
  startDate: string,
  endDate: string
) {
  return sessions.filter(
    (s) =>
      s.studentId === studentId &&
      s.attended &&
      s.date >= startDate &&
      s.date <= endDate
  );
}
