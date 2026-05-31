import { useState, useMemo } from "react";
import { useAppStore } from "@/components/Layout";
import { formatVND, getISOWeek, getMonday, getWeekDays, toDateStr, getPriceAtDate } from "@/lib/helpers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function StatsPage() {
  return (
    <div className="p-6 max-w-5xl">
      <h2 className="text-2xl font-bold mb-6">Thống kê</h2>
      <IncomeSummary />
      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Theo tuần</TabsTrigger>
          <TabsTrigger value="month">Theo tháng</TabsTrigger>
          <TabsTrigger value="debt">Công nợ</TabsTrigger>
          <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
        </TabsList>
        <TabsContent value="week"><WeekStats /></TabsContent>
        <TabsContent value="month"><MonthStats /></TabsContent>
        <TabsContent value="debt"><DebtStats /></TabsContent>
        <TabsContent value="chart"><ChartStats /></TabsContent>
      </Tabs>
    </div>
  );
}

function IncomeSummary() {
  const { data } = useAppStore();
  const now = new Date();

  const thisMonday = getMonday(now);
  const weekDays = getWeekDays(thisMonday);
  const weekStart = toDateStr(weekDays[0]);
  const weekEnd = toDateStr(weekDays[6]);
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearStr = String(now.getFullYear());

  const weekIncome  = data.payments.filter((p) => p.date >= weekStart && p.date <= weekEnd).reduce((s, p) => s + p.amount, 0);
  const monthIncome = data.payments.filter((p) => p.date.startsWith(monthStr)).reduce((s, p) => s + p.amount, 0);
  const yearIncome  = data.payments.filter((p) => p.date.startsWith(yearStr)).reduce((s, p) => s + p.amount, 0);
  const totalIncome = data.payments.reduce((s, p) => s + p.amount, 0);

  const cards = [
    { label: "Tuần này",   value: weekIncome,  sub: `${weekStart} – ${weekEnd}` },
    { label: "Tháng này",  value: monthIncome, sub: monthStr.replace("-", "/") },
    { label: "Năm này",    value: yearIncome,  sub: yearStr },
    { label: "Tổng cộng",  value: totalIncome, sub: "Tất cả thời gian", highlight: true },
  ];

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Thu nhập (đã thu)</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-5 ${c.highlight ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
            <p className={`text-xs font-medium mb-1 ${c.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{c.label}</p>
            <p className={`text-xl font-bold leading-tight ${c.highlight ? "text-primary-foreground" : "text-success"}`}>{formatVND(c.value)}</p>
            <p className={`text-[11px] mt-1 ${c.highlight ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCards({ totalFee, totalPaid, debt, overpaid }: { totalFee: number; totalPaid: number; debt: number; overpaid: number }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-card border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Tổng phát sinh</p>
        <p className="text-xl font-bold mt-1">{formatVND(totalFee)}</p>
      </div>
      <div className="bg-card border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">Tổng đã trả</p>
        <p className="text-xl font-bold mt-1 text-success">{formatVND(totalPaid)}</p>
      </div>
      <div className="bg-card border rounded-lg p-4 border-destructive/30">
        <p className="text-xs text-destructive/70">Còn thiếu</p>
        <p className="text-xl font-bold mt-1 text-destructive">{debt > 0 ? formatVND(debt) : "—"}</p>
      </div>
      <div className="bg-card border rounded-lg p-4 border-blue-400/30">
        <p className="text-xs text-blue-500/70">Trả Dư</p>
        <p className="text-xl font-bold mt-1 text-blue-500">{overpaid > 0 ? formatVND(overpaid) : "—"}</p>
      </div>
    </div>
  );
}

type StudentRow = { name: string; color: string; sessions: number; hours: number; fee: number; paid: number; balance: number; pricePerHour: number };

function equivText(amount: number, pricePerSession: number) {
  if (pricePerSession <= 0) return "";
  const sessions = Math.round(amount / pricePerSession);
  return sessions >= 1 ? `≈ ${sessions} buổi` : "";
}

function StudentTable({ rows }: { rows: StudentRow[] }) {
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
            <th className="text-right p-3 font-medium text-destructive">Còn thiếu</th>
            <th className="text-right p-3 font-medium text-blue-500">Trả Dư</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const over = r.balance > 0 ? r.balance : 0;
            const shortage = r.balance < 0 ? -r.balance : 0;
            return (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.name}
                </td>
                <td className="p-3 text-right">{r.sessions}</td>
                <td className="p-3 text-right">{r.hours}h</td>
                <td className="p-3 text-right">{formatVND(r.fee)}</td>
                <td className="p-3 text-right text-success">{formatVND(r.paid)}</td>
                <td className="p-3 text-right font-medium text-destructive">
                  {shortage > 0 ? formatVND(shortage) : "—"}
                </td>
                <td className="p-3 text-right font-medium text-blue-500">
                  {over > 0 ? (
                    <div>
                      <div>Dư {formatVND(over)}</div>
                      <div className="text-xs opacity-60">{equivText(over, r.pricePerHour)}</div>
                    </div>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeekStats() {
  const { data } = useAppStore();
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [search, setSearch] = useState("");
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
      const fee = sessions.reduce((sum, sess) => sum + getPriceAtDate(s, sess.date), 0);
      const paid = data.payments
        .filter((p) => p.studentId === s.id && p.date >= startDate && p.date <= endDate)
        .reduce((sum, p) => sum + p.amount, 0);
      return { name: s.name, color: s.color, sessions: sessions.length, hours, fee, paid, balance: paid - fee, pricePerHour: s.pricePerHour };
    }).filter((r) => r.sessions > 0 || r.paid > 0);
  }, [data, startDate, endDate]);

  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const totalFee = rows.reduce((s, r) => s + r.fee, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalDebt = rows.reduce((s, r) => s + Math.max(0, -r.balance), 0);
  const totalOver = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);

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
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm học viên..."
          className="w-40 h-8 text-sm ml-2"
        />
      </div>
      <SummaryCards totalFee={totalFee} totalPaid={totalPaid} debt={totalDebt} overpaid={totalOver} />
      {rows.length > 0 ? <StudentTable rows={filteredRows} /> : <p className="text-sm text-muted-foreground text-center py-8">Không có buổi học trong tuần này</p>}
    </div>
  );
}

function MonthStats() {
  const { data } = useAppStore();
  const [monthStr, setMonthStr] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return data.students.map((s) => {
      const sessions = data.sessions.filter(
        (sess) => sess.studentId === s.id && sess.attended && sess.date.startsWith(monthStr)
      );
      const hours = sessions.reduce((sum, sess) => sum + sess.duration, 0);
      const fee = sessions.reduce((sum, sess) => sum + getPriceAtDate(s, sess.date), 0);
      const paid = data.payments
        .filter((p) => p.studentId === s.id && p.date.startsWith(monthStr))
        .reduce((sum, p) => sum + p.amount, 0);
      return { name: s.name, color: s.color, sessions: sessions.length, hours, fee, paid, balance: paid - fee, pricePerHour: s.pricePerHour };
    }).filter((r) => r.sessions > 0 || r.paid > 0);
  }, [data, monthStr]);

  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const totalFee = rows.reduce((s, r) => s + r.fee, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalDebt = rows.reduce((s, r) => s + Math.max(0, -r.balance), 0);
  const totalOver = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-4">
        <Input type="month" value={monthStr} onChange={(e) => setMonthStr(e.target.value)} className="w-48" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm học viên..."
          className="w-40 h-8 text-sm"
        />
      </div>
      <SummaryCards totalFee={totalFee} totalPaid={totalPaid} debt={totalDebt} overpaid={totalOver} />
      {rows.length > 0 ? <StudentTable rows={filteredRows} /> : <p className="text-sm text-muted-foreground text-center py-8">Không có dữ liệu tháng này</p>}
    </div>
  );
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-medium">{formatVND(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueChart({ chartData }: { chartData: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Line type="monotone" dataKey="Phát sinh" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Đã thu" stroke="hsl(142 60% 45%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(142 60% 45%)" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartStats() {
  const { data } = useAppStore();
  const now = new Date();

  // Helper: fee from sessions in a date range
  const feeInRange = (start: string, end: string) =>
    data.sessions
      .filter((s) => s.attended && s.date >= start && s.date <= end)
      .reduce((sum, s) => {
        const st = data.students.find((x) => x.id === s.studentId);
        return sum + (st ? getPriceAtDate(st, s.date) : 0);
      }, 0);

  const feeStartsWith = (prefix: string) =>
    data.sessions
      .filter((s) => s.attended && s.date.startsWith(prefix))
      .reduce((sum, s) => {
        const st = data.students.find((x) => x.id === s.studentId);
        return sum + (st ? getPriceAtDate(st, s.date) : 0);
      }, 0);

  const paidInRange = (start: string, end: string) =>
    data.payments.filter((p) => p.date >= start && p.date <= end).reduce((s, p) => s + p.amount, 0);

  const paidStartsWith = (prefix: string) =>
    data.payments.filter((p) => p.date.startsWith(prefix)).reduce((s, p) => s + p.amount, 0);

  // ── Weekly: last 16 weeks ─────────────────────────────────────────────────
  const weeklyData = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - 7 * (15 - i));
      const mon = getMonday(d);
      const days = getWeekDays(mon);
      const start = toDateStr(days[0]);
      const end = toDateStr(days[6]);
      const wn = getISOWeek(mon);
      return {
        label: `T${wn}`,
        "Phát sinh": feeInRange(start, end),
        "Đã thu": paidInRange(start, end),
      };
    });
  }, [data]);

  // ── Monthly: last 12 months ───────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
        "Phát sinh": feeStartsWith(prefix),
        "Đã thu": paidStartsWith(prefix),
      };
    });
  }, [data]);

  // ── Yearly: all years present in data ────────────────────────────────────
  const yearlyData = useMemo(() => {
    const years = [...new Set([
      ...data.payments.map((p) => p.date.slice(0, 4)),
      ...data.sessions.map((s) => s.date.slice(0, 4)),
    ])].sort();
    if (years.length === 0) {
      const y = String(now.getFullYear());
      return [{ label: y, "Phát sinh": 0, "Đã thu": 0 }];
    }
    return years.map((y) => ({
      label: y,
      "Phát sinh": feeStartsWith(y),
      "Đã thu": paidStartsWith(y),
    }));
  }, [data]);

  const noData = data.payments.length === 0 && data.sessions.length === 0;

  if (noData) {
    return <p className="text-sm text-muted-foreground text-center py-16">Chưa có dữ liệu để vẽ biểu đồ</p>;
  }

  return (
    <div className="mt-4">
      <Tabs defaultValue="cw">
        <TabsList className="mb-2">
          <TabsTrigger value="cw">Theo tuần</TabsTrigger>
          <TabsTrigger value="cm">Theo tháng</TabsTrigger>
          <TabsTrigger value="cy">Theo năm</TabsTrigger>
        </TabsList>

        <TabsContent value="cw">
          <div className="bg-card border rounded-xl p-5">
            <div className="mb-4">
              <p className="font-semibold text-sm">Doanh thu 16 tuần gần nhất</p>
              <p className="text-xs text-muted-foreground mt-0.5">Phát sinh vs Đã thu theo từng tuần</p>
            </div>
            <RevenueChart chartData={weeklyData} />
          </div>
        </TabsContent>

        <TabsContent value="cm">
          <div className="bg-card border rounded-xl p-5">
            <div className="mb-4">
              <p className="font-semibold text-sm">Doanh thu 12 tháng gần nhất</p>
              <p className="text-xs text-muted-foreground mt-0.5">Phát sinh vs Đã thu theo từng tháng</p>
            </div>
            <RevenueChart chartData={monthlyData} />
          </div>
        </TabsContent>

        <TabsContent value="cy">
          <div className="bg-card border rounded-xl p-5">
            <div className="mb-4">
              <p className="font-semibold text-sm">Doanh thu theo năm</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tổng phát sinh và đã thu từng năm</p>
            </div>
            <RevenueChart chartData={yearlyData} />
            <div className="mt-8 grid grid-cols-3 gap-4">
              {yearlyData.map((y) => (
                <div key={y.label} className="bg-muted/40 rounded-lg p-4">
                  <p className="text-sm font-bold mb-2">{y.label}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Phát sinh</span>
                      <span>{formatVND(y["Phát sinh"] as number)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Đã thu</span>
                      <span className="text-success font-medium">{formatVND(y["Đã thu"] as number)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DebtStats() {
  const { data } = useAppStore();
  const [search, setSearch] = useState("");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = String(now.getFullYear());

  const rows = useMemo(() => {
    return data.students.map((s) => {
      const allSessions = data.sessions.filter((sess) => sess.studentId === s.id && sess.attended);
      const attendedFee = allSessions.reduce((sum, sess) => sum + getPriceAtDate(s, sess.date), 0);
      // Buổi booking còn lại (chưa học) × giá hiện tại
      const remainingBooked = Math.max(0, (s.bookedSessions ?? 0) - allSessions.length);
      const totalFee = attendedFee + remainingBooked * s.pricePerHour + (s.previousDebt ?? 0);
      const totalPaid = data.payments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0);
      const monthFee = allSessions.filter((sess) => sess.date.startsWith(currentMonth)).reduce((sum, sess) => sum + getPriceAtDate(s, sess.date), 0);
      const yearFee = allSessions.filter((sess) => sess.date.startsWith(currentYear)).reduce((sum, sess) => sum + getPriceAtDate(s, sess.date), 0);
      const debt = Math.max(0, totalFee - totalPaid);
      const overpaid = Math.max(0, totalPaid - totalFee);
      return {
        name: s.name, color: s.color, totalFee, totalPaid,
        debt, overpaid,
        pricePerHour: s.pricePerHour,
        monthFee, yearFee,
      };
    }).filter((r) => r.totalFee > 0 || r.totalPaid > 0);
  }, [data, currentMonth, currentYear]);

  const grandFee = rows.reduce((s, r) => s + r.totalFee, 0);
  const grandPaid = rows.reduce((s, r) => s + r.totalPaid, 0);
  const grandDebt = rows.reduce((s, r) => s + r.debt, 0);
  const grandOver = rows.reduce((s, r) => s + r.overpaid, 0);

  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mt-4">
      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm học viên..."
          className="w-48 h-8 text-sm"
        />
      </div>
      <SummaryCards totalFee={grandFee} totalPaid={grandPaid} debt={grandDebt} overpaid={grandOver} />
      {rows.length > 0 ? (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Học viên</th>
                <th className="text-right p-3 font-medium">Tổng phát sinh</th>
                <th className="text-right p-3 font-medium">Đã trả</th>
                <th className="text-right p-3 font-medium text-destructive">Còn thiếu</th>
                <th className="text-right p-3 font-medium text-blue-500">Trả Dư</th>
                <th className="text-right p-3 font-medium">Tiền học Tháng này</th>
                <th className="text-right p-3 font-medium">Tiền học Năm này</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.name}
                  </td>
                  <td className="p-3 text-right">{formatVND(r.totalFee)}</td>
                  <td className="p-3 text-right text-success">{formatVND(r.totalPaid)}</td>
                  <td className="p-3 text-right font-medium text-destructive">
                    {r.debt > 0 ? formatVND(r.debt) : "—"}
                  </td>
                  <td className="p-3 text-right font-medium text-blue-500">
                    {r.overpaid > 0 ? (
                      <div>
                        <div>Dư {formatVND(r.overpaid)}</div>
                        <div className="text-xs opacity-60">{equivText(r.overpaid, r.pricePerHour)}</div>
                      </div>
                    ) : "—"}
                  </td>
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
