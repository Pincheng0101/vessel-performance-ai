// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import ChatInputDraft from './ChatInputDraft';

const NOW = 1_700_000_000_000;
const ONE_DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
});

describe('ChatInputDraft.getEntryKey', () => {
  test('joins userId, agentId, and sessionId with colons', () => {
    expect(ChatInputDraft.getEntryKey('u1', 'a1', 's1')).toBe('u1:a1:s1');
  });

  test('uses the new-session sentinel when sessionId is null', () => {
    expect(ChatInputDraft.getEntryKey('u1', 'a1', null)).toBe(`u1:a1:${ChatInputDraft.NEW_SESSION_SENTINEL}`);
  });

  test('uses the new-session sentinel when sessionId is undefined', () => {
    expect(ChatInputDraft.getEntryKey('u1', 'a1')).toBe(`u1:a1:${ChatInputDraft.NEW_SESSION_SENTINEL}`);
  });
});

describe('ChatInputDraft.parseStored', () => {
  test('returns an empty object when input is empty', () => {
    expect(ChatInputDraft.parseStored('')).toEqual({});
    expect(ChatInputDraft.parseStored(null)).toEqual({});
  });

  test('returns an empty object on malformed JSON', () => {
    expect(ChatInputDraft.parseStored('{not json')).toEqual({});
  });

  test.each([
    ['null', 'null'],
    ['array', '[1,2]'],
    ['number', '42'],
  ])('returns an empty object when parsed value is a %s', (_, raw) => {
    expect(ChatInputDraft.parseStored(raw)).toEqual({});
  });

  test('returns the parsed object', () => {
    const raw = JSON.stringify({ 'u:a:s': { text: 'hi', updatedAt: NOW } });
    expect(ChatInputDraft.parseStored(raw)).toEqual({ 'u:a:s': { text: 'hi', updatedAt: NOW } });
  });
});

describe('ChatInputDraft.prune', () => {
  test('drops entries older than the TTL', () => {
    const entries = {
      fresh: { text: 'a', updatedAt: NOW - ONE_DAY },
      stale: { text: 'b', updatedAt: NOW - ChatInputDraft.TTL_MS - 1 },
    };
    expect(ChatInputDraft.prune(entries, NOW)).toEqual({ fresh: entries.fresh });
  });

  test('drops entries with missing text or updatedAt fields', () => {
    const entries = {
      good: { text: 'ok', updatedAt: NOW },
      noText: { updatedAt: NOW },
      noTs: { text: 'x' },
      nullEntry: null,
    };
    expect(ChatInputDraft.prune(entries, NOW)).toEqual({ good: entries.good });
  });

  test('keeps only the newest MAX_ENTRIES when over capacity', () => {
    const entries = {};
    for (let i = 0; i < ChatInputDraft.MAX_ENTRIES + 5; i++) {
      entries[`k${i}`] = { text: `${i}`, updatedAt: NOW - i };
    }
    const pruned = ChatInputDraft.prune(entries, NOW);
    expect(Object.keys(pruned)).toHaveLength(ChatInputDraft.MAX_ENTRIES);
    expect(pruned.k0).toBeDefined();
    expect(pruned[`k${ChatInputDraft.MAX_ENTRIES + 4}`]).toBeUndefined();
  });

  test('returns an empty object when given an empty object', () => {
    expect(ChatInputDraft.prune({}, NOW)).toEqual({});
  });
});

describe('ChatInputDraft.read', () => {
  test('returns the stored text for the matching entry', () => {
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, JSON.stringify({
      'u1:a1:s1': { text: 'hello', updatedAt: NOW },
    }));
    expect(ChatInputDraft.read({ userId: 'u1', agentId: 'a1', sessionId: 's1', now: NOW })).toBe('hello');
  });

  test('returns empty string when no entry exists', () => {
    expect(ChatInputDraft.read({ userId: 'u1', agentId: 'a1', sessionId: 's1' })).toBe('');
  });

  test('returns empty string when userId or agentId is missing', () => {
    expect(ChatInputDraft.read({ userId: '', agentId: 'a1', sessionId: 's1' })).toBe('');
    expect(ChatInputDraft.read({ userId: 'u1', agentId: '', sessionId: 's1' })).toBe('');
  });

  test('reads under the new-session sentinel when sessionId is null', () => {
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, JSON.stringify({
      [`u1:a1:${ChatInputDraft.NEW_SESSION_SENTINEL}`]: { text: 'draft', updatedAt: NOW },
    }));
    expect(ChatInputDraft.read({ userId: 'u1', agentId: 'a1', sessionId: null, now: NOW })).toBe('draft');
  });

  test('returns empty string when the stored entry has expired', () => {
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, JSON.stringify({
      'u1:a1:s1': { text: 'stale', updatedAt: NOW - ChatInputDraft.TTL_MS - 1 },
    }));
    expect(ChatInputDraft.read({ userId: 'u1', agentId: 'a1', sessionId: 's1', now: NOW })).toBe('');
  });
});

