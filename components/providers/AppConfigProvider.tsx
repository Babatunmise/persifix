
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

type AppConfig = {
  firstName: string;
  gender: string;
  motivation: string;
  timezone: string;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
};

const defaultConfig: AppConfig = {
  firstName: "",
  gender: "",
  motivation: "",
  timezone: "UTC",
  isLoading: true,
  refreshConfig: async () => {},
};

const AppConfigContext = createContext<AppConfig>(defaultConfig);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  const loadConfig = async () => {
    try {
      // 1. Instantly load from localStorage for fast hydration (avoids UI flicker)
      const localName = localStorage.getItem("sanctos_name") || "";
      
      // 2. Get the user's local IANA timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      const session = await ensureAnonymousSession();
      if (!session) {
        setConfig(prev => ({ ...prev, firstName: localName, timezone: userTimezone, isLoading: false }));
        return;
      }

      // 3. Fetch the true profile from Supabase
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("first_name, gender, motivation, timezone")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        setConfig({
          firstName: data.first_name || localName,
          gender: data.gender || "",
          motivation: data.motivation || "",
          timezone: data.timezone || userTimezone,
          isLoading: false,
          refreshConfig: loadConfig,
        });
      } else {
        // If no profile exists yet, just use local data
        setConfig(prev => ({ ...prev, firstName: localName, timezone: userTimezone, isLoading: false }));
      }
    } catch (err) {
      console.error("Failed to load app config:", err);
      setConfig(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <AppConfigContext.Provider value={{ ...config, refreshConfig: loadConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

// Custom hook to use the config anywhere in the app
export function useAppConfig() {
  return useContext(AppConfigContext);
}