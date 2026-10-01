// Default user preferences for NovaTask.
export interface DefaultPreferences {
  theme: "light" | "dark" | "system";
  timeFormat: "12h" | "24h";
  dateFormat: string;
  notifications: {
    browser: boolean;
    reminders: boolean;
    dailyDigest: boolean;
  };
  ai: {
    tone: "friendly" | "professional" | "concise";
    autoPlan: boolean;
    proactive: boolean;
  };
  reminder: {
    defaultSnoozeMinutes: number;
    leadTimeMinutes: number;
  };
  onboarded: boolean;
}

export function defaultPreferences(): DefaultPreferences {
  return {
    theme: "dark",
    timeFormat: "12h",
    dateFormat: "MMM d, yyyy",
    notifications: {
      browser: true,
      reminders: true,
      dailyDigest: false,
    },
    ai: {
      tone: "friendly",
      autoPlan: true,
      proactive: true,
    },
    reminder: {
      defaultSnoozeMinutes: 10,
      leadTimeMinutes: 0,
    },
    onboarded: false,
  };
}
