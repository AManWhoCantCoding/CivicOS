import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createWebActionExecutor } from '@/modules/demo/web-actions';

type FakeElement = {
  tagName: string;
  attrs: Record<string, string>;
  text: string;
  checkedState: boolean;
  inputType?: string;
  style?: { display?: string; visibility?: string };
  rect?: { width: number; height: number };
  labelTexts?: string[];
  clicked: number;
  focused: number;
  dispatched: string[];
  onFocus?: (el: FakeElement) => void;
  requestSubmit?: () => void;
  getAttribute: (name: string) => string | null;
  click: () => void;
  focus: () => void;
  dispatchEvent: (event: unknown) => boolean;
};

function makeElement(input: {
  tag?: string;
  attrs?: Record<string, string>;
  text?: string;
  disabled?: boolean;
  checked?: boolean;
  connected?: boolean;
  inputType?: string;
  style?: { display?: string; visibility?: string };
  rect?: { width: number; height: number };
  labelTexts?: string[];
  requestSubmit?: () => void;
}): FakeElement {
  const el: FakeElement = {
    tagName: (input.tag ?? 'BUTTON').toUpperCase(),
    attrs: input.attrs ?? {},
    text: input.text ?? '',
    checkedState: input.checked ?? false,
    inputType: input.inputType,
    style: input.style,
    rect: input.rect,
    labelTexts: input.labelTexts,
    clicked: 0,
    focused: 0,
    dispatched: [],
    requestSubmit: input.requestSubmit,
    getAttribute(name: string) {
      if (name === 'type' && el.inputType) return el.inputType;
      return el.attrs[name] ?? null;
    },
    click() {
      el.clicked += 1;
      // Emulate trusted native behavior: clicking a checkbox flips its state.
      if (el.inputType === 'checkbox') {
        el.checkedState = !el.checkedState;
      }
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
  Object.defineProperty(el, 'disabled', {
    get: () => input.disabled ?? false,
  });
  Object.defineProperty(el, 'checked', { get: () => el.checkedState });
  Object.defineProperty(el, 'textContent', { get: () => el.text });
  if (input.connected !== undefined) {
    Object.defineProperty(el, 'isConnected', {
      get: () => input.connected,
    });
  }
  if (input.rect !== undefined) {
    Object.defineProperty(el, 'getBoundingClientRect', {
      get: () => () => ({ ...input.rect }),
    });
  }
  if (input.labelTexts !== undefined) {
    Object.defineProperty(el, 'labels', {
      get: () => input.labelTexts!.map((text) => ({ textContent: text })),
    });
  }
  return el;
}

function makeHarness(
  elements: FakeElement[],
  extra: Record<string, unknown> = {},
) {
  const doc = {
    activeElement: null as FakeElement | null,
    querySelectorAll: () => elements,
    getElementById: (id: string) => {
      const found = elements.find((el) => el.attrs['id'] === id);
      return found ? { textContent: found.text } : null;
    },
    getBodyText: () => elements.map((el) => el.text).join(' '),
  };
  for (const el of elements) {
    el.onFocus = (target) => {
      doc.activeElement = target;
    };
  }
  return {
    getDocument: () => doc,
    getPath: () => '/demo',
    waitForExpectation: async () => true,
    ...extra,
  };
}

function detail(value: unknown): string {
  return JSON.stringify(value);
}

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

describe('T-005 AC-1 behavior-faithful web actions', () => {
  it('clicks a visible enabled button through the native click path', async () => {
    const button = makeElement({
      attrs: { 'aria-label': 'Bat dau demo' },
      text: 'Bat dau demo',
    });
    const executor = createWebActionExecutor(makeHarness([button]));
    const outcome = await executor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: detail({ role: 'button', name: 'Bat dau demo' }),
    });
    expect(button.clicked).toBe(1);
    expect(statusOf(outcome)).toBe('settled');
  });

  it('blocks hidden, disabled, aria-disabled, styled-out, disconnected and zero-rect controls', async () => {
    for (const hidden of [
      makeElement({ attrs: { 'aria-label': 'A', hidden: '' } }),
      makeElement({ attrs: { 'aria-label': 'A', 'aria-hidden': 'true' } }),
      makeElement({ attrs: { 'aria-label': 'A' }, disabled: true }),
      makeElement({ attrs: { 'aria-label': 'A', 'aria-disabled': 'true' } }),
      makeElement({
        attrs: { 'aria-label': 'A' },
        style: { display: 'none' },
      }),
      makeElement({
        attrs: { 'aria-label': 'A' },
        style: { visibility: 'hidden' },
      }),
      makeElement({ attrs: { 'aria-label': 'A' }, connected: false }),
      makeElement({
        attrs: { 'aria-label': 'A' },
        rect: { width: 0, height: 0 },
      }),
    ]) {
      const executor = createWebActionExecutor(makeHarness([hidden]));
      const outcome = await executor({
        id: 'step-1',
        action: 'click',
        index: 0,
        detail: detail({ role: 'button', name: 'A' }),
      });
      expect(statusOf(outcome)).toBe('blocked');
      expect(hidden.clicked).toBe(0);
    }
  });

  it('treats a connected control with a real rect as visible', async () => {
    const button = makeElement({
      attrs: { 'aria-label': 'Hien' },
      connected: true,
      rect: { width: 120, height: 44 },
    });
    const executor = createWebActionExecutor(makeHarness([button]));
    const outcome = await executor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: detail({ role: 'button', name: 'Hien' }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(button.clicked).toBe(1);
  });

  it('rejects class-driven hidden controls via computed style', async () => {
    const classHidden = makeElement({ attrs: { 'aria-label': 'An' } });
    const hiddenExecutor = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [classHidden],
        activeElement: null,
        getComputedStyle: () => ({ display: 'none', visibility: 'visible' }),
      }),
      getPath: () => '/demo',
      waitForExpectation: async () => true,
    });
    const hidden = await hiddenExecutor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: detail({ role: 'button', name: 'An' }),
    });
    expect(statusOf(hidden)).toBe('blocked');
    expect(reasonOf(hidden)).toBe('DEMO_STEP_TARGET_HIDDEN');
    expect(classHidden.clicked).toBe(0);

    const classVisible = makeElement({ attrs: { 'aria-label': 'Hien' } });
    const visibleExecutor = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [classVisible],
        activeElement: null,
        getComputedStyle: () => ({
          display: 'block',
          visibility: 'visible',
        }),
      }),
      getPath: () => '/demo',
      waitForExpectation: async () => true,
    });
    const shown = await visibleExecutor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: detail({ role: 'button', name: 'Hien' }),
    });
    expect(statusOf(shown)).toBe('settled');
    expect(classVisible.clicked).toBe(1);
  });

  it('reads the default browser path when no injected getPath exists', async () => {
    const link = makeElement({
      tag: 'A',
      attrs: { 'aria-label': 'Ho so', href: '/ho-so' },
      text: 'Ho so',
    });
    vi.stubGlobal('window', { location: { pathname: '/ho-so' } });
    try {
      const executor = createWebActionExecutor({
        getDocument: () => ({
          querySelectorAll: () => [link],
          activeElement: null,
        }),
      });
      const outcome = await executor({
        id: 'step-1',
        action: 'navigate',
        index: 0,
        detail: detail({ path: '/ho-so' }),
      });
      expect(statusOf(outcome)).toBe('settled');
      expect(link.clicked).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('blocks ambiguous controls instead of picking one', async () => {
    const first = makeElement({ attrs: { 'aria-label': 'Chung' } });
    const second = makeElement({ attrs: { 'aria-label': 'Chung' } });
    const executor = createWebActionExecutor(makeHarness([first, second]));
    const outcome = await executor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: detail({ role: 'button', name: 'Chung' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_TARGET_AMBIGUOUS');
    expect(first.clicked).toBe(0);
    expect(second.clicked).toBe(0);
  });

  it('resolves native associated labels and labelledby references', async () => {
    const byLabel = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { id: 'ho-ten' },
      labelTexts: ['Ho ten'],
    });
    const executor = createWebActionExecutor(
      makeHarness([byLabel], { fillText: vi.fn(() => true) }),
    );
    const viaLabel = await executor({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({ role: 'textbox', name: 'Ho ten', value: 'Demo' }),
    });
    expect(statusOf(viaLabel)).toBe('settled');

    const caption = makeElement({
      tag: 'LABEL',
      attrs: { id: 'lbl-1' },
      text: 'Ngay sinh',
    });
    const byRef = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-labelledby': 'lbl-1' },
    });
    const executor2 = createWebActionExecutor(
      makeHarness([caption, byRef], { fillText: vi.fn(() => true) }),
    );
    const viaRef = await executor2({
      id: 'step-2',
      action: 'fill',
      index: 1,
      detail: detail({ role: 'textbox', name: 'Ngay sinh', value: 'Demo' }),
    });
    expect(statusOf(viaRef)).toBe('settled');
  });

  it('rejects password controls on fill and never calls fetch', async () => {
    const password = makeElement({
      tag: 'INPUT',
      inputType: 'password',
      attrs: { 'aria-label': 'Mat khau' },
    });
    const executor = createWebActionExecutor(makeHarness([password]));
    const outcome = await executor({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({
        role: 'textbox',
        name: 'Mat khau',
        value: 'khong-dung',
      }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_FORBIDDEN_CONTROL');
  });

  it('fills through the injected user-level driver after focus', async () => {
    const box = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-label': 'Ten su co' },
    });
    const fillText = vi.fn(() => true);
    const executor = createWebActionExecutor(makeHarness([box], { fillText }));
    const outcome = await executor({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({
        role: 'textbox',
        name: 'Ten su co',
        value: 'Su co demo',
      }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(box.focused).toBe(1);
    expect(fillText).toHaveBeenCalledTimes(1);
    expect(fillText).toHaveBeenCalledWith(box, 'Su co demo');
  });

  it('fails closed when the injected fill driver confirms nothing', async () => {
    const box = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-label': 'Ten su co' },
    });
    for (const driver of [vi.fn(), vi.fn(() => false)]) {
      const executor = createWebActionExecutor(
        makeHarness([box], { fillText: driver }),
      );
      const outcome = await executor({
        id: 'step-1',
        action: 'fill',
        index: 0,
        detail: detail({ role: 'textbox', name: 'Ten su co', value: 'Demo' }),
      });
      expect(statusOf(outcome)).toBe('blocked');
      expect(reasonOf(outcome)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
    }
  });

  it('allows an explicit empty fill value but rejects a missing one', async () => {
    const box = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-label': 'Ghi chu' },
    });
    const fillText = vi.fn(() => true);
    const executor = createWebActionExecutor(makeHarness([box], { fillText }));
    const cleared = await executor({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({ role: 'textbox', name: 'Ghi chu', value: '' }),
    });
    expect(statusOf(cleared)).toBe('settled');
    expect(fillText).toHaveBeenCalledWith(box, '');

    const missing = await executor({
      id: 'step-2',
      action: 'fill',
      index: 1,
      detail: detail({ role: 'textbox', name: 'Ghi chu' }),
    });
    expect(statusOf(missing)).toBe('blocked');
    expect(reasonOf(missing)).toBe('DEMO_STEP_INVALID_DESCRIPTOR');
  });

  it('fails closed when no user-level fill path exists', async () => {
    const box = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-label': 'Ten su co' },
    });
    const executor = createWebActionExecutor(makeHarness([box]));
    const outcome = await executor({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({ role: 'textbox', name: 'Ten su co', value: 'Demo' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
  });

  it('replaces text via select-all plus insert on the default path', async () => {
    const box = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-label': 'Ten su co' },
    });
    const calls: string[] = [];
    const executor2 = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [box],
        activeElement: null,
        selectAll: () => {
          calls.push('selectAll');
          return true;
        },
        execEdit: (text: string) => {
          calls.push(`insert:${text}`);
          return true;
        },
      }),
      getPath: () => '/demo',
    });
    const outcome = await executor2({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({ role: 'textbox', name: 'Ten su co', value: 'Demo' }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(calls).toEqual(['selectAll', 'insert:Demo']);
    expect(box.dispatched).toEqual(['input', 'change']);
  });

  it('fails closed when select-all cannot run on the default path', async () => {
    const box = makeElement({
      tag: 'INPUT',
      inputType: 'text',
      attrs: { 'aria-label': 'Ten su co' },
    });
    const executor2 = createWebActionExecutor({
      getDocument: () => ({
        querySelectorAll: () => [box],
        activeElement: null,
        selectAll: () => false,
        execEdit: () => true,
      }),
      getPath: () => '/demo',
    });
    const outcome = await executor2({
      id: 'step-1',
      action: 'fill',
      index: 0,
      detail: detail({ role: 'textbox', name: 'Ten su co', value: 'Demo' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(reasonOf(outcome)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
  });

  it('checks a checkbox with click only when state requires it', async () => {
    const already = makeElement({
      tag: 'INPUT',
      inputType: 'checkbox',
      attrs: { 'aria-label': 'Dong y' },
      checked: true,
    });
    const executor = createWebActionExecutor(makeHarness([already]));
    const settled = await executor({
      id: 'step-1',
      action: 'check',
      index: 0,
      detail: detail({ role: 'checkbox', name: 'Dong y', value: 'checked' }),
    });
    expect(statusOf(settled)).toBe('settled');
    expect(already.clicked).toBe(0);

    const unchecked = makeElement({
      tag: 'INPUT',
      inputType: 'checkbox',
      attrs: { 'aria-label': 'Dong y' },
      checked: false,
    });
    const executor2 = createWebActionExecutor(makeHarness([unchecked]));
    const outcome = await executor2({
      id: 'step-1',
      action: 'check',
      index: 0,
      detail: detail({ role: 'checkbox', name: 'Dong y', value: 'checked' }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(unchecked.clicked).toBe(1);

    const stuck = makeElement({
      tag: 'INPUT',
      inputType: 'checkbox',
      attrs: { 'aria-label': 'Dong y' },
      checked: false,
    });
    // Emulate a control whose native click leaves the state unchanged.
    stuck.click = () => {
      stuck.clicked += 1;
    };
    const executor3 = createWebActionExecutor(makeHarness([stuck]));
    const unconfirmed = await executor3({
      id: 'step-1',
      action: 'check',
      index: 0,
      detail: detail({ role: 'checkbox', name: 'Dong y', value: 'checked' }),
    });
    expect(statusOf(unconfirmed)).toBe('blocked');
    expect(reasonOf(unconfirmed)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
    expect(stuck.clicked).toBe(1);
  });

  it('submits a form through requestSubmit and a button through click', async () => {
    const requestSubmit = vi.fn();
    const form = makeElement({
      tag: 'FORM',
      attrs: { 'aria-label': 'Bieu mau' },
      requestSubmit,
    });
    const executor = createWebActionExecutor(makeHarness([form]));
    const submitted = await executor({
      id: 'step-1',
      action: 'submit',
      index: 0,
      detail: detail({ role: 'form', name: 'Bieu mau' }),
    });
    expect(statusOf(submitted)).toBe('settled');
    expect(requestSubmit).toHaveBeenCalledTimes(1);

    const bare = makeElement({
      tag: 'FORM',
      attrs: { 'aria-label': 'Bieu mau tran' },
    });
    const executor2 = createWebActionExecutor(makeHarness([bare]));
    const unavailable = await executor2({
      id: 'step-2',
      action: 'submit',
      index: 1,
      detail: detail({ role: 'form', name: 'Bieu mau tran' }),
    });
    expect(statusOf(unavailable)).toBe('blocked');
    expect(reasonOf(unavailable)).toBe('DEMO_STEP_INTERACTION_UNAVAILABLE');
  });

  it('awaits declared readiness after click and submit', async () => {
    const seen: unknown[] = [];
    const button = makeElement({ attrs: { 'aria-label': 'Tiep' } });
    const executor = createWebActionExecutor(
      makeHarness([button], {
        waitForExpectation: async (expectation: unknown, timeoutMs: number) => {
          seen.push([expectation, timeoutMs]);
          return true;
        },
      }),
    );
    const outcome = await executor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: detail({ role: 'button', name: 'Tiep', path: '/sau-click' }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(button.clicked).toBe(1);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual([{ path: '/sau-click', text: undefined }, 5000]);

    const failing = createWebActionExecutor(
      makeHarness([button], { waitForExpectation: async () => false }),
    );
    const blocked = await failing({
      id: 'step-2',
      action: 'click',
      index: 1,
      detail: detail({ role: 'button', name: 'Tiep', path: '/sau-click' }),
    });
    expect(statusOf(blocked)).toBe('blocked');
    expect(reasonOf(blocked)).toBe('DEMO_STEP_READINESS_TIMEOUT');
  });

  it('navigates by activating the rendered anchor with a matching href', async () => {
    const link = makeElement({
      tag: 'A',
      attrs: { 'aria-label': 'Ho so', href: '/ho-so' },
      text: 'Ho so',
    });
    const decoy = makeElement({
      tag: 'BUTTON',
      attrs: { 'aria-label': 'Ho so' },
      text: 'Ho so',
    });
    const executor = createWebActionExecutor(makeHarness([link, decoy]));
    const outcome = await executor({
      id: 'step-1',
      action: 'navigate',
      index: 0,
      detail: detail({ path: '/ho-so' }),
    });
    expect(statusOf(outcome)).toBe('settled');
    expect(link.clicked).toBe(1);
    expect(decoy.clicked).toBe(0);
  });

  it('blocks navigation when no rendered href matches the safe path', async () => {
    const scriptLink = makeElement({
      tag: 'A',
      attrs: { 'aria-label': 'Ho so', href: 'javascript:void(0)' },
      text: 'Ho so',
    });
    const executor = createWebActionExecutor(makeHarness([scriptLink]));
    const outcome = await executor({
      id: 'step-1',
      action: 'navigate',
      index: 0,
      detail: detail({ role: 'link', name: 'Ho so', path: '/ho-so' }),
    });
    expect(statusOf(outcome)).toBe('blocked');
    expect(scriptLink.clicked).toBe(0);
  });

  it('returns an explicit reason for malformed descriptors without leaking', async () => {
    const button = makeElement({ attrs: { 'aria-label': 'Bat dau' } });
    const executor = createWebActionExecutor(makeHarness([button]));
    for (const bad of [
      '{{not-json;;',
      detail({ role: 'button', name: 'Bat dau', selector: '#x' }),
      detail({ role: 'teleport', name: 'Bat dau' }),
      '',
    ]) {
      const outcome = await executor({
        id: 'step-1',
        action: 'click',
        index: 0,
        detail: bad,
      });
      expect(statusOf(outcome)).toBe('blocked');
      expect(reasonOf(outcome)).toBe('DEMO_STEP_INVALID_DESCRIPTOR');
    }
    const leaked = await executor({
      id: 'step-1',
      action: 'click',
      index: 0,
      detail: '{{not-json;;',
    });
    expect(JSON.stringify(leaked)).not.toContain('not-json');
    expect(JSON.stringify(leaked)).not.toContain('SyntaxError');
  });

  it('keeps the adapter free of bypass and assignment primitives', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/demo/web-actions.ts'),
      'utf8',
    );
    expect(source).not.toContain('fetch(');
    expect(source).toContain('window.location.pathname');
    expect(source).not.toContain('location.assign');
    expect(source).not.toMatch(/location\.replace\(/);
    expect(source).not.toMatch(/\.location\s*\.\s*href\s*=/);
    expect(source).not.toMatch(/\.href\s*=[^=]/);
    expect(source).not.toMatch(
      /(element|el|control|select|input|box|form)\.\s*value\s*=[^=]/,
    );
    expect(source).not.toMatch(
      /(element|el|control|select|input|box|form)\.selected\w*\s*=[^=]/,
    );
    expect(source).not.toMatch(
      /(element|el|control|select|input|box|form)\.checked\s*=\s*[^=]/,
    );
    expect(source).not.toMatch(/setAttribute\(\s*['"`]value/);
    expect(source).not.toContain('getOwnPropertyDescriptor');
    expect(source).not.toContain('eval(');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('force');
  });
});
