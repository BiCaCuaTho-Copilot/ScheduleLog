import { useState, useMemo } from "react";
import { useAppStore } from "@/components/Layout";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { uuid, getTextColor, hasOverlap, getMonday, getWeekDays, toDateStr, getISOWeek, DAY_NAMES, HOURS, formatVND } from "@/lib/helpers";
import type { Session, Student } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Download, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function SchedulePage() {
  const { data, addSession, updateSession, deleteSession } = useAppStore();
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [dragStudentId, setDragStudentId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [conflictFlash, setConflictFlash] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);
  const weekNum = getISOWeek(currentMonday);
  const year = currentMonday.getFullYear();
  const todayStr = toDateStr(new Date());

  const activeStudents = data.students.filter((s) => s.status === "active");

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

  const handleDragStart = (e: DragStartEvent) => {
    setDragStudentId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragStudentId(null);
    if (!e.over) return;
    const studentId = e.active.id as string;
    const [date, hourStr] = (e.over.id as string).split("_");
    const startHour = Number(hourStr);

    const newSession: Session = {
      id: uuid(),
      studentId,
      date,
      startHour,
      duration: 2,
      attended: true,
      note: "",
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
  };

  const exportExcel = () => {
    const rows: Record<string, string>[] = [];
    const studentsWithSessions = data.students.filter((s) =>
      data.sessions.some((sess) => sess.studentId === s.id && weekDays.some((d) => toDateStr(d) === sess.date))
    );
    studentsWithSessions.forEach((student) => {
      const row: Record<string, string> = { "Học viên": student.name };
      weekDays.forEach((day, i) => {
        const dateStr = toDateStr(day);
        const dd = String(day.getDate()).padStart(2, "0");
        const mm = String(day.getMonth() + 1).padStart(2, "0");
        const colName = `${DAY_NAMES[i]} ${dd}/${mm}`;
        const sessions = data.sessions.filter((s) => s.studentId === student.id && s.date === dateStr);
        row[colName] = sessions.length > 0
          ? sessions.map((s) => `${s.startHour}:00 – ${s.duration}h`).join(", ")
          : "—";
      });
      rows.push(row);
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Lịch tuần ${weekNum}-${year}`);
    XLSX.writeFile(wb, `Lich-Tuan-${weekNum}-${year}.xlsx`);
    toast.success("Đã xuất Excel");
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen">
        {/* Left sidebar - students */}
        <div className="w-52 border-r bg-card p-3 overflow-y-auto shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Kéo vào lịch
          </p>
          {activeStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có học viên active</p>
          ) : (
            <div className="space-y-1.5">
              {activeStudents.map((s) => (
                <DraggableStudent key={s.id} student={s} />
              ))}
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
            <Button variant="outline" size="sm" onClick={goToday}>Hôm nay</Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1">
              <Download className="w-3.5 h-3.5" /> Xuất Excel
            </Button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto">
            <div className="schedule-grid min-w-[900px]">
              {/* Header row */}
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

              {/* Time rows */}
              {HOURS.map((hour) => (
                <>
                  <div key={`h-${hour}`} className="border-b border-r p-1 text-xs text-muted-foreground text-right pr-2 bg-muted/30">
                    {hour}:00
                  </div>
                  {weekDays.map((day, di) => {
                    const dateStr = toDateStr(day);
                    const isToday = dateStr === todayStr;
                    const cellSessions = data.sessions.filter(
                      (s) => s.date === dateStr && s.startHour === hour
                    );
                    return (
                      <DroppableCell
                        key={`${dateStr}_${hour}`}
                        id={`${dateStr}_${hour}`}
                        isToday={isToday}
                      >
                        {cellSessions.map((sess) => {
                          const student = data.students.find((s) => s.id === sess.studentId);
                          if (!student) return null;
                          const textColor = getTextColor(student.color);
                          const isConflicting = conflictFlash === sess.id;
                          // Check if this session has existing conflicts
                          const hasConflict = hasOverlap(data.sessions, sess) !== null;
                          return (
                            <div
                              key={sess.id}
                              className={`session-block ${isConflicting ? "conflict-flash" : ""}`}
                              style={{
                                backgroundColor: student.color,
                                color: textColor,
                                minHeight: `${sess.duration * 60 - 8}px`,
                              }}
                              onClick={() => setEditSession(sess)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold truncate text-xs">● {student.name}</span>
                                {hasConflict && (
                                  <span title="Buổi học trùng thời gian">⚠️</span>
                                )}
                              </div>
                              <div className="text-xs opacity-80">{sess.startHour}:00 · {sess.duration}h</div>
                              <button
                                className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity"
                                style={{ color: textColor }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(sess.id);
                                  toast.success("Đã xoá buổi học");
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </DroppableCell>
                    );
                  })}
                </>
              ))}
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
        })() : null}
      </DragOverlay>

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

function DraggableStudent({ student }: { student: Student }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: student.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-40" : ""}`}
    >
      <div
        className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
        style={{ backgroundColor: student.color, color: getTextColor(student.color) }}
      >
        {student.name.charAt(0)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{student.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatVND(student.pricePerHour)}/h</p>
      </div>
    </div>
  );
}

function DroppableCell({ id, isToday, children }: { id: string; isToday: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`schedule-cell ${isToday ? "today" : ""} ${isOver ? "bg-primary/10" : ""}`}
    >
      {children}
    </div>
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
  const fee = (student?.pricePerHour ?? 0) * duration;

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
