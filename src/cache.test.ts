import { describe, expect, it, vi } from "vitest";
import { createShareImageCache } from "./cache.js";
import { previewCards } from "./preview.fixture.js";

describe("share image cache", () => {
  it("bounds new render work while allowing callers to join an active render", async () => {
    let finish!: (image: Buffer) => void;
    const work = new Promise<Buffer>((resolve) => {
      finish = resolve;
    });
    const render = vi.fn(() => work);
    const get = createShareImageCache(render);
    const active = [0, 1, 2, 3].map((number) =>
      get({ kind: "problem", topicTags: [], examTitle: "시험", number }),
    );
    const joined = get({
      kind: "problem",
      topicTags: [],
      examTitle: "시험",
      number: 0,
    });
    await expect(
      get({ kind: "problem", topicTags: [], examTitle: "시험", number: 4 }),
    ).rejects.toThrow("busy");
    finish(Buffer.from("png"));
    await Promise.all([...active, joined]);
    expect(render).toHaveBeenCalledTimes(4);
    await get({ kind: "problem", topicTags: [], examTitle: "시험", number: 4 });
    expect(render).toHaveBeenCalledTimes(5);
  });

  it("invalidates competition images when the schedule changes", async () => {
    const render = vi.fn(async () => Buffer.from("png"));
    const get = createShareImageCache(render);
    const content = previewCards.upcoming;
    await get(content);
    if (content.kind !== "competition") throw new Error();
    await get({ ...content, scheduleLabel: "10월 11일 (일) 21:00" });
    expect(render).toHaveBeenCalledTimes(2);
  });
  it("coalesces concurrent work, caches problem cards and retries failures", async () => {
    const render = vi
      .fn()
      .mockRejectedValueOnce(new Error("render"))
      .mockResolvedValue(Buffer.from("png"));
    const get = createShareImageCache(render);
    const identity = {
      kind: "problem" as const,
      topicTags: [],
      examTitle: "시험",
      number: 1,
    };

    await expect(get(identity)).rejects.toThrow("render");
    await Promise.all([get(identity), get(identity), get(identity)]);
    await get(identity);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("retains only 128 images and refreshes least recently used order", async () => {
    const render = vi.fn(async () => Buffer.from("png"));
    const get = createShareImageCache(render);
    for (let number = 0; number < 128; number++)
      await get({
        kind: "problem" as const,
        topicTags: [],
        examTitle: "시험",
        number,
      });
    await get({
      kind: "problem" as const,
      topicTags: [],
      examTitle: "시험",
      number: 0,
    });
    await get({
      kind: "problem" as const,
      topicTags: [],
      examTitle: "시험",
      number: 128,
    });
    await get({
      kind: "problem" as const,
      topicTags: [],
      examTitle: "시험",
      number: 0,
    });
    expect(render).toHaveBeenCalledTimes(129);
    await get({
      kind: "problem" as const,
      topicTags: [],
      examTitle: "시험",
      number: 1,
    });
    expect(render).toHaveBeenCalledTimes(130);
  });
});
