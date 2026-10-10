import type { AssetId } from "@kicearena/assets";
export type ShareImageContent =
  | { kind: "site" }
  | {
      kind: "problem";
      examTitle: string;
      number: number;
      topicTags: readonly { label: string; icon: AssetId }[];
    }
  | {
      kind: "competition";
      seed: string;
      title: string;
      variant: "ticket" | "mondrian";
      statusLabel: string;
      day: string;
      month: string;
      timeLabel: string;
      scheduleLabel: string;
      summaryLabel: string;
      entries: readonly { key: string }[];
    };
