import { TRIGGER_PATTERN } from './config.js';
import { NewMessage } from './types.js';

export type SessionCommandName = 'clear';

export interface SessionCommandMatch {
  index: number;
  name: SessionCommandName;
  message: NewMessage;
  prompt: '/compact';
  addressed: boolean;
  hasMessagesAfter: boolean;
}

function stripTriggerPrefix(content: string): {
  text: string;
  hadTrigger: boolean;
} {
  const trimmed = content.trim();
  if (!TRIGGER_PATTERN.test(trimmed)) {
    return { text: trimmed, hadTrigger: false };
  }

  return {
    text: trimmed.replace(TRIGGER_PATTERN, '').trimStart(),
    hadTrigger: true,
  };
}

export function findSessionCommand(
  messages: NewMessage[],
  isMainGroup: boolean,
  requiresTrigger: boolean | undefined,
  canAddressTrigger: (message: NewMessage) => boolean = () => true,
): SessionCommandMatch | undefined {
  const needsTrigger = !isMainGroup && requiresTrigger !== false;

  for (const [index, message] of messages.entries()) {
    const { text, hadTrigger } = stripTriggerPrefix(message.content);
    if (!/^\/clear\b/i.test(text)) continue;

    return {
      index,
      name: 'clear',
      message,
      prompt: '/compact',
      addressed: !needsTrigger || (hadTrigger && canAddressTrigger(message)),
      hasMessagesAfter: index < messages.length - 1,
    };
  }

  return undefined;
}

export function isSessionCommandAuthorized(
  command: SessionCommandMatch,
  isMainGroup: boolean,
): boolean {
  return isMainGroup || command.message.is_from_me === true;
}
