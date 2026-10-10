import {
  generateMondrianPattern,
  placeMondrianAttempts,
  mondrianAttemptTone,
  MONDRIAN_COLUMNS,
  MONDRIAN_ROWS,
} from "@kicearena/mondrian";
import { fileURLToPath } from "node:url";
import { assetFilePath } from "@kicearena/assets/node";
import type { ShareImageContent } from "./model.js";
const escapeMarkup = (value: string) =>
  value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

let resources:
  | Promise<{
      sharp: (typeof import("sharp"))["default"];
      background: Buffer;
      footer: Buffer;
      logo: Buffer;
      wordmark: Buffer;
    }>
  | undefined;

const fontPath = fileURLToPath(
  new URL("../resources/fonts/Pretendard-Bold.otf", import.meta.url),
);
export const defaultShareImageFile = fileURLToPath(
  new URL("../resources/default-share-image.png", import.meta.url),
);

function textLayer(
  sharp: (typeof import("sharp"))["default"],
  value: string,
  {
    size,
    width,
    height,
    color = "#171816",
    wrap = "word",
  }: {
    size: number;
    width: number;
    height: number;
    color?: string;
    wrap?: "word" | "none";
  },
) {
  return sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(value)}</span>`,
      font: `Pretendard Bold ${size}`,
      fontfile: fontPath,
      width,
      dpi: 72,
      rgba: true,
      wrap,
    },
  })
    .resize({ width, height, fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/** Cache common artwork and load the bundled font before the first crawler request. */
export function warmShareImageRenderer() {
  resources ??= (async () => {
    process.env.FONTCONFIG_FILE = fileURLToPath(
      new URL("../resources/fonts.conf", import.meta.url),
    );
    const { default: sharp } = await import("sharp");
    const [background, footer, logo, wordmark] = await Promise.all([
      sharp({
        create: {
          width: 1200,
          height: 630,
          channels: 4,
          background: "#faf9f5",
        },
      })
        .png()
        .toBuffer(),
      textLayer(sharp, "kicearena.com", {
        size: 21,
        width: 600,
        height: 30,
        color: "#75766f",
      }).then((layer) =>
        sharp(layer.data, { raw: layer.info }).png().toBuffer(),
      ),
      sharp(assetFilePath("icons/main")).resize(64, 64).png().toBuffer(),
      textLayer(sharp, "KICE ARENA", { size: 25, width: 188, height: 36 }).then(
        (layer) => sharp(layer.data, { raw: layer.info }).png().toBuffer(),
      ),
    ]);
    return { sharp, background, footer, logo, wordmark };
  })().catch((error: unknown) => {
    resources = undefined;
    throw error;
  });
  return resources;
}

const topicImages = new Map<string, Promise<Buffer>>();
function topicImage(
  sharp: (typeof import("sharp"))["default"],
  topic: Extract<ShareImageContent, { kind: "problem" }>["topicTags"][number],
) {
  let image = topicImages.get(topic.icon);
  if (!image) {
    image = sharp(assetFilePath(topic.icon))
      .resize(84, 84)
      .png()
      .toBuffer()
      .catch((error: unknown) => {
        topicImages.delete(topic.icon);
        throw error;
      });
    topicImages.set(topic.icon, image);
  }
  return image;
}

/** Rendering needs no network assets, browser process or answer material. */
export async function renderShareImage(content: ShareImageContent) {
  if (content.kind === "site") return renderSiteCard();
  if (content.kind === "competition") return renderCompetitionCard(content);
  const { sharp, background, footer, logo, wordmark } =
    await warmShareImageRenderer();
  const specs = [
    {
      value: "PROBLEM",
      size: 25,
      width: 420,
      height: 40,
      left: 72,
      top: 97,
      color: "#b49a43",
    },
    {
      value: String(content.number).padStart(2, "0"),
      size: 285,
      width: 430,
      height: 300,
      left: 60,
      top: 183,
      color: "#171816",
    },
    {
      value:
        content.examTitle.length > 48
          ? `${content.examTitle.slice(0, 47)}…`
          : content.examTitle,
      size: 46,
      width: 550,
      height: 166,
      left: 552,
      top: 223,
      color: "#171816",
    },
    ...(!content.topicTags.length
      ? [
          {
            value: "직접 풀어보세요",
            size: 29,
            width: 550,
            height: 42,
            left: 552,
            top: 430,
            color: "#75766f",
          },
        ]
      : []),
  ];
  const layers = await Promise.all(
    specs.map(async ({ value, size, width, height, left, top, color }) => {
      const layer = await textLayer(sharp, value, {
        size,
        width,
        height,
        color,
      });
      return { input: layer.data, raw: layer.info, left, top };
    }),
  );
  const tags = await Promise.all(
    content.topicTags.map(async (topic, index) => {
      const [icon, label] = await Promise.all([
        topicImage(sharp, topic),
        textLayer(sharp, topic.label, { size: 20, width: 124, height: 28 }),
      ]);
      const left = 552 + index * 138;
      return [
        { input: icon, left: left + 20, top: 402 },
        {
          input: label.data,
          raw: label.info,
          left: left + Math.round((124 - label.info.width) / 2),
          top: 493,
        },
      ];
    }),
  );
  return sharp(background)
    .composite([
      ...layers,
      ...tags.flat(),
      { input: footer, left: 72, top: 563 },
      { input: logo, left: 870, top: 538 },
      { input: wordmark, left: 944, top: 557 },
    ])
    .timeout({ seconds: 2 })
    .png({ compressionLevel: 3 })
    .toBuffer();
}

async function renderSiteCard() {
  const { sharp, background } = await warmShareImageRenderer();
  const label = await textLayer(sharp, "KICE 아레나", {
    size: 88,
    width: 800,
    height: 120,
    wrap: "none",
  });
  const logoSize = 160;
  const gap = 36;
  const left = Math.round((1200 - logoSize - gap - label.info.width) / 2);
  const logo = await sharp(assetFilePath("icons/main"))
    .resize(logoSize, logoSize)
    .png()
    .toBuffer();
  return sharp(background)
    .composite([
      { input: logo, left, top: (630 - logoSize) / 2 },
      {
        input: label.data,
        raw: label.info,
        left: left + logoSize + gap,
        top: Math.round((630 - label.info.height) / 2),
      },
    ])
    .timeout({ seconds: 2 })
    .png({ compressionLevel: 3 })
    .toBuffer();
}

async function renderCompetitionCard(
  content: Extract<ShareImageContent, { kind: "competition" }>,
) {
  const { sharp, background, footer } = await warmShareImageRenderer();
  const ended = content.variant === "mondrian";
  const { day, month } = content;
  const title =
    content.title.length > 40
      ? `${content.title.slice(0, 39)}…`
      : content.title;
  const words = title.split(/\s+/u);
  const difference = (at: number) =>
    Math.abs(
      words.slice(0, at).join(" ").length - words.slice(at).join(" ").length,
    );
  let split = 1;
  for (let index = 2; index < words.length; index++) {
    if (difference(index) < difference(split)) split = index;
  }
  const ticketTitle =
    title.length > 13 && words.length > 1
      ? `${words.slice(0, split).join(" ")}\n${words.slice(split).join(" ")}`
      : title;
  const specs: Array<{
    value: string;
    size: number;
    left: number;
    top: number;
    width: number;
    height: number;
    color?: string;
  }> = [];
  let artwork: string;
  if (ended) {
    const panels = generateMondrianPattern(content.seed);
    const placements = placeMondrianAttempts(
      content.seed,
      content.entries,
      new Map(),
      panels,
    );
    const slots = new Map([...placements].map(([key, slot]) => [slot, key]));
    const colors = {
      paper: "#f3f3ef",
      red: "#ef1114",
      blue: "#0785b8",
      yellow: "#fde41c",
      black: "#090a08",
    };
    artwork = panels
      .map((panel, slot) => {
        const key = slots.get(slot);
        const tone = key
          ? mondrianAttemptTone(content.seed, key, panel)
          : "paper";
        return `<rect x="${48 + (panel.x * 1104) / MONDRIAN_COLUMNS}" y="${48 + (panel.y * 510) / MONDRIAN_ROWS}" width="${(panel.width * 1104) / MONDRIAN_COLUMNS}" height="${(panel.height * 510) / MONDRIAN_ROWS}" fill="${colors[tone]}" stroke="#262722" stroke-width="4"/>`;
      })
      .join("");
    // The pattern matches the final public cover; a paper panel keeps the title legible.
    artwork +=
      '<rect x="48" y="48" width="690" height="510" fill="#faf9f5" fill-opacity=".92"/>';
    specs.push(
      {
        value: content.statusLabel,
        size: 23,
        left: 86,
        top: 115,
        width: 600,
        height: 32,
        color: "#75766f",
      },
      {
        value: ticketTitle,
        size: 64,
        left: 86,
        top: 212,
        width: 610,
        height: 180,
      },
      {
        value: content.summaryLabel,
        size: 25,
        left: 86,
        top: 486,
        width: 600,
        height: 38,
        color: "#75766f",
      },
    );
  } else {
    artwork = `<rect x="48" y="72" width="1104" height="470" rx="8" fill="#fffefa" stroke="#e1e1d9"/>
          <path d="M56 72H834V542H56Q48 542 48 534V80Q48 72 56 72Z" fill="#f2d32d"/>
          <path d="M834 72V542" stroke="#9b9580" stroke-width="2" stroke-dasharray="7 7"/>
          <path d="M286 181V451" stroke="#171816" stroke-opacity=".55"/>
          <circle cx="48" cy="307" r="23" fill="#faf9f5"/><circle cx="1152" cy="307" r="23" fill="#faf9f5"/>
          <path d="M864 246H1124M864 371H1124" stroke="#e1e1d9"/>`;
    specs.push(
      {
        value: content.statusLabel,
        size: 23,
        left: 110,
        top: 112,
        width: 650,
        height: 32,
      },
      { value: day, size: 156, left: 92, top: 222, width: 176, height: 162 },
      { value: month, size: 48, left: 102, top: 399, width: 170, height: 58 },
      {
        value: ticketTitle,
        size: 64,
        left: 320,
        top: 215,
        width: 475,
        height: 180,
      },
      {
        value: content.scheduleLabel,
        size: 21,
        left: 320,
        top: 456,
        width: 475,
        height: 38,
      },
      {
        value: content.timeLabel,
        size: 34,
        left: 864,
        top: 173,
        width: 260,
        height: 50,
      },
      {
        value: content.summaryLabel,
        size: 26,
        left: 864,
        top: 296,
        width: 260,
        height: 43,
      },
      {
        value: "KICE ARENA",
        size: 23,
        left: 864,
        top: 430,
        width: 260,
        height: 36,
      },
    );
  }
  const layers = await Promise.all(
    specs.map(async ({ value, size, width, height, color, left, top }) => {
      const layer = await textLayer(sharp, value, {
        size,
        width,
        height,
        color,
        wrap: value === ticketTitle ? "none" : "word",
      });
      return { input: layer.data, raw: layer.info, left, top };
    }),
  );
  return sharp(background)
    .composite([
      {
        input: Buffer.from(
          `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">${artwork}</svg>`,
        ),
        left: 0,
        top: 0,
      },
      ...layers,
      { input: footer, left: 48, top: 584 },
    ])
    .timeout({ seconds: 2 })
    .png({ compressionLevel: 3 })
    .toBuffer();
}
