import type { routing } from "@/i18n/routing";
import type common from "../messages/en/common.json";
import type nav from "../messages/en/nav.json";
import type lesson from "../messages/en/lesson.json";
import type landing from "../messages/en/landing.json";
import type progress from "../messages/en/progress.json";
import type media from "../messages/en/media.json";
import type licenses from "../messages/en/licenses.json";

type Messages = {
  common: typeof common;
  nav: typeof nav;
  lesson: typeof lesson;
  landing: typeof landing;
  progress: typeof progress;
  media: typeof media;
  licenses: typeof licenses;
};

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
