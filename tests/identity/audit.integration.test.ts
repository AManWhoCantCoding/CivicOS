import { describe, expect, it } from 'vitest';

import {
  blindIndex,
  decryptSensitive,
  encryptSensitive,
} from '@/modules/identity';

describe('identity audit and sensitive data boundary', () => {
  it('keeps encrypted identifiers independent from persistent plaintext', () => {
    const encrypted = encryptSensitive('CCCD-123');
    expect(encrypted).not.toContain('CCCD-123');
    expect(decryptSensitive(encrypted)).toBe('CCCD-123');
    expect(blindIndex('CCCD-123')).toHaveLength(64);
  });
});
