import { describe, expect, it } from 'vitest';

import {
  findSessionCommand,
  isSessionCommandAuthorized,
} from './session-commands.js';

function makeMessage(content: string, is_from_me = false) {
  return {
    id: Math.random().toString(36),
    chat_jid: 'group@g.us',
    sender: is_from_me ? 'me@s.whatsapp.net' : 'user@s.whatsapp.net',
    sender_name: is_from_me ? 'Me' : 'User',
    content,
    timestamp: '2024-01-01T00:00:00.000Z',
    is_from_me,
  };
}

describe('findSessionCommand', () => {
  it('maps /clear to /compact in the main group', () => {
    const command = findSessionCommand([makeMessage('/clear')], true, true);
    expect(command?.index).toBe(0);
    expect(command?.name).toBe('clear');
    expect(command?.prompt).toBe('/compact');
    expect(command?.addressed).toBe(true);
  });

  it('marks triggered commands as addressed when sender is reachable', () => {
    const command = findSessionCommand(
      [makeMessage('@Andy /clear')],
      false,
      true,
      () => true,
    );
    expect(command?.addressed).toBe(true);
  });

  it('does not address denied trigger senders', () => {
    const command = findSessionCommand(
      [makeMessage('@Andy /clear')],
      false,
      true,
      () => false,
    );
    expect(command?.addressed).toBe(false);
  });

  it('consumes bare /clear silently in trigger-gated groups', () => {
    const command = findSessionCommand([makeMessage('/clear')], false, true);
    expect(command?.addressed).toBe(false);
  });

  it('tracks whether messages remain after the command', () => {
    const command = findSessionCommand(
      [makeMessage('/clear'), makeMessage('after')],
      true,
      true,
    );
    expect(command?.index).toBe(0);
    expect(command?.hasMessagesAfter).toBe(true);
  });

  it('tracks the command position within the batch', () => {
    const command = findSessionCommand(
      [makeMessage('before'), makeMessage('/clear'), makeMessage('after')],
      true,
      true,
    );
    expect(command?.index).toBe(1);
  });
});

describe('isSessionCommandAuthorized', () => {
  it('allows main-group senders', () => {
    const command = findSessionCommand([makeMessage('/clear')], true, true);
    expect(command).toBeDefined();
    expect(isSessionCommandAuthorized(command!, true)).toBe(true);
  });

  it('allows device-owner messages in non-main groups', () => {
    const command = findSessionCommand(
      [makeMessage('/clear', true)],
      false,
      false,
    );
    expect(command).toBeDefined();
    expect(isSessionCommandAuthorized(command!, false)).toBe(true);
  });

  it('denies other users in non-main groups', () => {
    const command = findSessionCommand([makeMessage('/clear')], false, false);
    expect(command).toBeDefined();
    expect(isSessionCommandAuthorized(command!, false)).toBe(false);
  });
});
