import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import { useAppStore } from "@/components/Layout";
import {
  DndContext, DragOverlay, useDraggable, useDroppable, pointerWithin,
  useSensor, useSensors, MouseSensor, TouchSensor,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { uuid, getTextColor, hasOverlap, getMonday, getWeekDays, toDateStr, getISOWeek, DAY_NAMES, formatVND } from "@/lib/helpers";
import type { Session, Student, AppData } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, FileDown, Copy, X, ImageDown, Mail } from "lucide-react";
import { toast } from "sonner";

function formatHour(h: number): string {
  if (h === 24) return "0:00";
  return `${Math.floor(h)}:${h % 1 !== 0 ? "30" : "00"}`;
}

// Layout sessions for a single day: assign column index so overlapping sessions sit side-by-side
function layoutSessions(sessions: Session[]): { sess: Session; col: number; numCols: number }[] {
  if (sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => a.startHour - b.startHour);
  const colEnds: number[] = []; // end time of the last session placed in each column
  const layouts: { sess: Session; col: number }[] = [];

  for (const sess of sorted) {
    const sessEnd = sess.startHour + sess.duration;
    // Find first column where the previous session has already ended
    let col = colEnds.findIndex((end) => end <= sess.startHour);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(sessEnd);
    } else {
      colEnds[col] = sessEnd;
    }
    layouts.push({ sess, col });
  }

  // For each session, numCols = max col index among all sessions that overlap with it + 1
  return layouts.map((item) => {
    const { sess } = item;
    const sessEnd = sess.startHour + sess.duration;
    const concurrent = layouts.filter((other) => {
      const otherEnd = other.sess.startHour + other.sess.duration;
      return !(otherEnd <= sess.startHour || other.sess.startHour >= sessEnd);
    });
    const numCols = Math.max(...concurrent.map((c) => c.col)) + 1;
    return { ...item, numCols };
  });
}

