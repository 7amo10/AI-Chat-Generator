export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

/**
 * Parses raw MDX/markdown body into an array of ChatMessages.
 * Splits on `## User` and `## AI` headings.
 */
export function parseChatMessages(rawContent: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  // Split by h2 headings: ## User or ## AI
  const sections = rawContent.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const firstNewline = section.indexOf('\n');
    if (firstNewline === -1) continue;

    const heading = section.slice(0, firstNewline).trim().toLowerCase();
    const content = section.slice(firstNewline + 1).trim();

    if (!content) continue;

    if (heading === 'user') {
      messages.push({ role: 'user', content });
    } else if (heading === 'ai') {
      messages.push({ role: 'ai', content });
    }
  }

  return messages;
}
