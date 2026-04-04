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
export const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 - 21:00

// Color palette Tier 1
export const TIER1_COLORS = [
  "#6c63ff", "#4f46e5", "#3b82f6", "#2563eb", "#1d4ed8", "#0ea5e9",
  "#06b6d4", "#0891b2", "#8b5cf6", "#7c3aed", "#6d28d9", "#a78bfa",
  "#22c55e", "#16a34a", "#15803d", "#10b981", "#059669", "#047857",
  "#14b8a6", "#0d9488", "#0f766e", "#84cc16", "#65a30d", "#4d7c0f",
  "#ef4444", "#dc2626", "#b91c1c", "#f97316", "#ea580c", "#c2410c",
  "#f59e0b", "#d97706", "#b45309", "#eab308", "#ca8a04", "#a16207",
  "#ec4899", "#db2777", "#be185d", "#a855f7", "#9333ea", "#7e22ce",
  "#f43f5e", "#e11d48", "#be123c", "#d946ef", "#c026d3", "#a21caf",
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
