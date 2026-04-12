import { useState } from "react";
import { useAppStore } from "@/components/Layout";
import { uuid, formatVND, formatDate } from "@/lib/helpers";
import { sendReceiptEmail } from "@/lib/email";
import { EMAILJS_PUBLIC_KEY } from "@/lib/emailConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMAIL_CONFIGURED = EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

export default function FeesPage() {
  const { data, addPayment, deletePayment } = useAppStore();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [filterStudent, setFilterStudent] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [nameSearch, setNameSearch] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSubmit = async () => {
    if (!studentId || !amount) return;
    addPayment({
      id: uuid(),
      studentId,
      amount: Number(amount),
      date,
      note,
    });
    toast.success("Đã ghi nhận thanh toán");

    // Gửi biên lai qua email nếu học viên có email và EmailJS đã cấu hình
    const student = data.students.find((s) => s.id === studentId);
    if (student?.email && EMAIL_CONFIGURED) {
      setSendingEmail(true);
      try {
        await sendReceiptEmail({
          studentEmail: student.email,
          studentName: student.name,
          amount: Number(amount),
          date,
          note,
        });
        toast.success(`Đã gửi biên lai tới ${student.email}`, {
          icon: <Mail className="w-4 h-4" />,
        });
      } catch {
        toast.error("Gửi email thất bại. Kiểm tra lại API key trong emailConfig.ts");
      } finally {
        setSendingEmail(false);
      }
    }

    setAmount("");
    setNote("");
  };

  const filteredPayments = data.payments
    .filter((p) => filterStudent === "all" || p.studentId === filterStudent)
    .filter((p) => {
      if (filterMonth === "all") return true;
      return p.date.slice(0, 7) === filterMonth;
    })
    .filter((p) => {
      if (!nameSearch.trim()) return true;
      const student = data.students.find((s) => s.id === p.studentId);
      return student?.name.toLowerCase().includes(nameSearch.toLowerCase());
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const months = [...new Set(data.payments.map((p) => p.date.slice(0, 7)))].sort().reverse();

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">Học phí</h2>

      {/* Payment form */}
      <div className="bg-card border rounded-lg p-5 mb-8">
        <h3 className="font-semibold mb-4">Ghi nhận thanh toán</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Học viên</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Chọn học viên" /></SelectTrigger>
              <SelectContent>
                {data.students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Số tiền (VNĐ)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1600000" />
          </div>
          <div>
            <Label className="text-xs">Ngày</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú..." />
          </div>
        </div>
        <Button className="mt-4 gap-2" onClick={handleSubmit} disabled={!studentId || !amount || sendingEmail}>
          {sendingEmail ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi email...</> : "Ghi nhận"}
        </Button>
      </div>

      {/* Payment history */}
      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h3 className="font-semibold">Lịch sử thanh toán</h3>
          <Input
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="w-40 h-8 text-sm"
          />
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {data.students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tháng</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chưa có thanh toán nào</p>
        ) : (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Học viên</th>
                  <th className="text-right p-3 font-medium">Số tiền</th>
                  <th className="text-left p-3 font-medium">Ngày</th>
                  <th className="text-left p-3 font-medium">Ghi chú</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const student = data.students.find((s) => s.id === p.studentId);
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: student?.color }} />
                        {student?.name ?? "—"}
                      </td>
                      <td className="p-3 text-right font-medium text-success">+{formatVND(p.amount)}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(p.date)}</td>
                      <td className="p-3 text-muted-foreground">{p.note || "—"}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            deletePayment(p.id);
                            toast.success("Đã xoá thanh toán");
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
