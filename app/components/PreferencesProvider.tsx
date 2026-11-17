"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UserPreferences = {
  language: "en" | "ar";
  theme: "light" | "dark" | "system";
  currency: "EGP" | "USD" | "EUR";
  dateFormat: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
  timeFormat: "12h" | "24h";
  timezone: string;
};

const defaults: UserPreferences = {
  language: "en", theme: "system", currency: "EGP",
  dateFormat: "YYYY-MM-DD", timeFormat: "24h", timezone: "UTC",
};

export function normalizeUserPreferences(value: UserPreferences): UserPreferences {
  return {
    language: value.language,
    theme: value.theme,
    currency: value.currency,
    dateFormat: value.dateFormat,
    timeFormat: value.timeFormat,
    timezone: value.timezone,
  };
}

type PreferenceContextValue = {
  preferences: UserPreferences;
  ready: boolean;
  refresh: () => Promise<void>;
  setPreferences: (preferences: UserPreferences) => void;
};
const PreferencesContext = createContext<PreferenceContextValue>({
  preferences: defaults, ready: false, refresh: async () => {}, setPreferences: () => {},
});
const API = "";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/account/preferences`, { credentials: "include" });
      if (!response.ok) {
        if (response.status !== 401) throw new Error(`Could not load preferences (${response.status}).`);
        return;
      }
      const result = await response.json() as { preferences: UserPreferences };
      setPreferences(normalizeUserPreferences(result.preferences));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh().catch((error: unknown) => console.error("Could not load account preferences:", error));
    const onAuthenticated = () => { void refresh().catch((error: unknown) => console.error("Could not load account preferences:", error)); };
    const onUnauthenticated = () => {
      setPreferences(defaults);
      setReady(true);
    };
    window.addEventListener("businessos:account-authenticated", onAuthenticated);
    window.addEventListener("businessos:account-unauthenticated", onUnauthenticated);
    return () => {
      window.removeEventListener("businessos:account-authenticated", onAuthenticated);
      window.removeEventListener("businessos:account-unauthenticated", onUnauthenticated);
    };
  }, [refresh]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.language;
    root.dir = preferences.language === "ar" ? "rtl" : "ltr";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      root.dataset.theme = preferences.theme === "system"
        ? media.matches ? "dark" : "light"
        : preferences.theme;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [preferences]);

  const value = useMemo(() => ({ preferences, ready, refresh, setPreferences }), [preferences, ready, refresh]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useUserPreferences() {
  return useContext(PreferencesContext);
}

export function formatUserDate(value: string, preferences: UserPreferences, includeTime = false) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = preferences.language === "ar" ? "ar" : "en";
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: dateOnly ? "UTC" : preferences.timezone,
    year: "numeric",
    month: preferences.dateFormat === "YYYY-MM-DD" ? "2-digit" : "numeric",
    day: "2-digit",
    ...(includeTime ? {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: preferences.timeFormat === "12h" ? "h12" : "h23",
    } : {}),
  };
  if (preferences.dateFormat === "YYYY-MM-DD") {
    const parts = new Intl.DateTimeFormat("en-CA", dateOptions).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const formattedDate = `${get("year")}-${get("month")}-${get("day")}`;
    if (!includeTime) return formattedDate;
    return `${formattedDate} ${get("hour")}:${get("minute")}${preferences.timeFormat === "12h" ? ` ${get("dayPeriod")}` : ""}`;
  }
  const order = preferences.dateFormat === "DD/MM/YYYY" ? ["day", "month", "year"] : ["month", "day", "year"];
  const parts = new Intl.DateTimeFormat(locale, dateOptions).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const formattedDate = order.map((part) => values[part] ?? "").join("/");
  if (!includeTime) return formattedDate;
  const time = `${values.hour ?? ""}:${values.minute ?? ""}${preferences.timeFormat === "12h" ? ` ${values.dayPeriod ?? ""}` : ""}`;
  return `${formattedDate} ${time}`.trim();
}

export function formatUserTime(value: string, preferences: UserPreferences) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(preferences.language, {
    timeZone: preferences.timezone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: preferences.timeFormat === "12h" ? "h12" : "h23",
  }).format(date);
}
