import { useState } from "react";
import { useAppStore } from "@/components/Layout";
import { uuid, formatVND, getNextColor, getTextColor, TIER1_COLORS } from "@/lib/helpers";
import type { Student } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentsPage() {
  const { data, addStudent, updateStudent, deleteStudent } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getDebt = (studentId: string) => {
    const totalFee = data.sessions
      .filter((s) => s.studentId === studentId && s.attended)
      .reduce((sum, s) => {
        const st = data.students.find((x) => x.id === studentId);
        return sum + (st?.pricePerHour ?? 0) * s.duration;
      }, 0);
    const totalPaid = data.payments
      .filter((p) => p.studentId === studentId)
      .reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalFee - totalPaid);
  };

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
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Thêm học viên
        </Button>
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
          {data.students.map((s) => {
            const debt = getDebt(s.id);
            const textColor = getTextColor(s.color);
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
                    <p className="text-sm text-muted-foreground">{formatVND(s.pricePerHour)}/giờ</p>
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
                  {debt > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/15 text-destructive">
                      Nợ {formatVND(debt)}
                    </span>
                  )}
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
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [color, setColor] = useState("#6c63ff");

  // Reset form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      if (student) {
        setName(student.name);
        setPrice(String(student.pricePerHour));
        setStatus(student.status);
        setColor(student.color);
      } else {
        setName("");
        setPrice("");
        setStatus("active");
        setColor(getNextColor(usedColors));
      }
    }
    if (!o) onClose();
  };

  const handleSave = () => {
    if (!name.trim() || !price) return;
    onSave({
      id: student?.id ?? uuid(),
      name: name.trim(),
      pricePerHour: Number(price),
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
            <Label>Giá dạy / giờ (VNĐ) *</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="200000" />
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
              {TIER1_COLORS.slice(0, 24).map((c) => (
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

import { Users } from "lucide-react";
