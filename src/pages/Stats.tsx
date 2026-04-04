import { useState, useMemo } from "react";
import { useAppStore } from "@/components/Layout";
import { formatVND, getISOWeek, getMonday, getWeekDays, toDateStr } from "@/lib/helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function StatsPage() {
  return (
    <div className="p-6 max-w-5xl">
      <h2 className="text-2xl font-bold mb-6">Thống kê</h2>
      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Theo tuần</TabsTrigger>
          <TabsTrigger value="month">Theo tháng</TabsTrigger>
          <TabsTrigger value="debt">Công nợ</TabsTrigger>
        </TabsList>
        <TabsContent value="week"><WeekStats /></TabsContent>
        <TabsContent value="month"><MonthStats /></TabsContent>
        <TabsContent value="debt"><DebtStats /></TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCards({ totalFee, totalPaid, remaining }: { totalFee: number; totalPaid: number; remaining: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-card border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Tổng phát sinh</p>
        <p className="text-xl font-bold mt-1">{formatVND(totalFee)}</p>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Tổng đã trả</p>
        <p className="text-xl font-bold mt-1 text-success">{formatVND(totalPaid)}</p>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Còn lại</p>
        <p className={`text-xl font-bold mt-1 ${remaining > 0 ? "text-destructive" : ""}`}>{formatVND(remaining)}</p>
      </div>
    </div>
  );
}

function StudentTable({ rows }: { rows: { name: string; color: string; sessions: number; hours: number; fee: number; paid: number; remaining: number }[] }) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Học viên</th>
            <th className="text-right p-3 font-medium">Số buổi</th>
            <th className="text-right p-3 font-medium">Tổng giờ</th>
            <th className="text-right p-3 font-medium">Phát sinh</th>
            <th className="text-right p-3 font-medium">Đã trả</th>
            <th className="text-right p-3 font-medium">Còn lại</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="p-3 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: r.color }} />
                {r.name}
              </td>
              <td className="p-3 text-right">{r.sessions}</td>
              <td className="p-3 text-right">{r.hours}h</td>
              <td className="p-3 text-right">{formatVND(r.fee)}</td>
              <td className="p-3 text-right text-success">{formatVND(r.paid)}</td>
              <td className={`p-3 text-right font-medium ${r.remaining > 0 ? "text-destructive" : ""}`}>
                {formatVND(r.remaining)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekStats() {
  const { data } = useAppStore();
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const weekNum = getISOWeek(monday);
  const year = monday.getFullYear();
  const weekDays = getWeekDays(monday);
  const startDate = toDateStr(weekDays[0]);
  const endDate = toDateStr(weekDays[6]);

  const rows = useMemo(() => {
    return data.students.map((s) => {
      const sessions = data.sessions.filter(
        (sess) => sess.studentId === s.id && sess.attended && sess.date >= startDate && sess.date <= endDate
      );
      const hours = sessions.reduce((sum, sess) => sum + sess.duration, 0);
      const fee = hours * s.pricePerHour;
      const paid = data.payments
        .filter((p) => p.studentId === s.id && p.date >= startDate && p.date <= endDate)
        .reduce((sum, p) => sum + p.amount, 0);
      return { name: s.name, color: s.color, sessions: sessions.length, hours, fee, paid, remaining: Math.max(0, fee - paid) };
    }).filter((r) => r.sessions > 0);
  }, [data, startDate, endDate]);

  const totalFee = rows.reduce((s, r) => s + r.fee, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d); }}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-sm">Tuần {weekNum} — {year}</span>
        <Button variant="ghost" size="icon" onClick={() => { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d); }}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <SummaryCards totalFee={totalFee} totalPaid={totalPaid} remaining={Math.max(0, totalFee - totalPaid)} />
      {rows.length > 0 ? <StudentTable rows={rows} /> : <p className="text-sm text-muted-foreground text-center py-8">Không có buổi học trong tuần này</p>}
    </div>
  );
}

function MonthStats() {
  const { data } = useAppStore();
  const [monthStr, setMonthStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const rows = useMemo(() => {
    return data.students.map((s) => {
      const sessions = data.sessions.filter(
        (sess) => sess.studentId === s.id && sess.attended && sess.date.startsWith(monthStr)
      );
      const hours = sessions.reduce((sum, sess) => sum + sess.duration, 0);
      const fee = hours * s.pricePerHour;
      const paid = data.payments
        .filter((p) => p.studentId === s.id && p.date.startsWith(monthStr))
        .reduce((sum, p) => sum + p.amount, 0);
      return { name: s.name, color: s.color, sessions: sessions.length, hours, fee, paid, remaining: Math.max(0, fee - paid) };
    }).filter((r) => r.sessions > 0);
  }, [data, monthStr]);

  const totalFee = rows.reduce((s, r) => s + r.fee, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);

  return (
    <div className="mt-4">
      <div className="mb-4">
        <Input type="month" value={monthStr} onChange={(e) => setMonthStr(e.target.value)} className="w-48" />
      </div>
      <SummaryCards totalFee={totalFee} totalPaid={totalPaid} remaining={Math.max(0, totalFee - totalPaid)} />
      {rows.length > 0 ? <StudentTable rows={rows} /> : <p className="text-sm text-muted-foreground text-center py-8">Không có dữ liệu tháng này</p>}
    </div>
  );
}

function DebtStats() {
  const { data } = useAppStore();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = String(now.getFullYear());

  const rows = useMemo(() => {
    return data.students.map((s) => {
      const allSessions = data.sessions.filter((sess) => sess.studentId === s.id && sess.attended);
      const totalFee = allSessions.reduce((sum, sess) => sum + sess.duration * s.pricePerHour, 0);
      const totalPaid = data.payments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0);
      const monthFee = allSessions.filter((sess) => sess.date.startsWith(currentMonth)).reduce((sum, sess) => sum + sess.duration * s.pricePerHour, 0);
      const yearFee = allSessions.filter((sess) => sess.date.startsWith(currentYear)).reduce((sum, sess) => sum + sess.duration * s.pricePerHour, 0);
      return {
        name: s.name, color: s.color, totalFee, totalPaid,
        debt: Math.max(0, totalFee - totalPaid), monthFee, yearFee,
      };
    }).filter((r) => r.totalFee > 0);
  }, [data, currentMonth, currentYear]);

  const grandFee = rows.reduce((s, r) => s + r.totalFee, 0);
  const grandPaid = rows.reduce((s, r) => s + r.totalPaid, 0);
  const grandDebt = rows.reduce((s, r) => s + r.debt, 0);

  return (
    <div className="mt-4">
      <SummaryCards totalFee={grandFee} totalPaid={grandPaid} remaining={grandDebt} />
      {rows.length > 0 ? (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Học viên</th>
                <th className="text-right p-3 font-medium">Tổng phát sinh</th>
                <th className="text-right p-3 font-medium">Đã trả</th>
                <th className="text-right p-3 font-medium">Công nợ</th>
                <th className="text-right p-3 font-medium">Tháng này</th>
                <th className="text-right p-3 font-medium">Năm này</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </td>
                  <td className="p-3 text-right">{formatVND(r.totalFee)}</td>
                  <td className="p-3 text-right text-success">{formatVND(r.totalPaid)}</td>
                  <td className={`p-3 text-right font-medium ${r.debt > 0 ? "text-destructive" : ""}`}>{formatVND(r.debt)}</td>
                  <td className="p-3 text-right">{formatVND(r.monthFee)}</td>
                  <td className="p-3 text-right">{formatVND(r.yearFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
      )}
    </div>
  );
}
