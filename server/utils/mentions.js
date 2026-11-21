// @mentions in comments. Pure helpers, no database access.

const MAX_MENTIONS = 5;

// "@name" counts only at the start of the text or after a space/punctuation,
// so e-mail addresses like a@b.com are ignored.
const MENTION_PATTERN = /(^|[^\p{L}\p{N}_.@])@([\p{L}\p{N}_.]{2,30})/gu;

// Unique usernames mentioned in `content` (in order, max 5). A trailing dot
// is treated as the end of the sentence, not part of the name.
function extractMentionUsernames(content, limit = MAX_MENTIONS) {
    if (typeof content !== "string") return [];
    const found = [];
    for (const match of content.matchAll(MENTION_PATTERN)) {
        const name = match[2].replace(/\.+$/, "");
        if (name.length >= 2 && !found.includes(name)) found.push(name);
        if (found.length >= limit) break;
    }
    return found;
}

module.exports = { extractMentionUsernames, MAX_MENTIONS, MENTION_PATTERN };
