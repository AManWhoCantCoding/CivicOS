import { describe, expect, it, vi } from 'vitest';

import { createDemoRunner } from '@/modules/demo/runner';
import { createWebActionExecutor } from '@/modules/demo/web-actions';
import { makeValidManifest } from './demo-manifest-fixture';

type FakeOption = { value: string; label: string; disabled?: boolean };

type FakeSelect = {
  tagName: string;
  attrs: Record<string, string>;
  options: FakeOption[];
  selectedIndex: number;
  clicked: number;
  focused: number;
  dispatched: string[];
  onFocus?: (el: FakeSelect) => void;
  showPicker?: () => void;
  getAttribute: (name: string) => string | null;
  click: () => void;
  focus: () => void;
  dispatchEvent: (event: unknown) => boolean;
};

function makeSelect(input: {
  label: string;
  options: FakeOption[];
  selectedIndex?: number;
  showPicker?: () => void;
}): FakeSelect {
  const el: FakeSelect = {
    tagName: 'SELECT',
    attrs: { 'aria-label': input.label },
    options: input.options,
    selectedIndex: input.selectedIndex ?? 0,
    clicked: 0,
    focused: 0,
    dispatched: [],
    showPicker: input.showPicker,
    getAttribute(name: string) {
      return el.attrs[name] ?? null;
    },
    click() {
      el.clicked += 1;
    },
    focus() {
      el.focused += 1;
      el.onFocus?.(el);
    },
    dispatchEvent(event: unknown) {
      const type = (event as { type?: unknown }).type;
      el.dispatched.push(typeof type === 'string' ? type : 'unknown');
      return true;
    },
  };
  Object.defineProperty(el, 'textContent', { get: () => input.label });
  return el;
}

function makeHarness(
  elements: FakeSelect[],
  extra: Record<string, unknown> = {},
) {
  const doc = {
    activeElement: null as FakeSelect | null,
    querySelectorAll: () => elements,
    getElementById: () => null,
    getBodyText: () => '',
  };
  for (const el of elements) {
    el.onFocus = (target) => {
      doc.activeElement = target;
    };
  }
  return {
    getDocument: () => doc,
    waitForExpectation: async () => true,
    ...extra,
  };
}

const detail = (value: unknown): string => JSON.stringify(value);

function statusOf(outcome: unknown): string {
  return typeof outcome === 'string'
    ? outcome
    : (outcome as { status: string }).status;
}

function reasonOf(outcome: unknown): string {
  return typeof outcome === 'string'
    ? ''
    : ((outcome as { reason?: string }).reason ?? '');
}

