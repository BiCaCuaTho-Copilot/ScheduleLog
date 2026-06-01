import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export interface PriceChange {
  effectiveFrom: string; // YYYY-MM-DD
  price: number;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  pricePerHour: number;
  priceHistory?: PriceChange[];
  bookedSessions?: number;
  freeSessions?: number;
  depositSessions?: number;
  previousDebt?: number;
  status: "active" | "inactive";
  color: string;
  createdAt: string;
}

export interface Session {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  duration: number;
  attended: boolean;
  checkedIn?: boolean;
  note: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  note: string;
}

export interface AppData {
  students: Student[];
  sessions: Session[];
  payments: Payment[];
}

const LEGACY_KEY = "tt_data";

// ── Migrate localStorage → Firestore (chạy 1 lần) ──────────────────────────
async function migrateFromLocalStorage() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const local = JSON.parse(raw) as AppData;
    const hasData =
      (local.students?.length ?? 0) +
      (local.sessions?.length ?? 0) +
      (local.payments?.length ?? 0) > 0;
    if (!hasData) return;

    const batch = writeBatch(db);
    (local.students ?? []).forEach((s) => batch.set(doc(db, "students", s.id), s));
    (local.sessions ?? []).forEach((s) => batch.set(doc(db, "sessions", s.id), s));
    (local.payments ?? []).forEach((p) => batch.set(doc(db, "payments", p.id), p));
    await batch.commit();
    localStorage.removeItem(LEGACY_KEY);
    console.log("[PT Studio] Migrated localStorage → Firestore ✓");
  } catch (e) {
    console.error("[PT Studio] Migration failed", e);
  }
}

// ── Main store hook ─────────────────────────────────────────────────────────
export function useStore() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [migratedRef] = useState({ done: false });

  const data: AppData = useMemo(
    () => ({ students, sessions, payments }),
    [students, sessions, payments],
  );

  // Real-time listeners
  useEffect(() => {
    let studentsReady = false;
    let sessionsReady = false;
    let paymentsReady = false;

    const checkReady = () => {
      if (studentsReady && sessionsReady && paymentsReady) setLoading(false);
    };

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map((d) => d.data() as Student));
      studentsReady = true;
      checkReady();
    });

    const unsubSessions = onSnapshot(collection(db, "sessions"), (snap) => {
      setSessions(snap.docs.map((d) => d.data() as Session));
      sessionsReady = true;
      checkReady();
    });

    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(snap.docs.map((d) => d.data() as Payment));
      paymentsReady = true;
      checkReady();
    });

    return () => {
      unsubStudents();
      unsubSessions();
      unsubPayments();
    };
  }, []);

  // Migrate localStorage once after initial load
  useEffect(() => {
    if (!loading && !migratedRef.done) {
      migratedRef.done = true;
      migrateFromLocalStorage();
    }
  }, [loading, migratedRef]);

  // ── Students ──────────────────────────────────────────────────────────────
  const addStudent = useCallback((s: Student) => {
    setDoc(doc(db, "students", s.id), s).catch(console.error);
  }, []);

  const updateStudent = useCallback((s: Student) => {
    const old = students.find((x) => x.id === s.id);
    if (old && old.pricePerHour !== s.pricePerHour) {
      const today = new Date().toISOString().slice(0, 10);
      const existingHistory: PriceChange[] = old.priceHistory ?? [
        { effectiveFrom: old.createdAt.slice(0, 10), price: old.pricePerHour },
      ];
      const updated: Student = {
        ...s,
        priceHistory: [
          ...existingHistory.filter((e) => e.effectiveFrom !== today),
          { effectiveFrom: today, price: s.pricePerHour },
        ],
      };
      setDoc(doc(db, "students", s.id), updated).catch(console.error);
    } else {
      setDoc(doc(db, "students", s.id), s).catch(console.error);
    }
  }, [students]);

  const deleteStudent = useCallback((id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "students", id));
    sessions.filter((s) => s.studentId === id).forEach((s) => batch.delete(doc(db, "sessions", s.id)));
    payments.filter((p) => p.studentId === id).forEach((p) => batch.delete(doc(db, "payments", p.id)));
    batch.commit().catch(console.error);
  }, [sessions, payments]);

  // ── Sessions ──────────────────────────────────────────────────────────────
  const addSession = useCallback((s: Session) => {
    setDoc(doc(db, "sessions", s.id), s).catch(console.error);
  }, []);

  const addSessions = useCallback((list: Session[]) => {
    const batch = writeBatch(db);
    list.forEach((s) => batch.set(doc(db, "sessions", s.id), s));
    batch.commit().catch(console.error);
  }, []);

  const updateSession = useCallback((s: Session) => {
    setDoc(doc(db, "sessions", s.id), s).catch(console.error);
  }, []);

  const deleteSession = useCallback((id: string) => {
    deleteDoc(doc(db, "sessions", id)).catch(console.error);
  }, []);

  // ── Payments ──────────────────────────────────────────────────────────────
  const addPayment = useCallback((p: Payment) => {
    setDoc(doc(db, "payments", p.id), p).catch(console.error);
  }, []);

  const deletePayment = useCallback((id: string) => {
    deleteDoc(doc(db, "payments", id)).catch(console.error);
  }, []);

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    const batch = writeBatch(db);
    students.forEach((s) => batch.delete(doc(db, "students", s.id)));
    sessions.forEach((s) => batch.delete(doc(db, "sessions", s.id)));
    payments.forEach((p) => batch.delete(doc(db, "payments", p.id)));
    batch.commit().catch(console.error);
  }, [students, sessions, payments]);

  return {
    data, loading,
    addStudent, updateStudent, deleteStudent,
    addSession, addSessions, updateSession, deleteSession,
    addPayment, deletePayment,
    clearAll,
  };
}