describe('ChatInputDraft.write', () => {
  test('persists a new entry under the composite key', () => {
    ChatInputDraft.write({ userId: 'u1', agentId: 'a1', sessionId: 's1', text: 'hi', now: NOW });
    const stored = JSON.parse(localStorage.getItem(ChatInputDraft.STORAGE_KEY));
    expect(stored['u1:a1:s1']).toEqual({ text: 'hi', updatedAt: NOW });
  });

  test('deletes the entry when text is empty or whitespace', () => {
    ChatInputDraft.write({ userId: 'u1', agentId: 'a1', sessionId: 's1', text: 'hi', now: NOW });
    ChatInputDraft.write({ userId: 'u1', agentId: 'a1', sessionId: 's1', text: '   ', now: NOW });
    const stored = JSON.parse(localStorage.getItem(ChatInputDraft.STORAGE_KEY));
    expect(stored['u1:a1:s1']).toBeUndefined();
  });

  test('no-ops when userId or agentId is missing', () => {
    ChatInputDraft.write({ userId: '', agentId: 'a1', sessionId: 's1', text: 'hi' });
    expect(localStorage.getItem(ChatInputDraft.STORAGE_KEY)).toBeNull();
  });

  test('prunes older entries when over capacity', () => {
    const entries = {};
    for (let i = 0; i < ChatInputDraft.MAX_ENTRIES; i++) {
      entries[`u:a:s${i}`] = { text: `${i}`, updatedAt: NOW - (ChatInputDraft.MAX_ENTRIES - i) * 1000 };
    }
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, JSON.stringify(entries));
    ChatInputDraft.write({ userId: 'u', agentId: 'a', sessionId: 'new', text: 'new', now: NOW });
    const stored = JSON.parse(localStorage.getItem(ChatInputDraft.STORAGE_KEY));
    expect(Object.keys(stored)).toHaveLength(ChatInputDraft.MAX_ENTRIES);
    expect(stored['u:a:new']).toEqual({ text: 'new', updatedAt: NOW });
    expect(stored['u:a:s0']).toBeUndefined();
  });

  test('leaves other entries untouched when updating one', () => {
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, JSON.stringify({
      'u1:a1:s1': { text: 'first', updatedAt: NOW - 1000 },
      'u2:a2:s2': { text: 'other', updatedAt: NOW - 500 },
    }));
    ChatInputDraft.write({ userId: 'u1', agentId: 'a1', sessionId: 's1', text: 'updated', now: NOW });
    const stored = JSON.parse(localStorage.getItem(ChatInputDraft.STORAGE_KEY));
    expect(stored['u1:a1:s1']).toEqual({ text: 'updated', updatedAt: NOW });
    expect(stored['u2:a2:s2']).toEqual({ text: 'other', updatedAt: NOW - 500 });
  });
});

describe('ChatInputDraft.clear', () => {
  test('removes the matching entry', () => {
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, JSON.stringify({
      'u1:a1:s1': { text: 'hi', updatedAt: NOW },
      'u1:a1:s2': { text: 'keep', updatedAt: NOW },
    }));
    ChatInputDraft.clear({ userId: 'u1', agentId: 'a1', sessionId: 's1', now: NOW });
    const stored = JSON.parse(localStorage.getItem(ChatInputDraft.STORAGE_KEY));
    expect(stored['u1:a1:s1']).toBeUndefined();
    expect(stored['u1:a1:s2']).toBeDefined();
  });

  test('no-ops when the entry does not exist', () => {
    ChatInputDraft.clear({ userId: 'u1', agentId: 'a1', sessionId: 's1', now: NOW });
    expect(localStorage.getItem(ChatInputDraft.STORAGE_KEY)).toBe('{}');
  });
});

describe('ChatInputDraft.readAll', () => {
  test('returns an empty object when storage is empty', () => {
    expect(ChatInputDraft.readAll(NOW)).toEqual({});
  });

  test('returns an empty object when storage is corrupted', () => {
    localStorage.setItem(ChatInputDraft.STORAGE_KEY, '{not valid');
    expect(ChatInputDraft.readAll(NOW)).toEqual({});
  });
});