describe('T-005 AC-2 native select open-before-choose ordering', () => {
  it('blocks choose-option before open with SELECT_NOT_OPEN', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const executor = createWebActionExecutor(makeHarness([select]));
    const outcome = await executor({
      id: 'step-1',
      action: 'choose-option',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('SELECT_NOT_OPEN');
  });

  it('records the opened select only when focus is observable', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const harness = makeHarness([select]);
    select.onFocus = undefined;
    const executor = createWebActionExecutor(harness);
    const opened = await executor({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    expect(statusOf(opened)).toBe('blocked');
    expect(reasonOf(opened)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');

    const after = await executor({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
    });
    expect(statusOf(after)).toBe('blocked');
    expect(reasonOf(after)).toBe('SELECT_NOT_OPEN');
  });

  it('succeeds only after opening the same focused select', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [
        { value: 'moi', label: 'Moi' },
        { value: 'dong', label: 'Dong', disabled: true },
      ],
    });
    const chooseOption = vi.fn(() => true);
    const executor = createWebActionExecutor(
      makeHarness([select], { chooseOption }),
    );
    const opened = await executor({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    expect(statusOf(opened)).toBe('settled');
    expect(select.focused).toBe(1);

    const chosen = await executor({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
    });
    expect(statusOf(chosen)).toBe('settled');
    expect(chooseOption).toHaveBeenCalledTimes(1);
    expect(chooseOption).toHaveBeenCalledWith(select, 'moi');
  });

  it('fails closed when no user-level option path can confirm selection', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const executor = createWebActionExecutor(makeHarness([select]));
    await executor({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    const outcome = await executor({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');

    const silent = createWebActionExecutor(
      makeHarness([select], { chooseOption: vi.fn() }),
    );
    await silent({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    const unconfirmed = await silent({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
    });
    expect(statusOf(unconfirmed)).toBe('blocked');
    expect(reasonOf(unconfirmed)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');

    const refusing = createWebActionExecutor(
      makeHarness([select], { chooseOption: () => false }),
    );
    await refusing({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    const refused = await refusing({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
    });
    expect(statusOf(refused)).toBe('blocked');
    expect(reasonOf(refused)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
  });

  it('rejects a missing option value and treats empty as a real lookup', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const executor = createWebActionExecutor(
      makeHarness([select], { chooseOption: vi.fn(() => true) }),
    );
    await executor({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    const missing = await executor({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    expect(statusOf(missing)).toBe('blocked');
    expect(reasonOf(missing)).toBe('DEMO_STEP_INVALID_DESCRIPTOR');

    const empty = await executor({
      id: 'step-3',
      action: 'choose-option',
      index: 2,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: '' }),
    });
    expect(statusOf(empty)).toBe('blocked');
    expect(reasonOf(empty)).toBe('DEMO_STEP_OPTION_NOT_FOUND');
  });

  it('awaits declared readiness after choosing an option', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const seen: unknown[] = [];
    const executor = createWebActionExecutor(
      makeHarness([select], {
        chooseOption: vi.fn(() => true),
        waitForExpectation: async (expectation: unknown, timeoutMs: number) => {
          seen.push([expectation, timeoutMs]);
          return true;
        },
      }),
    );
    await executor({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    const outcome = await executor({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({
        role: 'combobox',
        name: 'Trang thai',
        value: 'moi',
        path: '/sau-chon',
      }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(seen).toEqual([[{ path: '/sau-chon', text: undefined }, 5000]]);
  });

  it('chooses through the default native keyboard path when selection confirms', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [
        { value: 'moi', label: 'Moi' },
        { value: 'dong', label: 'Dong' },
      ],
      selectedIndex: 1,
    });
    const native = select.dispatchEvent;
    select.dispatchEvent = (event: unknown) => {
      native(event);
      // Fake native driver: trusted user keys move the selection to Moi.
      select.selectedIndex = 0;
      return true;
    };
    class FakeKeyboardEvent {
      type: string;
      key: string;
      bubbles: boolean;
      constructor(
        type: string,
        init: { key?: string; bubbles?: boolean } = {},
      ) {
        this.type = type;
        this.key = init.key ?? '';
        this.bubbles = init.bubbles ?? false;
      }
    }
    vi.stubGlobal('KeyboardEvent', FakeKeyboardEvent);
    try {
      const executor = createWebActionExecutor(makeHarness([select]));
      await executor({
        id: 'step-1',
        action: 'open-select',
        index: 0,
        detail: detail({ role: 'combobox', name: 'Trang thai' }),
      });
      const outcome = await executor({
        id: 'step-2',
        action: 'choose-option',
        index: 1,
        detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
      });
      expect(statusOf(outcome)).toBe('settled');
      expect(select.dispatched).toEqual([
        'keydown',
        'keyup',
        'input',
        'change',
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('dispatches directional presses skipping disabled options', async () => {
    const select = makeSelect({
      label: 'Muc do',
      options: [
        { value: 'thap', label: 'Thap' },
        { value: 'khoa', label: 'Khoa', disabled: true },
        { value: 'vua', label: 'Vua' },
        { value: 'cao', label: 'Cao' },
      ],
      selectedIndex: 0,
    });
    const keys: string[] = [];
    select.dispatchEvent = (event: unknown) => {
      const e = event as { type?: unknown; key?: unknown };
      select.dispatched.push(typeof e.type === 'string' ? e.type : 'unknown');
      // Fake trusted native navigation: each arrow press moves to the next
      // enabled option, mirroring real select behavior.
      if (e.type === 'keydown' && typeof e.key === 'string') {
        keys.push(e.key);
        const direction =
          e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (direction !== 0) {
          let position = select.selectedIndex;
          for (;;) {
            position += direction;
            const option = select.options[position];
            if (!option) break;
            if (!option.disabled) {
              select.selectedIndex = position;
              break;
            }
          }
        }
      }
      return true;
    };
    class FakeKeyboardEvent {
      type: string;
      key: string;
      bubbles: boolean;
      constructor(
        type: string,
        init: { key?: string; bubbles?: boolean } = {},
      ) {
        this.type = type;
        this.key = init.key ?? '';
        this.bubbles = init.bubbles ?? false;
      }
    }
    vi.stubGlobal('KeyboardEvent', FakeKeyboardEvent);
    try {
      const executor = createWebActionExecutor(makeHarness([select]));
      await executor({
        id: 'step-1',
        action: 'open-select',
        index: 0,
        detail: detail({ role: 'combobox', name: 'Muc do' }),
      });
      const down = await executor({
        id: 'step-2',
        action: 'choose-option',
        index: 1,
        detail: detail({ role: 'combobox', name: 'Muc do', value: 'cao' }),
      });
      expect(statusOf(down)).toBe('settled');
      expect(keys).toEqual(['ArrowDown', 'ArrowDown']);
      expect(select.dispatched).toEqual([
        'keydown',
        'keyup',
        'keydown',
        'keyup',
        'input',
        'change',
      ]);

      keys.length = 0;
      select.dispatched.length = 0;
      const up = await executor({
        id: 'step-3',
        action: 'choose-option',
        index: 2,
        detail: detail({ role: 'combobox', name: 'Muc do', value: 'thap' }),
      });
      expect(statusOf(up)).toBe('settled');
      expect(keys).toEqual(['ArrowUp', 'ArrowUp']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fails the default choose closed when selection cannot confirm', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [
        { value: 'moi', label: 'Moi' },
        { value: 'dong', label: 'Dong' },
      ],
      selectedIndex: 1,
    });
    class FakeKeyboardEvent {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    }
    vi.stubGlobal('KeyboardEvent', FakeKeyboardEvent);
    try {
      const executor = createWebActionExecutor(makeHarness([select]));
      await executor({
        id: 'step-1',
        action: 'open-select',
        index: 0,
        detail: detail({ role: 'combobox', name: 'Trang thai' }),
      });
      const outcome = await executor({
        id: 'step-2',
        action: 'choose-option',
        index: 1,
        detail: detail({ role: 'combobox', name: 'Trang thai', value: 'moi' }),
      });
      expect(statusOf(outcome)).toBe('blocked');
      expect(reasonOf(outcome)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('blocks choosing on another select and disabled or missing options', async () => {
    const first = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const second = makeSelect({
      label: 'Muc do',
      options: [{ value: 'cao', label: 'Cao' }],
    });
    const executor = createWebActionExecutor(
      makeHarness([first, second], { chooseOption: vi.fn(() => true) }),
    );
    await executor({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });

    const other = await executor({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Muc do', value: 'cao' }),
    });
    expect(statusOf(other)).toBe('blocked');
    expect(reasonOf(other)).toBe('SELECT_NOT_OPEN');

    const disabledSelect = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'dong', label: 'Dong', disabled: true }],
    });
    const executor2 = createWebActionExecutor(
      makeHarness([disabledSelect], { chooseOption: vi.fn(() => true) }),
    );
    await executor2({
      id: 'step-1',
      action: 'open-select',
      index: 0,
      detail: detail({ role: 'combobox', name: 'Trang thai' }),
    });
    const disabledOutcome = await executor2({
      id: 'step-2',
      action: 'choose-option',
      index: 1,
      detail: detail({ role: 'combobox', name: 'Trang thai', value: 'dong' }),
    });
    expect(statusOf(disabledOutcome)).toBe('blocked');
    expect(reasonOf(disabledOutcome)).toBe('DEMO_STEP_OPTION_DISABLED');

    const missing = await executor2({
      id: 'step-3',
      action: 'choose-option',
      index: 2,
      detail: detail({
        role: 'combobox',
        name: 'Trang thai',
        value: 'khong-co',
      }),
    });
    expect(statusOf(missing)).toBe('blocked');
    expect(reasonOf(missing)).toBe('DEMO_STEP_OPTION_NOT_FOUND');
  });

  it('surfaces SELECT_NOT_OPEN on the runner step event', async () => {
    const select = makeSelect({
      label: 'Trang thai',
      options: [{ value: 'moi', label: 'Moi' }],
    });
    const executor = createWebActionExecutor(makeHarness([select]));
    const events: { stepId: string; status: string; reason: string }[] = [];
    const runner = createDemoRunner({
      manifest: makeValidManifest({
        steps: [
          {
            id: 'step-1',
            action: 'choose-option',
            detail: detail({
              role: 'combobox',
              name: 'Trang thai',
              value: 'moi',
            }),
          },
        ],
      }),
      executor: (step) => executor(step),
      onEvent: (event) =>
        events.push(
          event as { stepId: string; status: string; reason: string },
        ),
    });
    await runner.start();
    expect(runner.getState()).toBe('blocked');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      stepId: 'step-1',
      status: 'blocked',
      reason: 'SELECT_NOT_OPEN',
    });
    expect(JSON.stringify(events)).not.toContain('moi');
  });
});
