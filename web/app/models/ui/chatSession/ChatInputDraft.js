const STORAGE_KEY = 'chat-input-drafts';
const MAX_ENTRIES = 30;
const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const NEW_SESSION_SENTINEL = '__new__';

class ChatInputDraft {
  static get STORAGE_KEY() {
    return STORAGE_KEY;
  }

  static get MAX_ENTRIES() {
    return MAX_ENTRIES;
  }

  static get TTL_MS() {
    return TTL_MS;
  }

  static get NEW_SESSION_SENTINEL() {
    return NEW_SESSION_SENTINEL;
  }

  static getEntryKey(userId, agentId, sessionId) {
    return `${userId}:${agentId}:${sessionId || NEW_SESSION_SENTINEL}`;
  }

  static parseStored(raw) {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed;
    } catch {
      return {};
    }
  }

  static prune(entries, now = Date.now()) {
    const fresh = Object.fromEntries(
      Object.entries(entries).filter(([, entry]) => (
        entry
        && typeof entry.text === 'string'
        && typeof entry.updatedAt === 'number'
        && now - entry.updatedAt < TTL_MS
      )),
    );
    const keys = Object.keys(fresh);
    if (keys.length <= MAX_ENTRIES) return fresh;
    const kept = keys
      .sort((a, b) => fresh[b].updatedAt - fresh[a].updatedAt)
      .slice(0, MAX_ENTRIES);
    return Object.fromEntries(kept.map(k => [k, fresh[k]]));
  }

  static readAll(now = Date.now()) {
    try {
      return ChatInputDraft.prune(ChatInputDraft.parseStored(localStorage.getItem(STORAGE_KEY)), now);
    } catch {
      return {};
    }
  }

  static read({ userId, agentId, sessionId, now = Date.now() }) {
    if (!userId || !agentId) return '';
    const entries = ChatInputDraft.readAll(now);
    const entry = entries[ChatInputDraft.getEntryKey(userId, agentId, sessionId)];
    return entry?.text ?? '';
  }

  static write({ userId, agentId, sessionId, text, now = Date.now() }) {
    if (!userId || !agentId) return;
    const entries = ChatInputDraft.readAll(now);
    const key = ChatInputDraft.getEntryKey(userId, agentId, sessionId);
    if (!text || !text.trim()) {
      delete entries[key];
    } else {
      entries[key] = { text, updatedAt: now };
    }
    const pruned = ChatInputDraft.prune(entries, now);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      // localStorage quota exceeded or unavailable — silently drop.
    }
  }

  static clear({ userId, agentId, sessionId, now = Date.now() }) {
    ChatInputDraft.write({ userId, agentId, sessionId, text: '', now });
  }
}

export default ChatInputDraft;
