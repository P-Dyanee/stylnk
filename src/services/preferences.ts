import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  profileExtras: "stylnk_profile_extras",
  privacy: "stylnk_privacy_settings",
  notifications: "stylnk_notification_settings",
  security: "stylnk_security_settings",
  language: "stylnk_language_settings",
  chat: "stylnk_chat_settings",
} as const;

export type ProfileExtras = {
  bio: string;
  phone: string;
  avatarUri: string;
};

export type PrivacySettings = {
  lastSeen: "Everyone" | "Contacts" | "Nobody";
  readReceipts: boolean;
  profilePhoto: "Everyone" | "Contacts" | "Nobody";
};

export type NotificationSettings = {
  messages: boolean;
  groups: boolean;
  sound: boolean;
  vibration: boolean;
};

export type SecuritySettings = {
  biometrics: boolean;
  twoFactor: boolean;
  screenLock: boolean;
};

export type LanguageSettings = {
  language: "English" | "Filipino";
};

export type ChatSettings = {
  enterToSend: boolean;
  mediaAutoDownload: boolean;
  fontSize: "Small" | "Medium" | "Large";
};

const defaults = {
  profileExtras: { bio: "", phone: "", avatarUri: "" } satisfies ProfileExtras,
  privacy: {
    lastSeen: "Everyone",
    readReceipts: true,
    profilePhoto: "Everyone",
  } satisfies PrivacySettings,
  notifications: {
    messages: true,
    groups: true,
    sound: true,
    vibration: true,
  } satisfies NotificationSettings,
  security: {
    biometrics: false,
    twoFactor: false,
    screenLock: false,
  } satisfies SecuritySettings,
  language: { language: "English" } satisfies LanguageSettings,
  chat: {
    enterToSend: true,
    mediaAutoDownload: true,
    fontSize: "Medium",
  } satisfies ChatSettings,
};

async function readStored<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

async function writeStored<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const preferencesStorage = {
  getProfileExtras: () => readStored(KEYS.profileExtras, defaults.profileExtras),
  saveProfileExtras: (value: ProfileExtras) =>
    writeStored(KEYS.profileExtras, value),
  getPrivacy: () => readStored(KEYS.privacy, defaults.privacy),
  savePrivacy: (value: PrivacySettings) => writeStored(KEYS.privacy, value),
  getNotifications: () =>
    readStored(KEYS.notifications, defaults.notifications),
  saveNotifications: (value: NotificationSettings) =>
    writeStored(KEYS.notifications, value),
  getSecurity: () => readStored(KEYS.security, defaults.security),
  saveSecurity: (value: SecuritySettings) => writeStored(KEYS.security, value),
  getLanguage: () => readStored(KEYS.language, defaults.language),
  saveLanguage: (value: LanguageSettings) => writeStored(KEYS.language, value),
  getChat: () => readStored(KEYS.chat, defaults.chat),
  saveChat: (value: ChatSettings) => writeStored(KEYS.chat, value),
};
