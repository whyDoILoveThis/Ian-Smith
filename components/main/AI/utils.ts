import { Conversation } from "./types";

export const createNewConversation = (
  conversations: Conversation[]
): Conversation => {
  const id = crypto.randomUUID();
  return {
    id,
    title:
      conversations.length === 0
        ? "Conversation 1"
        : `Conversation ${conversations.length + 1}`,
    messages: [],
  };
};
