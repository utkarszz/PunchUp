const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Extracts unique lowercased usernames from text mentioned with @<username>.
 * Handles @username at start of text, after whitespace, or punctuation.
 * Usernames must be 3-20 characters: a-z, 0-9, underscore.
 * @param {string} text
 * @returns {string[]}
 */
const extractMentionUsernames = (text) => {
  if (!text || typeof text !== 'string') return [];
  const regex = /(?:^|[^\w])@([a-zA-Z0-9_]{3,20})\b/g;
  const usernames = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      usernames.add(match[1].toLowerCase());
    }
  }
  return Array.from(usernames);
};

/**
 * Resolves mentioned users against the database.
 * Enforces server-side verification:
 * - Only users actually appearing in the text are accepted.
 * - Non-existent or banned users are excluded.
 * - The author cannot self-mention.
 * @param {string} text
 * @param {Array} [rawMentions] Optional client-provided structured mentions
 * @param {string|mongoose.Types.ObjectId} authorId Current authenticated user ID
 * @returns {Promise<Array<User>>}
 */
const resolveAndVerifyMentions = async (text, rawMentions = [], authorId = null) => {
  const textUsernames = extractMentionUsernames(text);
  if (textUsernames.length === 0) return [];

  const textUsernameSet = new Set(textUsernames);

  // If client provided structured mentions, we can also extract valid usernames that appear in the text
  if (Array.isArray(rawMentions)) {
    for (const item of rawMentions) {
      const uname = typeof item === 'string' ? item : item?.username;
      if (uname && typeof uname === 'string') {
        const normalized = uname.toLowerCase().replace(/^@/, '');
        if (textUsernameSet.has(normalized)) {
          textUsernameSet.add(normalized);
        }
      }
    }
  }

  const queryUsernames = Array.from(textUsernameSet);
  if (queryUsernames.length === 0) return [];

  const users = await User.find({
    username: { $in: queryUsernames },
    isBanned: { $ne: true },
  }).select('_id username displayName profilePicture');

  const authorIdStr = authorId ? authorId.toString() : null;

  // Filter out self-mentions and ensure uniqueness by ID
  const seenIds = new Set();
  const validUsers = [];

  for (const user of users) {
    const uid = user._id.toString();
    if (authorIdStr && uid === authorIdStr) {
      continue; // Skip self-mention
    }
    if (!seenIds.has(uid)) {
      seenIds.add(uid);
      validUsers.push(user);
    }
  }

  return validUsers;
};

/**
 * Creates in-app notifications for mentioned users.
 * Prevents duplicates and excludes any user IDs specified in excludeUserIds.
 * @param {Object} options
 * @param {Object} options.sender User document or object with _id, displayName/username
 * @param {Array<Object>} options.mentionedUsers List of user documents
 * @param {'mention_post'|'mention_comment'|'mention_reply'} options.type
 * @param {string|mongoose.Types.ObjectId} options.post
 * @param {string|mongoose.Types.ObjectId} [options.comment]
 * @param {Array<string|mongoose.Types.ObjectId>} [options.excludeUserIds]
 */
const notifyMentions = async ({
  sender,
  mentionedUsers = [],
  type,
  post,
  comment = null,
  excludeUserIds = [],
}) => {
  if (!mentionedUsers || mentionedUsers.length === 0) return [];

  const senderIdStr = (sender._id || sender).toString();
  const senderName = sender.displayName || sender.username || 'Someone';

  const excludeSet = new Set([
    senderIdStr,
    ...excludeUserIds.map((id) => (id ? id.toString() : null)).filter(Boolean),
  ]);

  const defaultMessages = {
    mention_post: `${senderName} mentioned you in a post.`,
    mention_comment: `${senderName} mentioned you in a comment.`,
    mention_reply: `${senderName} mentioned you in a reply.`,
  };

  const message = defaultMessages[type] || `${senderName} mentioned you.`;

  const notificationsToCreate = [];
  const notifiedIds = new Set();

  for (const user of mentionedUsers) {
    const recipientId = user._id.toString();
    if (excludeSet.has(recipientId) || notifiedIds.has(recipientId)) {
      continue;
    }
    notifiedIds.add(recipientId);

    notificationsToCreate.push({
      recipient: user._id,
      sender: sender._id || sender,
      type,
      post,
      comment: comment || null,
      message,
    });
  }

  if (notificationsToCreate.length > 0) {
    return await Notification.insertMany(notificationsToCreate);
  }
  return [];
};

module.exports = {
  extractMentionUsernames,
  resolveAndVerifyMentions,
  notifyMentions,
};
