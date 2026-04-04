import { useState } from "react";
import { useAppStore } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data, clearAll } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Cài đặt</h2>

      <div className="bg-card border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-2">Thông tin dữ liệu</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Học viên: {data.students.length}</p>
          <p>Buổi học: {data.sessions.length}</p>
          <p>Thanh toán: {data.payments.length}</p>
        </div>
      </div>

      <div className="border-2 border-destructive/30 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Vùng nguy hiểm</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Xoá toàn bộ dữ liệu bao gồm học viên, buổi học, và thanh toán. Hành động này không thể hoàn tác.
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
              onClick={() => {
                clearAll();
                toast.success("Đã xoá toàn bộ dữ liệu");
                setConfirmOpen(false);
              }}
            >
              Xoá tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
