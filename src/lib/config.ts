import { useState, useCallback } from "react";
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, TEACHER_NAME } from "./emailConfig";

export interface AppConfig {
  studioName: string;
  teacherName: string;
  emailjs: {
    serviceId: string;
    templateId: string;
    publicKey: string;
  };
  schedule: {
    startHour: number;
    endHour: number;
    defaultDuration: number;
    defaultAttended: boolean;
  };
}

const CONFIG_KEY = "tt_config";

export const defaultConfig: AppConfig = {
  studioName: "PT Studio",
  teacherName: TEACHER_NAME,
  emailjs: {
    serviceId: EMAILJS_SERVICE_ID,
    templateId: EMAILJS_TEMPLATE_ID,
    publicKey: EMAILJS_PUBLIC_KEY,
  },
  schedule: {
    startHour: 5,
    endHour: 23,
    defaultDuration: 2,
    defaultAttended: true,
  },
};

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...defaultConfig };
    const stored = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...defaultConfig,
      ...stored,
      emailjs: { ...defaultConfig.emailjs, ...(stored.emailjs ?? {}) },
      schedule: { ...defaultConfig.schedule, ...(stored.schedule ?? {}) },
    };
  } catch {
    return { ...defaultConfig };
  }
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next: AppConfig = {
        ...prev,
        ...updates,
        emailjs: { ...prev.emailjs, ...(updates.emailjs ?? {}) },
        schedule: { ...prev.schedule, ...(updates.schedule ?? {}) },
      };
      saveConfig(next);
      return next;
    });
  }, []);

  return { config, updateConfig };
}
