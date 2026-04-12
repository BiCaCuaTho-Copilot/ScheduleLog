import React, { createContext, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Users, CalendarDays, CreditCard, BarChart3, Settings } from "lucide-react";

type StoreReturn = ReturnType<typeof useStore>;
const StoreContext = createContext<StoreReturn | null>(null);

export function useAppStore(): StoreReturn {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used within StoreProvider");
  return ctx;
}

const navItems = [
  { path: "/students", label: "Học viên", icon: Users },
  { path: "/schedule", label: "Lịch dạy", icon: CalendarDays },
  { path: "/fees", label: "Học phí", icon: CreditCard },
  { path: "/stats", label: "Thống kê", icon: BarChart3 },
  { path: "/settings", label: "Cài đặt", icon: Settings },
];

function SidebarNav() {
  const location = useLocation();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar flex flex-col z-30">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-primary-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-sidebar-primary" />
          <span>PT Studio</span>
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || (path === "/students" && location.pathname === "/");
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium sidebar-transition ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-sidebar-muted border-t border-sidebar-border">
        Dữ liệu lưu cục bộ
      </div>
    </aside>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  return (
    <StoreContext.Provider value={store}>
      <div className="min-h-screen">
        <SidebarNav />
        <main className="ml-56 min-h-screen">
          {children}
        </main>
      </div>
    </StoreContext.Provider>
  );
}
