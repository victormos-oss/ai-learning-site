import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("applies defaults when optional variables are missing", () => {
    const env = parseEnv({});
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(env.GIT_SHA).toBeUndefined();
  });

  it("accepts a full production configuration", () => {
    const env = parseEnv({
      NEXT_PUBLIC_SITE_URL: "https://learn.vdmitriev.com",
      GIT_SHA: "0123456789abcdef",
      NODE_ENV: "production",
    });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://learn.vdmitriev.com");
    expect(env.GIT_SHA).toBe("0123456789abcdef");
  });

  it("throws a readable error on a malformed site url", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });
});
