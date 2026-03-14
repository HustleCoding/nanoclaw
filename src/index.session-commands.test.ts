import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runContainerAgent } = vi.hoisted(() => ({
  runContainerAgent: vi.fn(),
}));

vi.mock('./channels/index.js', () => ({}));

vi.mock('./logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

vi.mock('./container-runner.js', () => ({
  runContainerAgent,
  writeGroupsSnapshot: vi.fn(),
  writeTasksSnapshot: vi.fn(),
}));

import { ASSISTANT_NAME } from './config.js';
import {
  _initTestDatabase,
  getMessagesSince,
  getRouterState,
  storeChatMetadata,
  storeMessage,
} from './db.js';
import {
  _processGroupMessagesForTests,
  _setChannels,
  _setLastAgentTimestamp,
  _setRegisteredGroups,
} from './index.js';
import type { Channel, RegisteredGroup } from './types.js';

const sendMessage = vi.fn(async () => {});
const setTyping = vi.fn(async () => {});

const fakeChannel: Channel = {
  name: 'test',
  connect: async () => {},
  sendMessage,
  isConnected: () => true,
  ownsJid: (jid) => jid === 'group@g.us',
  disconnect: async () => {},
  setTyping,
};

const mainGroup: RegisteredGroup = {
  name: 'Main',
  folder: 'main',
  trigger: '@Andy',
  added_at: '2024-01-01T00:00:00.000Z',
  isMain: true,
  requiresTrigger: false,
};

function makeMessage(content: string, timestamp: string) {
  return {
    id: `${timestamp}-${content}`,
    chat_jid: 'group@g.us',
    sender: 'user@s.whatsapp.net',
    sender_name: 'User',
    content,
    timestamp,
    is_from_me: false,
  };
}

describe('processGroupMessages /clear handling', () => {
  beforeEach(() => {
    _initTestDatabase();
    _setRegisteredGroups({ 'group@g.us': mainGroup });
    _setChannels([fakeChannel]);
    _setLastAgentTimestamp({});
    sendMessage.mockClear();
    setTyping.mockClear();
    runContainerAgent.mockReset();

    storeChatMetadata(
      'group@g.us',
      '2024-01-01T00:00:00.000Z',
      'Main',
      'test',
      true,
    );
  });

  it('processes messages before /clear, then compacts, leaving later messages pending', async () => {
    const prompts: string[] = [];

    runContainerAgent.mockImplementation(
      async (
        _group: RegisteredGroup,
        input: { prompt: string },
        _onProcess: unknown,
        onOutput?: (output: {
          status: 'success' | 'error';
          result: string | null;
          newSessionId?: string;
        }) => Promise<void>,
      ) => {
        prompts.push(input.prompt);
        await onOutput?.({
          status: 'success',
          result: `ok:${input.prompt}`,
          newSessionId: 'session-1',
        });
        return {
          status: 'success' as const,
          result: null,
          newSessionId: 'session-1',
        };
      },
    );

    storeMessage(makeMessage('before', '2024-01-01T00:00:00.000Z'));
    storeMessage(makeMessage('/clear', '2024-01-01T00:00:01.000Z'));
    storeMessage(makeMessage('after', '2024-01-01T00:00:02.000Z'));

    const ok = await _processGroupMessagesForTests('group@g.us');

    expect(ok).toBe(true);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain('before');
    expect(prompts[0]).not.toContain('/clear');
    expect(prompts[1]).toBe('/compact');

    expect(JSON.parse(getRouterState('last_agent_timestamp') || '{}')).toEqual({
      'group@g.us': '2024-01-01T00:00:01.000Z',
    });

    const pending = getMessagesSince(
      'group@g.us',
      '2024-01-01T00:00:01.000Z',
      ASSISTANT_NAME,
    );
    expect(pending.map((message) => message.content)).toEqual(['after']);
  });
});
