import type { ShareImageContent } from "./model.js";

const MAX_IMAGES = 128;
const MAX_PENDING = 4;

export function createShareImageCache(
  render: (content: ShareImageContent) => Promise<Buffer>,
) {
  const images = new Map<string, Buffer>();
  const pending = new Map<string, Promise<Buffer>>();

  return async (content: ShareImageContent) => {
    const key = JSON.stringify(content);
    const cached = images.get(key);
    if (cached) {
      images.delete(key);
      images.set(key, cached);
      return cached;
    }
    const active = pending.get(key);
    if (active) return active;
    if (pending.size >= MAX_PENDING)
      throw new Error("Share image renderer busy");

    const task = Promise.resolve()
      .then(() => render(content))
      .then((image) => {
        images.set(key, image);
        if (images.size > MAX_IMAGES)
          images.delete(images.keys().next().value!);
        return image;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}
