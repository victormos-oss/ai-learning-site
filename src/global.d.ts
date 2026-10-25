import type { routing } from "@/i18n/routing";
import type common from "../messages/en/common.json";
import type nav from "../messages/en/nav.json";
import type lesson from "../messages/en/lesson.json";

type Messages = {
  common: typeof common;
  nav: typeof nav;
  lesson: typeof lesson;
};

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
