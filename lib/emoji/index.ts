// Barrel exports for lib/emoji
export { EMOJI_REGEX, parseTextWithEmoji, type TextSegment } from "./emojiRegex";
export {
  isSegoeEmojiSupported,
  batchCheckSupport,
  getSupportCacheSize,
  clearSupportCache,
} from "./emojiSupport";
