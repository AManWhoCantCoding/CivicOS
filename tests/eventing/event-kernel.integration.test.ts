import { describe, expect, it } from 'vitest';

import { registerEventConsumer } from '@/modules/eventing';
import type { DomainEvent } from '@/modules/eventing';

describe('event kernel contract', () => {
  it('describes an immutable aggregate event with actor and causation metadata', () => {
    const event: DomainEvent<{ value: string }> = {
      eventId: 'event-1',
      eventType: 'TestRecorded',
      eventVersion: 1,
      aggregateType: 'TestAggregate',
      aggregateId: 'aggregate-1',
      aggregateVersion: 1,
      occurredAt: new Date('2026-01-01T00:00:00.000Z'),
      recordedAt: new Date('2026-01-01T00:00:01.000Z'),
      actor: { id: 'user-1', role: 'operator', organizationId: 'unit-1' },
      correlationId: 'correlation-1',
      causationId: 'command-1',
      payload: { value: 'known-good' },
      metadata: {},
    };

    expect(event.aggregateVersion).toBe(1);
    expect(event.actor.id).toBe('user-1');
    expect(event.recordedAt.toISOString()).toBe('2026-01-01T00:00:01.000Z');
    expect(event.payload.value).toBe('known-good');
  });

  it('requires unique names for event consumers', () => {
    const consumer = async () => undefined;
    const unregister = registerEventConsumer(
      'TestRecorded',
      consumer,
      'test-consumer',
    );
    expect(() =>
      registerEventConsumer('TestRecorded', consumer, 'test-consumer'),
    ).toThrow('DUPLICATE_EVENT_CONSUMER');
    unregister();
  });
});