export default function SchedulePage() {
  const { data, addSession, updateSession, deleteSession, config } = useAppStore();
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [dragStudentId, setDragStudentId] = useState<string | null>(null);
  const [dragSessionId, setDragSessionId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [conflictFlash, setConflictFlash] = useState<string | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [studentSearch, setStudentSearch] = useState("");
  // grab offset: where within the session block the user clicked (px from top of block)
  const grabOffsetRef = useRef(0);
  const pointerYRef = useRef(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      pointerYRef.current = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) pointerYRef.current = e.touches[0].clientY;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchstart", handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchMove);
    };
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);
  const weekNum = getISOWeek(currentMonday);
  const year = currentMonday.getFullYear();
  const todayStr = toDateStr(new Date());
  const monthStr = `${year}-${String(currentMonday.getMonth() + 1).padStart(2, "0")}`;

  const activeStudents = data.students.filter((s) => s.status === "active");
  const visibleStudents = activeStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const prevWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - 7);
    setCurrentMonday(d);
  };
  const nextWeek = () => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + 7);
    setCurrentMonday(d);
  };
  const goToday = () => setCurrentMonday(getMonday(new Date()));
  const goToMonth = (ym: string) => {
    if (!ym) return;
    const [y, m] = ym.split("-").map(Number);
    setCurrentMonday(getMonday(new Date(y, m - 1, 1)));
  };

  const HOUR_HEIGHT = 60; // px per hour
  const SLOT_HEIGHT = 30; // px per 30-min slot
  const SCHEDULE_HOURS = Array.from(
    { length: config.schedule.endHour - config.schedule.startHour + 1 },
    (_, i) => i + config.schedule.startHour,
  );
  const FIRST_HOUR = SCHEDULE_HOURS[0];
  const HALF_HOURS = SCHEDULE_HOURS.flatMap((h) => [h, h + 0.5]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    if (id.startsWith("sess:")) {
      setDragSessionId(id.slice(5));
      // Record where within the block the user grabbed (for accurate snapping)
      const activator = e.activatorEvent as MouseEvent & TouchEvent;
      const initY = activator.touches?.[0]?.clientY ?? activator.clientY ?? pointerYRef.current;
      const blockRect = e.active.rect.current.initial;
      grabOffsetRef.current = blockRect ? initY - blockRect.top : 0;
    } else {
      setDragStudentId(id);
      grabOffsetRef.current = 0;
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragStudentId(null);
    setDragSessionId(null);
    if (!e.over) return;

    const activeId = e.active.id as string;
    const date = (e.over.id as string).split("_")[0];

    // Calculate start hour strictly from the real-time tracked native pointer
    // This avoids dnd-kit's automatic scroll compensation which double-counts when using rect.top
    const finalTopY = pointerYRef.current - grabOffsetRef.current;

    const dayCol = document.querySelector(`[data-day="${date}"]`) as HTMLElement | null;
    let startHour: number;
    if (dayCol) {
      const rect = dayCol.getBoundingClientRect();
      const relY = Math.max(0, finalTopY - rect.top);
      startHour = Math.round((FIRST_HOUR + relY / HOUR_HEIGHT) * 2) / 2;
      startHour = Math.max(FIRST_HOUR, Math.min(23.5, startHour));
    } else {
      startHour = Number((e.over.id as string).split("_")[1]);
    }

    if (activeId.startsWith("sess:")) {
      // ── Move existing session ──
      const sessId = activeId.slice(5);
      const sess = data.sessions.find((s) => s.id === sessId);
      if (!sess) return;
      const updated = { ...sess, date, startHour };
      const othersessions = data.sessions.filter((s) => s.id !== sessId);
      const conflictId = hasOverlap(othersessions, updated);
      if (conflictId) {
        toast.error("⚠️ Trùng lịch với buổi học khác");
        setConflictFlash(conflictId);
        setTimeout(() => setConflictFlash(null), 2000);
        return;
      }
      updateSession(updated);
      toast.success("Đã di chuyển buổi học");
    } else {
      // ── Create new session from student drag ──
      const studentId = activeId;
      const newSession: Session = {
        id: uuid(), studentId, date, startHour, duration: config.schedule.defaultDuration, attended: config.schedule.defaultAttended, note: "",
      };
      const conflictId = hasOverlap(data.sessions, newSession);
      if (conflictId) {
        const student = data.students.find((s) => s.id === studentId);
        toast.error(`⚠️ ${student?.name} đã có lịch trùng giờ ngày ${date}. Không thể thêm.`);
        setConflictFlash(conflictId);
        setTimeout(() => setConflictFlash(null), 2000);
        return;
      }
      addSession(newSession);
      toast.success("Đã thêm buổi học");
    }
  };

  const exportAsImage = useCallback(async () => {
    const el = scheduleRef.current;
    if (!el) return;
    toast("Đang chụp lịch học...", { duration: 2000 });
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#0D0D0D",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `lich-hoc-tuan-${weekNum}-${year}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Đã lưu ảnh lịch học");
    } catch {
      toast.error("Không thể xuất ảnh, thử lại");
    }
  }, [weekNum, year]);

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen">
        {/* Left sidebar - students */}
        <div className="w-52 border-r bg-card p-3 overflow-y-auto shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Kéo vào lịch
          </p>
          <Input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Tìm học viên..."
            className="h-7 text-xs mb-3"
          />
          {activeStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có học viên active</p>
          ) : visibleStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Không tìm thấy</p>
          ) : (
            <div className="space-y-1.5">
              {visibleStudents.map((s) => {
                const scheduled = data.sessions.filter((sess) => sess.studentId === s.id).length;
                const totalBuoi = s.bookedSessions != null ? s.bookedSessions + (s.freeSessions ?? 0) : null;
                const remaining = totalBuoi !== null ? totalBuoi - scheduled : null;
                return (
                  <DraggableStudent key={s.id} student={s} remaining={remaining} booked={totalBuoi} />
                );
              })}
            </div>
          )}
        </div>

        {/* Right - schedule grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Week navigation */}
          <div className="flex items-center gap-3 p-3 border-b bg-card">
            <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-semibold text-sm min-w-[140px] text-center">Tuần {weekNum} — {year}</span>
            <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
            <Input
              type="month"
              value={monthStr}
              onChange={(e) => goToMonth(e.target.value)}
              className="w-42 h-8 text-sm"
            />
            <Button variant="outline" size="sm" onClick={goToday}>Hôm nay</Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => setCopyModalOpen(true)} className="gap-1">
              <Copy className="w-3.5 h-3.5" /> Copy lịch
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} className="gap-1">
              <FileDown className="w-3.5 h-3.5" /> Xuất lịch học
            </Button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto">
            <div ref={scheduleRef} className="schedule-grid min-w-[900px]">

              {/* ── Header row ── */}
              <div className="border-b border-r bg-muted/50 p-2" />
              {weekDays.map((day, i) => {
                const dateStr = toDateStr(day);
                const isToday = dateStr === todayStr;
                const dd = String(day.getDate()).padStart(2, "0");
                const mm = String(day.getMonth() + 1).padStart(2, "0");
                return (
                  <div
                    key={i}
                    className={`border-b border-r p-2 text-center text-sm font-medium ${
                      isToday ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold">{DAY_NAMES[i]}</div>
                    <div className="text-xs">{dd}/{mm}</div>
                  </div>
                );
              })}

              {/* ── Body: time labels column ── */}
              <div className="border-r bg-muted/30">
                {HALF_HOURS.map((slot) => {
                  const isHalf = slot % 1 !== 0;
                  return (
                    <div
                      key={slot}
                      style={{ height: SLOT_HEIGHT }}
                      className={`text-right pr-2 flex items-center justify-end ${isHalf ? "border-b border-dashed border-border/40 text-[9px] text-muted-foreground/40" : "border-b text-[11px] text-muted-foreground"}`}
                    >
                      {formatHour(slot)}
                    </div>
                  );
                })}
                {/* Midnight boundary label */}
                <div style={{ height: SLOT_HEIGHT }} className="border-b text-[11px] text-muted-foreground text-right pr-2 flex items-center justify-end">
                  0:00
                </div>
              </div>

              {/* ── Body: one column per day ── */}
              {weekDays.map((day) => {
                const dateStr = toDateStr(day);
                const isToday = dateStr === todayStr;
                const daySessions = data.sessions.filter((s) => s.date === dateStr);
                const laid = layoutSessions(daySessions);

                return (
                  <div
                    key={dateStr}
                    data-day={dateStr}
                    className={`relative ${isToday ? "bg-primary/[0.04]" : ""}`}
                  >
                    {/* Drop target cells (background grid lines) */}
                    {HALF_HOURS.map((slot) => (
                      <DroppableCell
                        key={`${dateStr}_${slot}`}
                        id={`${dateStr}_${slot}`}
                        isToday={isToday}
                        isHalf={slot % 1 !== 0}
                      />
                    ))}
                    {/* Midnight boundary row (visual only) */}
                    <div style={{ height: SLOT_HEIGHT }} className="border-b border-r" />

                    {/* Session blocks: draggable + absolutely positioned */}
                    {laid.map(({ sess, col, numCols }) => {
                      const student = data.students.find((s) => s.id === sess.studentId);
                      if (!student) return null;
                      return (
                        <DraggableSession
                          key={sess.id}
                          sess={sess}
                          student={student}
                          col={col}
                          numCols={numCols}
                          firstHour={FIRST_HOUR}
                          hourHeight={HOUR_HEIGHT}
                          isConflicting={conflictFlash === sess.id}
                          hasConflict={hasOverlap(data.sessions, sess) !== null}
                          onEdit={() => setEditSession(sess)}
                          onDelete={() => { deleteSession(sess.id); toast.success("Đã xoá buổi học"); }}
                        />
                      );
                    })}
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {dragStudentId ? (() => {
          const s = data.students.find((x) => x.id === dragStudentId);
          if (!s) return null;
          return (
            <div className="drag-overlay flex items-center gap-2 bg-card rounded-lg border px-3 py-2 shadow-lg">
              <div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: s.color, color: getTextColor(s.color) }}>
                {s.name.charAt(0)}
              </div>
              <span className="text-sm font-medium">{s.name}</span>
            </div>
          );
        })() : dragSessionId ? (() => {
          const sess = data.sessions.find((x) => x.id === dragSessionId);
          const s = data.students.find((x) => x.id === sess?.studentId);
          if (!sess || !s) return null;
          const tc = getTextColor(s.color);
          return (
            <div className="drag-overlay rounded-lg px-2 py-1.5 text-xs shadow-lg" style={{ backgroundColor: s.color, color: tc, minWidth: 90, opacity: 0.9 }}>
              <div className="font-semibold">● {s.name}</div>
              <div className="opacity-80">{formatHour(sess.startHour)} · {sess.duration}h</div>
            </div>
          );
        })() : null}
      </DragOverlay>

      {/* Export modal */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExportImage={() => { setExportModalOpen(false); exportAsImage(); }}
        weekNum={weekNum}
        year={year}
        weekDays={weekDays}
        data={data}
      />

      {/* Copy schedule modal */}
      <CopyScheduleModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        initialWeekDate={toDateStr(currentMonday)}
      />

      {/* Edit session modal */}
      {editSession && (
        <SessionEditModal
          session={editSession}
          allSessions={data.sessions}
          students={data.students}
          onClose={() => setEditSession(null)}
          onSave={(s) => { updateSession(s); setEditSession(null); toast.success("Đã cập nhật buổi học"); }}
          onDelete={(id) => { deleteSession(id); setEditSession(null); toast.success("Đã xoá buổi học"); }}
        />
      )}
    </DndContext>
  );
}

function DraggableStudent({ student, remaining, booked }: { student: Student; remaining: number | null; booked?: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: student.id });
  const outOfSessions = remaining !== null && remaining <= 0;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-40" : ""} ${outOfSessions ? "border-destructive/40" : ""}`}
    >
      <div
        className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: student.color, color: getTextColor(student.color) }}
      >
        {student.name.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{student.name}</p>
        {remaining !== null ? (
          <p className={`text-[10px] font-medium ${outOfSessions ? "text-destructive" : "text-primary"}`}>
            Còn {remaining}/{booked} buổi
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">{formatVND(student.pricePerHour)}/buổi</p>
        )}
      </div>
    </div>
  );
}

function DraggableSession({
  sess, student, col, numCols, firstHour, hourHeight,
  isConflicting, hasConflict, onEdit, onDelete,
}: {
  sess: Session; student: Student; col: number; numCols: number;
  firstHour: number; hourHeight: number;
  isConflicting: boolean; hasConflict: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `sess:${sess.id}` });
  const textColor = getTextColor(student.color);
  const top = (sess.startHour - firstHour) * hourHeight;
  const height = sess.duration * hourHeight - 4;
  const leftPct = (col / numCols) * 100;
  const widthPct = (1 / numCols) * 100;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`session-block ${isConflicting ? "conflict-flash" : ""}`}
      style={{
        position: "absolute",
        backgroundColor: student.color,
        color: textColor,
        top: `${top + 2}px`,
        height: `${height}px`,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        zIndex: isDragging ? 0 : 10,
        margin: 0,
        overflow: "hidden",
        opacity: isDragging ? 0.25 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onClick={() => { if (!isDragging) onEdit(); }}
    >
      <div className="flex items-center justify-between gap-1 pointer-events-none">
        <span className="font-semibold truncate text-xs">● {student.name}</span>
        {hasConflict && <span title="Trùng lịch">⚠️</span>}
      </div>
      <div className="text-xs opacity-80 pointer-events-none">{formatHour(sess.startHour)} · {sess.duration}h</div>
      <button
        className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity"
        style={{ color: textColor }}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function DroppableCell({ id, isToday, isHalf }: { id: string; isToday: boolean; isHalf: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ height: 30 }}
      className={`border-r ${isHalf ? "border-b border-dashed opacity-60" : "border-b"} ${isToday ? "bg-primary/[0.04]" : ""} ${isOver ? "bg-primary/10" : ""}`}
    />
  );
}

