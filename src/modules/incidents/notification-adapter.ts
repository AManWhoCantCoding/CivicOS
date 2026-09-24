export type IntakeResultNotification = {
  reportId: string;
  recipientId: string;
  body: string;
  availableAt: Date;
};

export type IntakeNotificationAttempt = IntakeResultNotification & {
  attempt: number;
  sentAt?: Date;
};

export class MockIntakeResultNotificationAdapter {
  readonly attempts: IntakeNotificationAttempt[] = [];

  dispatch(input: IntakeResultNotification): IntakeNotificationAttempt {
    const attempt =
      this.attempts.filter((item) => item.reportId === input.reportId).length +
      1;
    const result = { ...input, attempt };
    this.attempts.push(result);
    return result;
  }

  retry(input: IntakeResultNotification): IntakeNotificationAttempt {
    return this.dispatch(input);
  }
}
