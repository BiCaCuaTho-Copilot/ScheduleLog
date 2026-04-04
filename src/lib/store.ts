import { useState, useEffect, useCallback } from "react";

export interface Student {
  id: string;
  name: string;
  pricePerHour: number;
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

const STORAGE_KEY = "tt_data";

const defaultData: AppData = {
  students: [],
  sessions: [],
  payments: [],
};

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    return JSON.parse(raw) as AppData;
  } catch {
    return { ...defaultData };
  }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStore() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      return next;
    });
  }, []);

  // Students
  const addStudent = useCallback((s: Student) => {
    updateData((d) => ({ ...d, students: [...d.students, s] }));
  }, [updateData]);

  const updateStudent = useCallback((s: Student) => {
    updateData((d) => ({
      ...d,
      students: d.students.map((x) => (x.id === s.id ? s : x)),
    }));
  }, [updateData]);

  const deleteStudent = useCallback((id: string) => {
    updateData((d) => ({
      students: d.students.filter((x) => x.id !== id),
      sessions: d.sessions.filter((x) => x.studentId !== id),
      payments: d.payments.filter((x) => x.studentId !== id),
    }));
  }, [updateData]);

  // Sessions
  const addSession = useCallback((s: Session) => {
    updateData((d) => ({ ...d, sessions: [...d.sessions, s] }));
  }, [updateData]);

  const updateSession = useCallback((s: Session) => {
    updateData((d) => ({
      ...d,
      sessions: d.sessions.map((x) => (x.id === s.id ? s : x)),
    }));
  }, [updateData]);

  const deleteSession = useCallback((id: string) => {
    updateData((d) => ({
      ...d,
      sessions: d.sessions.filter((x) => x.id !== id),
    }));
  }, [updateData]);

  // Payments
  const addPayment = useCallback((p: Payment) => {
    updateData((d) => ({ ...d, payments: [...d.payments, p] }));
  }, [updateData]);

  const deletePayment = useCallback((id: string) => {
    updateData((d) => ({
      ...d,
      payments: d.payments.filter((x) => x.id !== id),
    }));
  }, [updateData]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...defaultData });
  }, []);

  return {
    data,
    addStudent, updateStudent, deleteStudent,
    addSession, updateSession, deleteSession,
    addPayment, deletePayment,
    clearAll,
  };
}
