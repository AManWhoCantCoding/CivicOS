export type ActorSnapshot = {
  id?: string;
  name?: string;
  role?: string;
  organizationId?: string;
};

export type DomainEvent<TPayload = Record<string, unknown>> = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: Date;
  recordedAt: Date;
  actor: ActorSnapshot;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
  metadata: Record<string, unknown>;
};

export type EventConsumer = (event: DomainEvent) => Promise<void>;

export type RegisteredEventConsumer = {
  name: string;
  handler: EventConsumer;
};

export type AppendEventInput = Omit<DomainEvent, 'recordedAt'> & {
  recordedAt?: Date;
};
