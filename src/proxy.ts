import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default handleI18nRouting;

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: "/((?!api(?:/|$)|_next|.*\\..*).*)",
};
