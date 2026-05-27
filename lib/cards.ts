import type { VideoResult } from "./youtube";

export type TextCard = { type: "text"; content: string };
export type VideoCard = {
  type: "video";
  framing: string;
  query: string;
  video: VideoResult | null;
};
export type ImageCard = {
  type: "image";
  caption: string;
  query: string;
  imageUrl: string | null;
};
export type CalloutCard = {
  type: "callout";
  content: string;
  label: string;
};
export type Card = TextCard | VideoCard | ImageCard | CalloutCard;

type UnresolvedVideoCard = Omit<VideoCard, "video">;
type UnresolvedImageCard = Omit<ImageCard, "imageUrl">;
export type UnresolvedCard = TextCard | UnresolvedVideoCard | UnresolvedImageCard | CalloutCard;

// Broad match: allows | inside CALLOUT content. VIDEO/IMAGE queries don't use |.
const MARKER_RE = /\[\[(VIDEO|IMAGE|CALLOUT):\s*(.+?)\]\]/gs;

export function parseCards(content: string): UnresolvedCard[] {
  const cards: UnresolvedCard[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MARKER_RE)) {
    const textBefore = content.slice(lastIndex, match.index).trim();
    if (textBefore) cards.push({ type: "text", content: textBefore });

    const [, mediaType, inner] = match;
    const trimmed = inner.trim();

    if (mediaType === "CALLOUT") {
      // Split on the LAST | so content may contain | without corrupting the label
      const lastPipe = trimmed.lastIndexOf("|");
      if (lastPipe === -1) {
        // No pipe: skip malformed callout
      } else {
        const calloutContent = trimmed.slice(0, lastPipe).trim();
        const label = trimmed.slice(lastPipe + 1).trim();
        if (calloutContent) cards.push({ type: "callout", content: calloutContent, label });
      }
    } else {
      // VIDEO and IMAGE: split on FIRST |
      const firstPipe = trimmed.indexOf("|");
      if (firstPipe === -1) {
        // No pipe: skip malformed marker
      } else {
        const query = trimmed.slice(0, firstPipe).trim();
        const rest = trimmed.slice(firstPipe + 1).trim();
        if (mediaType === "VIDEO") {
          cards.push({ type: "video", query, framing: rest });
        } else {
          cards.push({ type: "image", query, caption: rest });
        }
      }
    }

    lastIndex = match.index! + match[0].length;
  }

  const remaining = content.slice(lastIndex).trim();
  if (remaining) cards.push({ type: "text", content: remaining });

  // If no markers found, return the whole content as one text card
  return cards.length > 0 ? cards : [{ type: "text", content: content }];
}
