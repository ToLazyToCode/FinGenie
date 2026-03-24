export const aiKeys = {
  all: ['ai'] as const,
  conversations: () => [...aiKeys.all, 'conversations'] as const,
  conversationDetail: (conversationId: number | null) =>
    [...aiKeys.all, 'conversation', conversationId] as const,
};
