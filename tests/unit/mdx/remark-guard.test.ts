import { compile } from "@mdx-js/mdx";
import { describe, expect, it } from "vitest";
import remarkGuard from "@/features/mdx/plugins/remark-guard";

async function compileLesson(source: string): Promise<string> {
  const result = await compile(source, { remarkPlugins: [remarkGuard] });
  return String(result);
}

describe("remarkGuard", () => {
  it("accepts allow-listed components with literal attributes", async () => {
    const out = await compileLesson(
      '# T\n\n<Figure src="agent-loop" alt="Loop" />\n\n<Callout title="Note">Hi</Callout>\n',
    );
    expect(out).toContain("Figure");
  });

  it("rejects unknown elements, including lowercase html-like tags", async () => {
    await expect(compileLesson("<div>x</div>")).rejects.toThrow(
      /element <div> is not allowed/,
    );
    await expect(compileLesson('<Script src="x" />')).rejects.toThrow(/<Script>/);
  });

  it("rejects expressions in attributes and in text", async () => {
    await expect(compileLesson('<Figure src={"x"} alt="a" />')).rejects.toThrow(
      /must be a literal/,
    );
    await expect(compileLesson("{process.env.SECRET}")).rejects.toThrow(
      /mdxTextExpression|mdxFlowExpression/,
    );
  });

  it("rejects ESM imports and exports", async () => {
    await expect(compileLesson('import x from "y"\n\n# T')).rejects.toThrow(/mdxjsEsm/);
    await expect(compileLesson("export const a = 1\n")).rejects.toThrow(/mdxjsEsm/);
  });

  it("rejects spread attributes", async () => {
    await expect(compileLesson("<Callout {...props} />")).rejects.toThrow(/spread/);
  });
});
