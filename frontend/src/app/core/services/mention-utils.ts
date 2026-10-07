import { Comment } from './post.service';

export interface ThreadComment extends Comment {
  replies?: ThreadComment[];
  depth?: number;
}

export interface MentionRef {
  userId?: string;
  username: string;
}

/**
 * Checks if the text before cursor ends with an active @mention trigger.
 * Matches '@' preceded by start-of-line or whitespace, followed by 0-20 alphanumeric/underscore characters.
 */
export function getMentionTrigger(text: string, cursorPos: number): { query: string; startIndex: number } | null {
  if (typeof text !== 'string' || cursorPos < 0 || cursorPos > text.length) return null;
  const beforeCursor = text.slice(0, cursorPos);
  const match = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(beforeCursor);
  if (!match) return null;

  const query = match[1];
  // startIndex points to the '@'
  const startIndex = beforeCursor.length - query.length - 1;
  return { query, startIndex };
}

/**
 * Inserts the chosen @username at the cursor position and places cursor immediately after.
 */
export function applyMentionSelection(
  text: string,
  startIndex: number,
  cursorPos: number,
  username: string
): { newText: string; newCursorPos: number } {
  const before = text.slice(0, startIndex);
  const after = text.slice(cursorPos);
  const insertion = `@${username} `;
  const newText = before + insertion + after;
  const newCursorPos = before.length + insertion.length;
  return { newText, newCursorPos };
}

/**
 * Escapes raw HTML to prevent XSS, then highlights @mentions as clickable links.
 */
export function formatContentWithMentions(content: string): string {
  if (!content) return '';
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Convert @username into clickable handle
  return escaped.replace(
    /(^|[^\w])@([a-zA-Z0-9_]{3,20})\b/g,
    '$1<a href="/user/$2" class="mention-tag" onclick="event.stopPropagation()">@$2</a>'
  );
}

/**
 * Assembles a flat list of comments and replies into a proper nested tree in O(N) time.
 * Handles root comments, replies to comments, and replies to replies.
 * Orphaned replies are gracefully preserved as root entries.
 */
export function buildCommentTree(comments: Comment[]): ThreadComment[] {
  if (!comments || comments.length === 0) return [];

  const byId = new Map<string, ThreadComment>();
  const roots: ThreadComment[] = [];

  // Initialize nodes with empty replies
  for (const c of comments) {
    byId.set(c._id, { ...c, replies: [] });
  }

  // Connect child replies to their respective parents
  for (const c of comments) {
    const item = byId.get(c._id)!;
    const parentId = typeof c.parentComment === 'object' ? c.parentComment?._id : c.parentComment;

    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId)!;
      parent.replies = parent.replies || [];
      parent.replies.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots;
}
