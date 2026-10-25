import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MESSAGES_DIR = join(process.cwd(), "messages");
const LOCALES = ["en", "ru", "es"] as const;
const EM_DASH = "—";
const EN_DASH = "–";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      acc[path] = value;
      return acc;
    }
    return { ...acc, ...flatten(value, path) };
  }, {});
}

function readNamespace(locale: string, file: string): Record<string, string> {
  const raw = readFileSync(join(MESSAGES_DIR, locale, file), "utf8");
  return flatten(JSON.parse(raw) as Tree);
}

const namespaces = readdirSync(join(MESSAGES_DIR, "en")).filter((file) =>
  file.endsWith(".json"),
);

describe("interface messages", () => {
  it("has at least one namespace", () => {
    expect(namespaces.length).toBeGreaterThan(0);
  });

  for (const file of namespaces) {
    describe(file, () => {
      const reference = readNamespace("en", file);

      for (const locale of LOCALES) {
        it(`${locale} has the same keys as en`, () => {
          const keys = Object.keys(readNamespace(locale, file)).sort();
          expect(keys).toEqual(Object.keys(reference).sort());
        });

        it(`${locale} has no empty strings`, () => {
          const empty = Object.entries(readNamespace(locale, file))
            .filter(([, value]) => value.trim() === "")
            .map(([key]) => key);
          expect(empty).toEqual([]);
        });

        it(`${locale} has no dashes used as punctuation`, () => {
          const offenders = Object.entries(readNamespace(locale, file))
            .filter(([, value]) => value.includes(EM_DASH) || value.includes(EN_DASH))
            .map(([key]) => key);
          expect(offenders).toEqual([]);
        });
      }
    });
  }
});
