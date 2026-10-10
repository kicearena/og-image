import type { ShareImageContent } from "./model.js";
export const competition: Extract<ShareImageContent, { kind: "competition" }> =
  {
    kind: "competition",
    seed: "synthetic",
    title: "제4회 KICE 정기 대회",
    variant: "ticket",
    statusLabel: "대회 예정",
    day: "10",
    month: "OCT",
    timeLabel: "21:00 KST",
    scheduleLabel: "10월 10일 (토) 21:00",
    summaryLabel: "100분 · 30문항",
    entries: [],
  };
export const previewCards: Record<string, ShareImageContent> = {
  site: { kind: "site" },
  upcoming: competition,
  open: {
    ...competition,
    statusLabel: "진행 중",
    day: "∞",
    month: "OPEN",
    timeLabel: "상시 공개",
    scheduleLabel: "언제든 시작",
  },
  ended: {
    ...competition,
    variant: "mondrian",
    statusLabel: "대회 종료",
    summaryLabel: "30문항 · 100분",
    entries: [{ key: "synthetic-a" }, { key: "synthetic-b" }],
  },
  problem: {
    kind: "problem",
    examTitle: "공개 모의고사 <수학> & 시험",
    number: 30,
    topicTags: [
      {
        label: "방정식/부등식",
        icon: "icons/topics/compact/02-equations-inequalities",
      },
      { label: "함수", icon: "icons/topics/compact/03-functions" },
      { label: "미분", icon: "icons/topics/compact/08-derivatives" },
      { label: "적분", icon: "icons/topics/compact/09-integrals" },
    ],
  },
};
