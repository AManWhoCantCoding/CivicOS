import { describe, expect, it } from 'vitest';

import {
  blindIndex,
  decryptSensitive,
  encryptSensitive,
} from '@/modules/identity';

describe('identity encryption boundary', () => {
  it('does not persist plaintext and can recover the protected value', () => {
    const encrypted = encryptSensitive('sensitive-value');
    expect(encrypted).not.toContain('sensitive-value');
    expect(decryptSensitive(encrypted)).toBe('sensitive-value');
    expect(blindIndex('same-value')).toBe(blindIndex('same-value'));
  });
});
