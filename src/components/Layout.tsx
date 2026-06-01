import React, { createContext, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useConfig } from "@/lib/config";
import { Users, CalendarDays, CreditCard, BarChart3, Settings, Wifi } from "lucide-react";

type StoreReturn = ReturnType<typeof useStore> & ReturnType<typeof useConfig>;
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

function isActive(path: string, pathname: string) {
  return pathname === path || (path === "/students" && pathname === "/");
}

// ── Desktop sidebar ──────────────────────────────────────────────────────────
function SidebarNav() {
  const location = useLocation();
  const { config } = useAppStore();
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar flex-col z-30 hidden md:flex">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-primary-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-sidebar-primary shrink-0" />
          <span className="truncate">{config.studioName}</span>
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path, location.pathname);
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
      <div className="p-4 text-xs text-sidebar-muted border-t border-sidebar-border flex items-center gap-1.5">
        <Wifi className="w-3 h-3" />
        Đồng bộ Firebase
      </div>
    </aside>
  );
}

// ── Mobile top header ─────────────────────────────────────────────────────────
function MobileHeader() {
  const { config } = useAppStore();
  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center px-4 h-12 bg-sidebar border-b border-sidebar-border md:hidden">
      <CalendarDays className="w-4 h-4 text-primary mr-2 shrink-0" />
      <span className="font-bold text-sm text-sidebar-primary-foreground truncate">{config.studioName}</span>
    </header>
  );
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────
function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border md:hidden">
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path, location.pathname);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                active ? "text-primary" : "text-sidebar-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 z-50">
      <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Đang kết nối Firebase...</p>
    </div>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const configStore = useConfig();
  return (
    <StoreContext.Provider value={{ ...store, ...configStore }}>
      {store.loading ? (
        <LoadingScreen />
      ) : (
        <div className="min-h-screen">
          <SidebarNav />
          <MobileHeader />
          <BottomNav />
          {/* Desktop: offset sidebar. Mobile: top header + bottom nav padding */}
          <main className="md:ml-56 pt-12 md:pt-0 pb-20 md:pb-0 min-h-screen">
            {children}
          </main>
        </div>
      )}
    </StoreContext.Provider>
  );
}
