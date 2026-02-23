"use client";

import React, { 
  createContext, 
  useContext, 
  useCallback, 
  useState 
} from 'react';

export type AppConfig = {
  title: string;
  description: string;
  github_link?: string;
  video_fit?: "cover" | "contain";
  settings: UserSettings;
  show_qr?: boolean;
};

export type UserSettings = {
  editable: boolean;
  theme_color: string;
  chat: boolean;
  inputs: {
    camera: boolean;
    mic: boolean;
  };
  outputs: {
    audio: boolean;
    video: boolean;
  };
  ws_url: string;
  token: string;
  room_name: string;
  participant_name: string;
};

// Fallback if NEXT_PUBLIC_APP_CONFIG is not set
const defaultConfig: AppConfig = {
  title: "Video Chat",
  description: "Simple video chat interface",
  video_fit: "cover",
  settings: {
    editable: true,
    theme_color: "FF5A5F",
    chat: false,
    inputs: {
      camera: true,
      mic: true,
    },
    outputs: {
      audio: true,
      video: true,
    },
    ws_url: "",
    token: "",
    room_name: "default-room",
    participant_name: "user",
  },
  show_qr: false,
};

const useAppConfig = (): AppConfig => {
  const [config] = useState(() => {
    if (process.env.NEXT_PUBLIC_APP_CONFIG) {
      try {
        const parsedConfig = JSON.parse(
          process.env.NEXT_PUBLIC_APP_CONFIG
        ) as AppConfig;
        if (parsedConfig.settings === undefined) {
          parsedConfig.settings = defaultConfig.settings;
        }
        if (parsedConfig.settings.editable === undefined) {
          parsedConfig.settings.editable = true;
        }
        return parsedConfig;
      } catch (e) {
        console.error("Error parsing app config:", e);
      }
    }
    return defaultConfig;
  });
  
  return config;
};

type ConfigData = {
  config: AppConfig;
  setUserSettings: (settings: UserSettings) => void;
};

const ConfigContext = createContext<ConfigData | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const appConfig = useAppConfig();
  const [localColorOverride, setLocalColorOverride] = useState<string | null>(
    null
  );

  const getConfig = useCallback(() => {
    const appConfigFromSettings = { ...appConfig };

    if (localColorOverride) {
      appConfigFromSettings.settings.theme_color = localColorOverride;
    }
    
    return appConfigFromSettings;
  }, [appConfig, localColorOverride]);

  const setUserSettings = useCallback(
    (settings: UserSettings) => {
      // Only allow theme color changes for simplicity
      setLocalColorOverride(settings.theme_color);
    },
    []
  );

  return (
    <ConfigContext.Provider value={{ config: getConfig(), setUserSettings }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return config;
};
