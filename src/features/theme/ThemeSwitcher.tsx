"use client";

import { useId, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun, Monitor } from "@phosphor-icons/react";
import { THEME_PREFERENCES, type ThemePreference } from "./theme-script";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  setThemePreference,
  subscribeTheme,
} from "./theme-store";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemeSwitcher() {
  const t = useTranslations("nav");
  const groupId = useId();
  const preference = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  return (
    <fieldset className="flex items-center gap-0.5 rounded-flap border border-paper-line p-0.5">
      <legend className="sr-only">{t("theme.label")}</legend>
      {THEME_PREFERENCES.map((option: ThemePreference) => {
        const Icon = ICONS[option];
        const id = `${groupId}-${option}`;
        const checked = preference === option;
        return (
          <label
            key={option}
            htmlFor={id}
            className={
              "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-flap " +
              (checked ? "bg-ink text-paper" : "text-ink-muted hover:text-ink")
            }
            title={t(`theme.${option}`)}
          >
            <input
              id={id}
              type="radio"
              name={`${groupId}-theme`}
              value={option}
              checked={checked}
              onChange={() => setThemePreference(option)}
              className="sr-only"
            />
            <Icon aria-hidden="true" size={18} weight="bold" />
            <span className="sr-only">{t(`theme.${option}`)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
