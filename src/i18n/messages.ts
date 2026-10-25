import type { Locale } from "./routing";

export const NAMESPACES = ["common", "nav", "lesson"] as const;
export type Namespace = (typeof NAMESPACES)[number];

type NamespaceTree = Record<string, unknown>;

async function loadNamespace(
  locale: Locale,
  namespace: Namespace,
): Promise<NamespaceTree> {
  const loaded = (await import(`../../messages/${locale}/${namespace}.json`)) as {
    default: NamespaceTree;
  };
  return loaded.default;
}

/** Merges per-namespace JSON files into one messages object for next-intl. */
export async function loadMessages(
  locale: Locale,
): Promise<Record<Namespace, NamespaceTree>> {
  const entries = await Promise.all(
    NAMESPACES.map(
      async (namespace) => [namespace, await loadNamespace(locale, namespace)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<Namespace, NamespaceTree>;
}
