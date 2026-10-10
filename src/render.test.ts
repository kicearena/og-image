import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderShareImage } from "./render.js";
import { previewCards } from "./preview.fixture.js";
describe("PNG share cards", () => {
  it.each(Object.entries(previewCards))(
    "renders deterministic %s card",
    async (_name, content) => {
      const png = await renderShareImage(content);
      expect(await sharp(png).metadata()).toMatchObject({
        format: "png",
        width: 1200,
        height: 630,
      });
      expect(await renderShareImage(content)).toEqual(png);
    },
  );
  it("escapes long markup and rejects unknown assets instead of falling back", async () => {
    const problem = previewCards.problem;
    if (problem.kind !== "problem") throw new Error();
    await expect(
      renderShareImage({
        ...problem,
        examTitle: '긴 이름 <수학> & "시험" '.repeat(8),
      }),
    ).resolves.toBeInstanceOf(Buffer);
    await expect(
      renderShareImage({
        ...problem,
        topicTags: [{ label: "Invalid", icon: "missing" as never }],
      }),
    ).rejects.toThrow("Unknown asset");
  });
});
