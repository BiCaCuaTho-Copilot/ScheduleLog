import { useState, useEffect } from "react";
import { useAppStore } from "@/components/Layout";
import { uuid, formatVND, getNextColor, getTextColor, TIER1_COLORS } from "@/lib/helpers";
import type { Student } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function StudentsPage() {
  const { data, addStudent, updateStudent, deleteStudent } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const getDebt = (studentId: string) => {
    const totalFee = data.sessions
      .filter((s) => s.studentId === studentId && s.attended)
      .reduce((sum, s) => {
        const st = data.students.find((x) => x.id === studentId);
        return sum + (st?.pricePerHour ?? 0);
      }, 0);
    const totalPaid = data.payments
      .filter((p) => p.studentId === studentId)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalFee - totalPaid);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const getScheduledSessions = (studentId: string) =>
    data.sessions.filter((s) => s.studentId === studentId).length;

  const getTotalBuoi = (s: Student) => {
    if (!s.bookedSessions) return null;
    return s.bookedSessions + (s.freeSessions ?? 0);
  };

  const getRemainingBuoi = (s: Student) => {
    const total = getTotalBuoi(s);
    if (total === null) return null;
    return total - getScheduledSessions(s.id);
  };

  const getCompletedSessions = (studentId: string) =>
    data.sessions.filter((s) => s.studentId === studentId && s.attended && s.date <= todayStr).length;

  const getTotalPaid = (studentId: string) =>
    data.payments.filter((p) => p.studentId === studentId).reduce((sum, p) => sum + p.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: Student) => {
    setEditing(s);
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Học viên</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {data.students.length} học viên · {data.students.filter((s) => s.status === "active").length} đang hoạt động
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-48 h-9"
          />
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Thêm học viên
          </Button>
        </div>
      </div>

      {data.students.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Chưa có học viên nào</p>
          <Button variant="outline" className="mt-4" onClick={openAdd}>
            Thêm học viên đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).map((s) => {
            const debt = getDebt(s.id);
            const textColor = getTextColor(s.color);
            const remaining = getRemainingBuoi(s);
            const totalBuoi = getTotalBuoi(s);
            const completedCount = getCompletedSessions(s.id);
            const completedAmount = completedCount * s.pricePerHour;
            const totalFee = s.bookedSessions != null ? s.bookedSessions * s.pricePerHour : null;
            const depositAmount = s.depositSessions != null ? s.depositSessions * s.pricePerHour : null;
            const totalPaid = getTotalPaid(s.id);
            return (
              <div key={s.id} className="bg-card rounded-lg border p-4 card-hover">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: s.color, color: textColor }}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-card-foreground truncate">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{formatVND(s.pricePerHour)}/buổi</p>
                    {remaining !== null && totalBuoi !== null && (
                      <p className={`text-xs font-medium mt-0.5 ${remaining <= 0 ? "text-destructive" : "text-primary"}`}>
                        Còn {remaining}/{totalBuoi} buổi
                        {s.freeSessions ? <span className="text-muted-foreground font-normal"> ({s.bookedSessions}+{s.freeSessions} KM)</span> : null}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "active"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "active" ? "Active" : "Inactive"}
                  </span>
                  {remaining !== null && remaining <= 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive">
                      Hết buổi
                    </span>
                  )}
                  {debt > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive">
                      Nợ {formatVND(debt)}
                    </span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
                  {totalFee !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng tiền học</span>
                      <span className="font-medium">{formatVND(totalFee)}</span>
                    </div>
                  )}
                  {depositAmount !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Đặt cọc ({s.depositSessions} buổi)</span>
                      <span className="font-medium text-amber-600">{formatVND(depositAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đã hoàn thành</span>
                    <div className="text-right">
                      <span className="font-medium">{completedCount} buổi</span>
                      <span className="block text-muted-foreground/70">≈ {formatVND(completedAmount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đã thanh toán</span>
                    <span className="font-medium text-success">{formatVND(totalPaid)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="flex-1 gap-1">
                    <Pencil className="w-3 h-3" /> Sửa
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} className="flex-1 gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" /> Xoá
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        student={editing}
        usedColors={data.students.map((s) => s.color)}
        onSave={(s) => {
          if (editing) {
            updateStudent(s);
            toast.success("Đã cập nhật học viên");
          } else {
            addStudent(s);
            toast.success("Đã thêm học viên mới");
          }
          setModalOpen(false);
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá học viên?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ buổi học và thanh toán của học viên này sẽ bị xoá. Hành động không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteStudent(deleteId!);
                toast.success("Đã xoá học viên");
                setDeleteId(null);
              }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StudentModal({
  open, onClose, student, usedColors, onSave,
}: {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  usedColors: string[];
  onSave: (s: Student) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState("");
  const [bookedSessions, setBookedSessions] = useState("");
  const [freeSessions, setFreeSessions] = useState("");
  const [depositSessions, setDepositSessions] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [color, setColor] = useState("#6c63ff");

  // Reset form whenever the dialog opens or the student being edited changes
  useEffect(() => {
    if (!open) return;
    if (student) {
      setName(student.name);
      setEmail(student.email ?? "");
      setPrice(String(student.pricePerHour));
      setBookedSessions(student.bookedSessions != null ? String(student.bookedSessions) : "");
      setFreeSessions(student.freeSessions != null ? String(student.freeSessions) : "");
      setDepositSessions(student.depositSessions != null ? String(student.depositSessions) : "");
      setStatus(student.status);
      setColor(student.color);
    } else {
      setName("");
      setEmail("");
      setPrice("");
      setBookedSessions("");
      setFreeSessions("");
      setDepositSessions("");
      setStatus("active");
      setColor(getNextColor(usedColors));
    }
  }, [open, student]);

  const priceNum = Number(price) || 0;
  const depositAmount = depositSessions !== "" ? Number(depositSessions) * priceNum : null;

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
  };

  const handleSave = () => {
    if (!name.trim() || !price) return;
    onSave({
      id: student?.id ?? uuid(),
      name: name.trim(),
      email: email.trim() || undefined,
      pricePerHour: Number(price),
      priceHistory: student?.priceHistory,
      bookedSessions: bookedSessions !== "" ? Number(bookedSessions) : undefined,
      freeSessions: freeSessions !== "" ? Number(freeSessions) : undefined,
      depositSessions: depositSessions !== "" ? Number(depositSessions) : undefined,
      status,
      color,
      createdAt: student?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{student ? "Sửa học viên" : "Thêm học viên"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Tên học viên *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên" />
          </div>
          <div>
            <Label>Email học viên</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" />
          </div>
          <div>
            <Label>Giá / buổi (VNĐ) *</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="200000" />
          </div>
          <div>
            <Label>Số buổi booking tạm tính</Label>
            <Input type="number" value={bookedSessions} onChange={(e) => setBookedSessions(e.target.value)} placeholder="Ví dụ: 8" min={0} />
            <p className="text-xs text-muted-foreground mt-1">Số buổi đã đặt — dùng để tính số buổi còn lại</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Số buổi khuyến mại</Label>
              <Input type="number" value={freeSessions} onChange={(e) => setFreeSessions(e.target.value)} placeholder="0" min={0} />
              <p className="text-xs text-muted-foreground mt-1">Không tính tiền, cộng vào tổng buổi</p>
            </div>
            <div>
              <Label>Số buổi cần đặt cọc</Label>
              <Input type="number" value={depositSessions} onChange={(e) => setDepositSessions(e.target.value)} placeholder="0" min={0} />
              {depositAmount !== null && depositAmount > 0 ? (
                <p className="text-xs text-amber-600 font-medium mt-1">≈ {formatVND(depositAmount)}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Số tiền sẽ hiện khi nhập</p>
              )}
            </div>
          </div>
          <div>
            <Label>Trạng thái</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Màu đại diện</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: color }} />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-28 font-mono text-sm" maxLength={7} />
              <Button type="button" variant="outline" size="sm" onClick={() => setColor(getNextColor(usedColors))}>
                Tự sinh
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {TIER1_COLORS.slice(0, 48).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${
                    color === c ? "border-foreground scale-125" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Huỷ</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !price}>
              {student ? "Lưu" : "Thêm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
