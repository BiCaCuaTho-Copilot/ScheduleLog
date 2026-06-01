import { useState, useRef } from "react";
import { useAppStore } from "@/components/Layout";
import type { AppData } from "@/lib/store";
import { db } from "@/lib/firebase";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Download, Upload, Save, Database, Mail, Calendar, User } from "lucide-react";
import { toast } from "sonner";

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-lg p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── 1. Backup & Restore ───────────────────────────────────────────────────────
function BackupSection() {
  const { data } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file backup");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppData;
        if (!Array.isArray(parsed.students) || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.payments)) {
          toast.error("File không đúng định dạng backup");
          return;
        }
        const batch = writeBatch(db);
        parsed.students.forEach((s) => batch.set(doc(db, "students", s.id), s));
        parsed.sessions.forEach((s) => batch.set(doc(db, "sessions", s.id), s));
        parsed.payments.forEach((p) => batch.set(doc(db, "payments", p.id), p));
        await batch.commit();
        toast.success("Khôi phục thành công từ backup");
      } catch {
        toast.error("Không đọc được file, kiểm tra lại định dạng JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Section icon={Database} title="Sao lưu & Khôi phục dữ liệu">
      <p className="text-sm text-muted-foreground mb-4">
        Dữ liệu lưu trong trình duyệt. Xuất file backup thường xuyên để tránh mất dữ liệu khi xoá cache.
      </p>
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Xuất backup (.json)
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
          <Upload className="w-4 h-4" /> Nhập từ file backup
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
      <div className="mt-4 text-xs text-muted-foreground space-y-0.5">
        <p>Học viên: <span className="font-medium text-foreground">{data.students.length}</span></p>
        <p>Buổi học: <span className="font-medium text-foreground">{data.sessions.length}</span></p>
        <p>Thanh toán: <span className="font-medium text-foreground">{data.payments.length}</span></p>
      </div>
    </Section>
  );
}

// ── 2. Studio Info ────────────────────────────────────────────────────────────
function StudioSection() {
  const { config, updateConfig } = useAppStore();
  const [studioName, setStudioName] = useState(config.studioName);
  const [teacherName, setTeacherName] = useState(config.teacherName);

  const handleSave = () => {
    updateConfig({ studioName: studioName.trim() || config.studioName, teacherName: teacherName.trim() || config.teacherName });
    toast.success("Đã lưu thông tin studio");
  };

  return (
    <Section icon={User} title="Thông tin studio">
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Tên studio</Label>
          <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="PT Studio" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Hiển thị trên thanh điều hướng và biên lai email</p>
        </div>
        <div>
          <Label className="text-xs">Tên giảng viên</Label>
          <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Tuấn" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Hiển thị trong biên lai gửi cho học viên</p>
        </div>
        <Button size="sm" onClick={handleSave} className="gap-2">
          <Save className="w-3.5 h-3.5" /> Lưu
        </Button>
      </div>
    </Section>
  );
}

// ── 3. EmailJS Config ─────────────────────────────────────────────────────────
function EmailSection() {
  const { config, updateConfig } = useAppStore();
  const [serviceId, setServiceId] = useState(config.emailjs.serviceId);
  const [templateId, setTemplateId] = useState(config.emailjs.templateId);
  const [publicKey, setPublicKey] = useState(config.emailjs.publicKey);

  const handleSave = () => {
    updateConfig({ emailjs: { serviceId: serviceId.trim(), templateId: templateId.trim(), publicKey: publicKey.trim() } });
    toast.success("Đã lưu cấu hình EmailJS");
  };

  return (
    <Section icon={Mail} title="Cấu hình Email (EmailJS)">
      <p className="text-sm text-muted-foreground mb-3">
        Dùng để tự động gửi biên lai cho học viên khi ghi nhận thanh toán.{" "}
        <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="text-primary underline">Đăng ký EmailJS</a>
      </p>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Service ID</Label>
          <Input value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="service_xxxxxxx" className="mt-1 font-mono text-sm" />
        </div>
        <div>
          <Label className="text-xs">Template ID</Label>
          <Input value={templateId} onChange={(e) => setTemplateId(e.target.value)} placeholder="template_xxxxxxx" className="mt-1 font-mono text-sm" />
        </div>
        <div>
          <Label className="text-xs">Public Key</Label>
          <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxx" className="mt-1 font-mono text-sm" />
        </div>
        <Button size="sm" onClick={handleSave} className="gap-2">
          <Save className="w-3.5 h-3.5" /> Lưu
        </Button>
      </div>
    </Section>
  );
}

// ── 4. Schedule Settings ──────────────────────────────────────────────────────
function ScheduleSection() {
  const { config, updateConfig } = useAppStore();
  const [startHour, setStartHour] = useState(String(config.schedule.startHour));
  const [endHour, setEndHour] = useState(String(config.schedule.endHour));
  const [defaultDuration, setDefaultDuration] = useState(String(config.schedule.defaultDuration));
  const [defaultAttended, setDefaultAttended] = useState(config.schedule.defaultAttended);

  const handleSave = () => {
    const start = Math.max(0, Math.min(22, Number(startHour) || 5));
    const end   = Math.max(start + 1, Math.min(23, Number(endHour) || 23));
    const dur   = Math.max(0.5, Math.min(8, Number(defaultDuration) || 2));
    updateConfig({ schedule: { startHour: start, endHour: end, defaultDuration: dur, defaultAttended } });
    toast.success("Đã lưu cài đặt lịch học");
  };

  return (
    <Section icon={Calendar} title="Cài đặt lịch học">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Giờ bắt đầu hiển thị</Label>
            <Input type="number" value={startHour} min={0} max={22} onChange={(e) => setStartHour(e.target.value)} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Giờ đầu tiên trên lịch (mặc định: 5)</p>
          </div>
          <div>
            <Label className="text-xs">Giờ kết thúc hiển thị</Label>
            <Input type="number" value={endHour} min={1} max={23} onChange={(e) => setEndHour(e.target.value)} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Giờ cuối trên lịch (mặc định: 23)</p>
          </div>
        </div>
        <div>
          <Label className="text-xs">Thời lượng mặc định khi kéo học viên vào lịch (giờ)</Label>
          <Input type="number" value={defaultDuration} min={0.5} max={8} step={0.5} onChange={(e) => setDefaultDuration(e.target.value)} className="mt-1 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="defaultAttended"
            checked={defaultAttended}
            onCheckedChange={(v) => setDefaultAttended(!!v)}
          />
          <Label htmlFor="defaultAttended" className="text-sm cursor-pointer">
            Mặc định đánh dấu buổi mới là "Đã tập"
          </Label>
        </div>
        <Button size="sm" onClick={handleSave} className="gap-2">
          <Save className="w-3.5 h-3.5" /> Lưu
        </Button>
      </div>
    </Section>
  );
}

// ── 5. Danger Zone ────────────────────────────────────────────────────────────
function DangerSection() {
  const { clearAll } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="border-2 border-destructive/30 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-destructive">Vùng nguy hiểm</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Xoá toàn bộ dữ liệu bao gồm học viên, buổi học, và thanh toán. Hành động này không thể hoàn tác. Hãy xuất backup trước.
            </p>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Xoá toàn bộ dữ liệu
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn chắc chắn muốn xoá?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ học viên, buổi học và thanh toán sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { clearAll(); toast.success("Đã xoá toàn bộ dữ liệu"); setConfirmOpen(false); }}
            >
              Xoá tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Cài đặt</h2>
      <BackupSection />
      <StudioSection />
      <EmailSection />
      <ScheduleSection />
      <DangerSection />
    </div>
  );
}