function ExportModal({
  open, onClose, onExportImage, weekNum, year, weekDays, data,
}: {
  open: boolean;
  onClose: () => void;
  onExportImage: () => void;
  weekNum: number;
  year: number;
  weekDays: Date[];
  data: AppData;
}) {
  const [gmailStudentId, setGmailStudentId] = useState("");

  const studentsWithEmail = data.students.filter((s) => s.email);

  const scheduleText = useMemo(() => {
    const lines: string[] = [`📅 Lịch học Tuần ${weekNum} — ${year}\n`];
    weekDays.forEach((day, i) => {
      const dateStr = toDateStr(day);
      const dd = String(day.getDate()).padStart(2, "0");
      const mm = String(day.getMonth() + 1).padStart(2, "0");
      const daySessions = data.sessions
        .filter((s) => s.date === dateStr)
        .sort((a, b) => a.startHour - b.startHour);
      lines.push(`${DAY_NAMES[i]}, ${dd}/${mm}:`);
      if (daySessions.length === 0) {
        lines.push("  (Trống)");
      } else {
        daySessions.forEach((sess) => {
          const student = data.students.find((s) => s.id === sess.studentId);
          if (!student) return;
          lines.push(`  • ${student.name}: ${formatHour(sess.startHour)} – ${formatHour(sess.startHour + sess.duration)} (${sess.duration}h)`);
        });
      }
      lines.push("");
    });
    return lines.join("\n");
  }, [weekNum, year, weekDays, data]);

  const handleOpenGmail = () => {
    const student = data.students.find((s) => s.id === gmailStudentId);
    const to = student?.email ?? "";
    const subject = encodeURIComponent(`Lịch học Tuần ${weekNum} — ${year}`);
    const body = encodeURIComponent(scheduleText);
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${subject}&body=${body}`;
    window.open(url, "_blank");
    onClose();
    toast.success("Đã mở Gmail soạn thảo");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xuất lịch học — Tuần {weekNum}/{year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {/* Option 1: Image */}
          <button
            onClick={onExportImage}
            className="w-full flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <ImageDown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Lưu hình ảnh về máy</p>
              <p className="text-xs text-muted-foreground mt-0.5">Chụp lịch dưới dạng ảnh PNG, lưu vào thiết bị</p>
            </div>
          </button>

          {/* Option 2: Gmail */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-sm">Gửi qua Gmail</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mở Gmail soạn thảo với nội dung lịch học</p>
              </div>
            </div>
            {studentsWithEmail.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-14">Chưa có học viên nào có email. Thêm email trong trang Học viên.</p>
            ) : (
              <div className="pl-14 space-y-2">
                <select
                  value={gmailStudentId}
                  onChange={(e) => setGmailStudentId(e.target.value)}
                  className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-input text-foreground"
                >
                  <option value="">Chọn học viên nhận mail...</option>
                  {studentsWithEmail.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!gmailStudentId}
                  onClick={handleOpenGmail}
                  className="gap-2 w-full"
                >
                  <Mail className="w-3.5 h-3.5" /> Mở Gmail
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyScheduleModal({
  open, onClose, initialWeekDate,
}: {
  open: boolean;
  onClose: () => void;
  initialWeekDate: string;
}) {
  const { data, addSessions } = useAppStore();
  const [sourceDate, setSourceDate] = useState(initialWeekDate);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) { setSourceDate(initialWeekDate); setSelected(new Set()); }
  }, [open, initialWeekDate]);

  const sourceMonday = useMemo(() => getMonday(new Date(sourceDate + "T12:00:00")), [sourceDate]);
  const sourceDays   = useMemo(() => getWeekDays(sourceMonday), [sourceMonday]);
  const sourceWeekNum = getISOWeek(sourceMonday);
  const sourceYear    = sourceMonday.getFullYear();

  const sourceSessions = useMemo(() => {
    const start = toDateStr(sourceDays[0]);
    const end   = toDateStr(sourceDays[6]);
    return data.sessions
      .filter((s) => s.date >= start && s.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);
  }, [data.sessions, sourceDays]);

  // 12 tuần tiếp theo sau tuần nguồn
  const candidateWeeks = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const d = new Date(sourceMonday);
      d.setDate(d.getDate() + (i + 1) * 7);
      return d;
    }), [sourceMonday]);

  const weekInfos = useMemo(() => {
    return candidateWeeks.map((targetMonday) => {
      const days      = getWeekDays(targetMonday);
      const startStr  = toDateStr(days[0]);
      const endStr    = toDateStr(days[6]);
      const offsetMs  = targetMonday.getTime() - sourceMonday.getTime();
      const offsetDays = Math.round(offsetMs / 86400000);

      const projected = sourceSessions.map((sess) => {
        const d = new Date(sess.date + "T12:00:00");
        d.setDate(d.getDate() + offsetDays);
        return { ...sess, id: `__tmp_${sess.id}`, date: toDateStr(d) };
      });

      const conflictCount = projected.filter(
        (ps) => hasOverlap(data.sessions, ps) !== null
      ).length;

      const existingCount = data.sessions.filter(
        (s) => s.date >= startStr && s.date <= endStr
      ).length;

      const mondayStr = toDateStr(targetMonday);
      return {
        mondayStr, weekNum: getISOWeek(targetMonday),
        year: targetMonday.getFullYear(),
        startStr, endStr, offsetDays,
        existingCount, conflictCount,
      };
    });
  }, [candidateWeeks, sourceSessions, data.sessions, sourceMonday]);

  const toggle = (mondayStr: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(mondayStr) ? next.delete(mondayStr) : next.add(mondayStr);
      return next;
    });

  const selectedInfos = weekInfos.filter((w) => selected.has(w.mondayStr));
  const totalConflicts = selectedInfos.reduce((s, w) => s + w.conflictCount, 0);
  const totalWillCreate = selectedInfos.length * sourceSessions.length - totalConflicts;

  const handleApply = () => {
    const newSessions: Session[] = [];
    for (const info of selectedInfos) {
      for (const sess of sourceSessions) {
        const d = new Date(sess.date + "T12:00:00");
        d.setDate(d.getDate() + info.offsetDays);
        const newSess: Session = { ...sess, id: uuid(), date: toDateStr(d) };
        if (hasOverlap(data.sessions, newSess) === null) newSessions.push(newSess);
      }
    }
    addSessions(newSessions);
    toast.success(`Đã tạo ${newSessions.length} buổi học cho ${selectedInfos.length} tuần`);
    onClose();
  };

  const fmtDay = (str: string) => {
    const d = new Date(str + "T12:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy lịch sang tuần khác</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Source */}
          <div>
            <Label className="text-xs">Tuần nguồn (copy từ)</Label>
            <Input type="date" value={sourceDate} onChange={(e) => setSourceDate(e.target.value)} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">
              Tuần {sourceWeekNum} — {sourceYear} · <span className="font-medium">{sourceSessions.length} buổi học</span>
            </p>
          </div>

          {/* Source sessions preview */}
          {sourceSessions.length > 0 ? (
            <div className="bg-muted/30 rounded-md p-2 space-y-1 max-h-28 overflow-y-auto">
              {sourceSessions.map((sess) => {
                const student = data.students.find((s) => s.id === sess.studentId);
                const dow = new Date(sess.date + "T12:00:00").getDay();
                return (
                  <div key={sess.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: student?.color }} />
                    <span className="text-muted-foreground w-5">{DAY_NAMES[dow === 0 ? 6 : dow - 1]}</span>
                    <span className="font-medium">{student?.name}</span>
                    <span className="text-muted-foreground ml-auto">{formatHour(sess.startHour)} · {sess.duration}h</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2 border rounded-md">Tuần này chưa có lịch học</p>
          )}

          {/* Target weeks */}
          <div>
            <Label className="text-xs">Chọn tuần muốn dán vào</Label>
            <div className="mt-1 border rounded-md divide-y max-h-52 overflow-y-auto">
              {weekInfos.map((info) => {
                const isSelected = selected.has(info.mondayStr);
                return (
                  <label
                    key={info.mondayStr}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(info.mondayStr)}
                      className="accent-primary"
                    />
                    <span className="text-sm flex-1">
                      <span className="font-medium">Tuần {info.weekNum}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{fmtDay(info.startStr)} → {fmtDay(info.endStr)}</span>
                    </span>
                    {info.conflictCount > 0 && (
                      <span className="text-xs text-amber-600 font-medium">⚠️ {info.conflictCount} trùng</span>
                    )}
                    {info.existingCount > 0 && info.conflictCount === 0 && (
                      <span className="text-xs text-muted-foreground">{info.existingCount} buổi có sẵn</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {selected.size > 0 && (
            <div className="bg-primary/5 rounded-md px-3 py-2 text-xs">
              <span className="font-medium">{selected.size} tuần</span> đã chọn ·{" "}
              <span className="font-medium text-success">{totalWillCreate} buổi</span> sẽ được tạo
              {totalConflicts > 0 && (
                <span className="text-amber-600"> · {totalConflicts} bỏ qua do trùng lịch</span>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Huỷ</Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || sourceSessions.length === 0 || totalWillCreate === 0}
              onClick={handleApply}
            >
              Áp dụng {selected.size > 0 ? `(${totalWillCreate} buổi)` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionEditModal({
  session, allSessions, students, onClose, onSave, onDelete,
}: {
  session: Session;
  allSessions: Session[];
  students: Student[];
  onClose: () => void;
  onSave: (s: Session) => void;
  onDelete: (id: string) => void;
}) {
  const [startHour, setStartHour] = useState(session.startHour);
  const [duration, setDuration] = useState(session.duration);
  const [attended, setAttended] = useState(session.attended);
  const [note, setNote] = useState(session.note);

  const student = students.find((s) => s.id === session.studentId);
  const modified = { ...session, startHour, duration };
  const conflictId = hasOverlap(allSessions, modified);
  const fee = (student?.pricePerHour ?? 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa buổi học</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: student?.color }} />
            <span className="font-medium text-sm">{student?.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">{session.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={attended} onCheckedChange={(v) => setAttended(!!v)} id="attended" />
            <Label htmlFor="attended" className="text-sm">Có tập buổi này</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Giờ bắt đầu</Label>
              <Input type="number" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} min={6} max={21} />
              {conflictId && (
                <p className="text-xs text-destructive mt-1">Thời gian trùng với buổi khác</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Thời lượng (giờ)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={0.5} max={8} step={0.5} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tiền buổi</Label>
            <p className="text-sm font-semibold text-primary">{formatVND(fee)}</p>
          </div>
          <div>
            <Label className="text-xs">Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú..." />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(session.id)}
            >
              Xoá buổi
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
            <Button
              size="sm"
              disabled={!!conflictId}
              onClick={() => onSave({ ...session, startHour, duration, attended, note })}
            >
              Lưu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
