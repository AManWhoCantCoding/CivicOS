import type { DemoExecutor } from './runner';

export const WEB_ACTION_TIMEOUT_MAX_MS = 10000;

const ALLOWED_TARGET_KEYS = new Set([
  'role',
  'name',
  'label',
  'testId',
  'path',
  'value',
  'option',
  'text',
  'timeoutMs',
]);

const ALLOWED_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'combobox',
  'checkbox',
  'form',
  'heading',
  'status',
]);

const UNSAFE_TEXT = [
  /<script/i,
  /javascript:/i,
  /eval\s*\(/i,
  /on\w+\s*=/i,
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /credential/i,
  /postgresql:\/\//i,
];

export type DemoControlOption = {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
};

export type DemoControlLabel = {
  textContent?: string | null;
};

export type DemoControlElement = {
  tagName: string;
  getAttribute: (name: string) => string | null;
  click: () => void;
  focus: () => void;
  disabled?: boolean;
  checked?: boolean;
  textContent?: string | null;
  options?: ArrayLike<DemoControlOption> | DemoControlOption[];
  showPicker?: () => void;
  labels?: ArrayLike<DemoControlLabel> | DemoControlLabel[];
  dispatchEvent?: (event: unknown) => boolean;
  requestSubmit?: () => void;
  /** Read-only selected index (native selects). Never assigned by the adapter. */
  selectedIndex?: number;
};

export type DemoWebDocument = {
  querySelectorAll: (
    selector: string,
  ) => ArrayLike<DemoControlElement> | DemoControlElement[];
  activeElement?: DemoControlElement | null;
  getElementById?: (id: string) => DemoControlLabel | null;
  getBodyText?: () => string | null;
  /**
   * Browser editing command (insert-text). Replaces the current selection
   * with text through the native user-edit path. Return true only when the
   * edit actually occurred; never assign control values directly.
   */
  execEdit?: (text: string) => boolean;
  /**
   * Browser editing command (select-all). Selects the focused editable text
   * so a following insert replaces it. Return true only when the selection
   * actually occurred.
   */
  selectAll?: () => boolean;
  /**
   * Computed style reader for class-driven visibility. Return the computed
   * display/visibility, or null when unavailable (checks are skipped then).
   */
  getComputedStyle?: (element: DemoControlElement) => {
    display?: string;
    visibility?: string;
  } | null;
};

export type DemoReadinessExpectation = {
  path?: string;
  text?: string;
  role?: string;
  name?: string;
  testId?: string;
};

export type DemoWebEnvironment = {
  getDocument?: () => DemoWebDocument | null | undefined;
  getPath?: () => string;
  /**
   * Monotonic/testable clock (ms) for bounded default readiness deadlines.
   * Production defaults to performance.now() with a Date.now fallback.
   */
  now?: () => number;
  waitForExpectation?: (
    expectation: DemoReadinessExpectation,
    timeoutMs: number,
  ) => Promise<boolean>;
  openPicker?: (element: DemoControlElement) => void;
  /**
   * Injected user-level fill. Performs the edit through the user path and
   * returns true only when the edit occurred; false/undefined/throw fails
   * the step closed with DEMO_STEP_INTERACTION_UNAVAILABLE.
   */
  fillText?: (element: DemoControlElement, text: string) => boolean;
  /**
   * Injected user-level option choice. Returns true only when the option
   * became selected; false/undefined/throw fails the step closed with
   * DEMO_STEP_INTERACTION_UNAVAILABLE.
   */
  chooseOption?: (element: DemoControlElement, value: string) => boolean;
  dispatchSubmit?: (element: DemoControlElement) => void;
};

export type DemoWebTarget = {
  role?: string;
  name?: string;
  testId?: string;
  path?: string;
  value?: string;
  text?: string;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasUnsafeText(value: string): boolean {
  // ponytail: single shared unsafe scan reused from manifest boundary.
  return UNSAFE_TEXT.some((pattern) => pattern.test(value));
}

function toSafeShortText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) return null;
  if (hasUnsafeText(trimmed)) return null;
  return trimmed;
}

function toSafeFillText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.length > 200) return null;
  if (value && hasUnsafeText(value)) return null;
  return value;
}

function parseTarget(detail: unknown): DemoWebTarget | null {
  if (typeof detail !== 'string' || !detail.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(detail);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_TARGET_KEYS.has(key)) return null;
  }
  const target: DemoWebTarget = {};
  if (parsed.role !== undefined) {
    if (typeof parsed.role !== 'string') return null;
    const role = parsed.role.trim();
    if (!ALLOWED_ROLES.has(role)) return null;
    target.role = role;
  }
  const name =
    parsed.name !== undefined
      ? toSafeShortText(parsed.name)
      : parsed.label !== undefined
        ? toSafeShortText(parsed.label)
        : undefined;
  if (parsed.name !== undefined || parsed.label !== undefined) {
    if (name === null || name === undefined) return null;
    target.name = name;
  }
  if (parsed.testId !== undefined) {
    if (
      typeof parsed.testId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(parsed.testId.trim())
    ) {
      return null;
    }
    target.testId = parsed.testId.trim();
  }
  if (parsed.path !== undefined) {
    if (
      typeof parsed.path !== 'string' ||
      !/^\/[a-zA-Z0-9/_-]{0,119}$/.test(parsed.path.trim())
    ) {
      return null;
    }
    target.path = parsed.path.trim();
  }
  const optionValue = parsed.value !== undefined ? parsed.value : parsed.option;
  if (optionValue !== undefined) {
    const safe = toSafeFillText(optionValue);
    if (safe === null) return null;
    target.value = safe;
  }
  if (parsed.text !== undefined) {
    const safe = toSafeShortText(parsed.text);
    if (safe === null) return null;
    target.text = safe;
  }
  if (parsed.timeoutMs !== undefined) {
    if (
      typeof parsed.timeoutMs !== 'number' ||
      !Number.isFinite(parsed.timeoutMs)
    ) {
      return null;
    }
    target.timeoutMs = clampTimeout(parsed.timeoutMs);
  }
  return target;
}

function clampTimeout(value: number): number {
  return Math.min(Math.max(Math.floor(value), 1), WEB_ACTION_TIMEOUT_MAX_MS);
}

// Testable clock: monotonic performance.now() in production, injectable via
// env.now in tests. Date.now is only a fallback, never the sole clock.
function defaultNow(): number {
  try {
    if (
      typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
    ) {
      return performance.now();
    }
  } catch {
    return Date.now();
  }
  return Date.now();
}

// Read-only route reader for the default browser environment.
// window.location.pathname is only read for observable readiness, never
// assigned. Null when unavailable (SSR/deterministic tests); callers that
// declare a path expectation then fail closed.
function defaultPath(): string | null {
  try {
    if (
      typeof window !== 'undefined' &&
      window.location &&
      typeof window.location.pathname === 'string'
    ) {
      return window.location.pathname;
    }
  } catch {
    return null;
  }
  return null;
}

function defaultDocument(): DemoWebDocument | null {
  if (typeof document === 'undefined') return null;
  const real = document as unknown as {
    querySelectorAll: (
      selector: string,
    ) => ArrayLike<DemoControlElement> | DemoControlElement[];
    activeElement?: DemoControlElement | null;
    getElementById: (id: string) => DemoControlLabel | null;
    body?: { textContent?: string | null } | null;
    execCommand?: (command: string, showUI: boolean, value: string) => boolean;
  };
  return {
    querySelectorAll: (selector) => real.querySelectorAll(selector),
    get activeElement() {
      try {
        return real.activeElement ?? null;
      } catch {
        return null;
      }
    },
    getElementById: (id) => {
      try {
        return real.getElementById(id);
      } catch {
        return null;
      }
    },
    getBodyText: () => {
      try {
        return real.body?.textContent ?? null;
      } catch {
        return null;
      }
    },
    execEdit: (text) => {
      try {
        return real.execCommand
          ? real.execCommand('insertText', false, text)
          : false;
      } catch {
        return false;
      }
    },
    selectAll: () => {
      try {
        return real.execCommand
          ? real.execCommand('selectAll', false, '')
          : false;
      } catch {
        return false;
      }
    },
    getComputedStyle: (element) => {
      try {
        if (
          typeof window !== 'undefined' &&
          typeof window.getComputedStyle === 'function'
        ) {
          const computed = window.getComputedStyle(
            element as unknown as Element,
          );
          return {
            display: computed.display,
            visibility: computed.visibility,
          };
        }
      } catch {
        return null;
      }
      return null;
    },
  };
}

function candidatesOf(doc: DemoWebDocument): DemoControlElement[] {
  try {
    const found = doc.querySelectorAll(
      'button,a,input,select,textarea,form,label,[role]',
    );
    return Array.from(found as ArrayLike<DemoControlElement>);
  } catch {
    return [];
  }
}

function labelledByNames(
  element: DemoControlElement,
  doc: DemoWebDocument,
): string[] {
  let ids: string | null = null;
  try {
    ids = element.getAttribute('aria-labelledby');
  } catch {
    return [];
  }
  if (!ids || !ids.trim()) return [];
  if (!doc.getElementById) return [];
  const names: string[] = [];
  for (const id of ids.trim().split(/\s+/)) {
    try {
      const text = doc.getElementById(id)?.textContent?.trim();
      if (text) names.push(text);
    } catch {
      continue;
    }
  }
  return names;
}

function associatedLabelNames(element: DemoControlElement): string[] {
  try {
    if (element.labels) {
      return Array.from(element.labels as ArrayLike<DemoControlLabel>)
        .map((label) => label.textContent?.trim() ?? '')
        .filter((text) => text.length > 0);
    }
  } catch {
    return [];
  }
  return [];
}

function accessibleNameOf(
  element: DemoControlElement,
  doc: DemoWebDocument,
): string | null {
  try {
    const labelled = element.getAttribute('aria-label');
    if (labelled && labelled.trim()) return labelled.trim();
  } catch {
    return null;
  }
  const referenced = labelledByNames(element, doc);
  if (referenced.length > 0) return referenced.join(' ');
  const associated = associatedLabelNames(element);
  if (associated.length > 0) return associated.join(' ');
  try {
    const text = (element.textContent ?? '').trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

function roleMatches(element: DemoControlElement, role: string): boolean {
  const tag = element.tagName.toUpperCase();
  const explicit = (() => {
    try {
      return element.getAttribute('role');
    } catch {
      return null;
    }
  })();
  if (explicit === role) return true;
  const type = (() => {
    try {
      return element.getAttribute('type');
    } catch {
      return null;
    }
  })();
  switch (role) {
    case 'button':
      return (
        tag === 'BUTTON' ||
        (tag === 'INPUT' && (type === 'button' || type === 'submit')) ||
        tag === 'A'
      );
    case 'link':
      return tag === 'A';
    case 'textbox':
      return (
        tag === 'TEXTAREA' ||
        (tag === 'INPUT' &&
          type !== 'password' &&
          type !== 'hidden' &&
          type !== 'checkbox' &&
          type !== 'submit' &&
          type !== 'button')
      );
    case 'combobox':
      return tag === 'SELECT';
    case 'checkbox':
      return tag === 'INPUT' && type === 'checkbox';
    case 'form':
      return tag === 'FORM';
    case 'heading':
      return (
        tag === 'H1' ||
        tag === 'H2' ||
        tag === 'H3' ||
        tag === 'H4' ||
        tag === 'H5' ||
        tag === 'H6'
      );
    case 'status':
      return tag === 'OUTPUT';
    default:
      return false;
  }
}

function isHidden(
  element: DemoControlElement,
  doc?: DemoWebDocument | null,
): boolean {
  try {
    if (element.getAttribute('hidden') !== null) return true;
    if (element.getAttribute('aria-hidden') === 'true') return true;
  } catch {
    return true;
  }
  try {
    const style = (
      element as unknown as {
        style?: { display?: string; visibility?: string };
      }
    ).style;
    if (style?.display === 'none' || style?.visibility === 'hidden') {
      return true;
    }
  } catch {
    return true;
  }
  // Class-driven visibility: computed style wins over the inline style
  // above. Skipped when the seam is absent (deterministic tests); a seam
  // failure fails closed.
  if (doc?.getComputedStyle) {
    try {
      const computed = doc.getComputedStyle(element);
      if (
        computed &&
        (computed.display === 'none' || computed.visibility === 'hidden')
      ) {
        return true;
      }
    } catch {
      return true;
    }
  }
  try {
    const connected = (element as unknown as { isConnected?: unknown })
      .isConnected;
    if (connected === false) return true;
  } catch {
    return true;
  }
  try {
    const measure = (
      element as unknown as {
        getBoundingClientRect?: () => { width?: number; height?: number };
      }
    ).getBoundingClientRect;
    if (typeof measure === 'function') {
      const box = measure.call(element);
      if (box && box.width === 0 && box.height === 0) return true;
    }
  } catch {
    return true;
  }
  return false;
}

function isDisabled(element: DemoControlElement): boolean {
  try {
    if (element.disabled === true) return true;
    if (element.getAttribute('disabled') !== null) return true;
    if (element.getAttribute('aria-disabled') === 'true') return true;
  } catch {
    return true;
  }
  return false;
}

function isPasswordInput(element: DemoControlElement): boolean {
  if (element.tagName.toUpperCase() !== 'INPUT') return false;
  try {
    return element.getAttribute('type') === 'password';
  } catch {
    return true;
  }
}

function matchesPasswordControl(
  doc: DemoWebDocument,
  target: DemoWebTarget,
): boolean {
  if (target.role !== undefined && target.role !== 'textbox') return false;
  const pool = candidatesOf(doc).filter((element) => {
    if (element.tagName.toUpperCase() !== 'INPUT') return false;
    try {
      return element.getAttribute('type') === 'password';
    } catch {
      return false;
    }
  });
  let matched = pool;
  if (target.testId) {
    matched = matched.filter((element) => {
      try {
        return element.getAttribute('data-testid') === target.testId;
      } catch {
        return false;
      }
    });
  } else if (target.name) {
    matched = matched.filter(
      (element) => accessibleNameOf(element, doc) === target.name,
    );
  }
  return matched.length > 0;
}

type TargetResolution =
  { ok: true; element: DemoControlElement } | { ok: false; reason: string };

function checkVisibleEnabled(
  element: DemoControlElement,
  doc: DemoWebDocument,
): TargetResolution {
  if (isHidden(element, doc)) {
    return { ok: false, reason: 'DEMO_STEP_TARGET_HIDDEN' };
  }
  if (isDisabled(element)) {
    return { ok: false, reason: 'DEMO_STEP_TARGET_DISABLED' };
  }
  return { ok: true, element };
}

function resolveTarget(
  doc: DemoWebDocument,
  target: DemoWebTarget,
): TargetResolution {
  const pool = candidatesOf(doc);
  let matched = pool;
  if (target.testId) {
    matched = matched.filter((element) => {
      try {
        return element.getAttribute('data-testid') === target.testId;
      } catch {
        return false;
      }
    });
  } else {
    if (target.role) {
      matched = matched.filter((element) =>
        roleMatches(element, target.role as string),
      );
    }
    if (target.name) {
      matched = matched.filter(
        (element) => accessibleNameOf(element, doc) === target.name,
      );
    }
  }
  if (matched.length === 0) {
    return { ok: false, reason: 'DEMO_STEP_TARGET_NOT_FOUND' };
  }
  if (matched.length > 1) {
    return { ok: false, reason: 'DEMO_STEP_TARGET_AMBIGUOUS' };
  }
  return checkVisibleEnabled(matched[0] as DemoControlElement, doc);
}

function resolveAnchor(
  doc: DemoWebDocument,
  target: DemoWebTarget,
): TargetResolution {
  const pool = candidatesOf(doc).filter((element) => {
    try {
      if (element.tagName.toUpperCase() === 'A') return true;
      return element.getAttribute('role') === 'link';
    } catch {
      return false;
    }
  });
  let matched = pool;
  if (target.testId) {
    matched = matched.filter((element) => {
      try {
        return element.getAttribute('data-testid') === target.testId;
      } catch {
        return false;
      }
    });
  } else {
    if (target.role) {
      matched = matched.filter((element) =>
        roleMatches(element, target.role as string),
      );
    }
    if (target.name) {
      matched = matched.filter(
        (element) => accessibleNameOf(element, doc) === target.name,
      );
    }
  }
  if (target.path) {
    matched = matched.filter((element) => {
      try {
        const href = element.getAttribute('href');
        if (!href) return false;
        if (/^\s*javascript:/i.test(href)) return false;
        return href.trim() === (target.path as string);
      } catch {
        return false;
      }
    });
  }
  if (matched.length === 0) {
    return { ok: false, reason: 'DEMO_STEP_TARGET_NOT_FOUND' };
  }
  if (matched.length > 1) {
    return { ok: false, reason: 'DEMO_STEP_TARGET_AMBIGUOUS' };
  }
  return checkVisibleEnabled(matched[0] as DemoControlElement, doc);
}

function observeExpectation(
  doc: DemoWebDocument | null | undefined,
  getPath: (() => string | null) | undefined,
  expectation: DemoReadinessExpectation,
): boolean {
  if (expectation.path !== undefined) {
    if (!getPath) return false;
    try {
      if (getPath() !== expectation.path) return false;
    } catch {
      return false;
    }
  }
  const wantsControl =
    expectation.text !== undefined ||
    expectation.role !== undefined ||
    expectation.name !== undefined ||
    expectation.testId !== undefined;
  if (wantsControl) {
    if (!doc) return false;
    if (expectation.text !== undefined) {
      let haystack: string | null = null;
      try {
        if (doc.getBodyText) {
          haystack = doc.getBodyText();
        } else {
          haystack = candidatesOf(doc)
            .map((element) => {
              try {
                return element.textContent ?? '';
              } catch {
                return '';
              }
            })
            .join(' ');
        }
      } catch {
        return false;
      }
      if (!haystack || !haystack.includes(expectation.text)) return false;
    }
    if (
      expectation.role !== undefined ||
      expectation.name !== undefined ||
      expectation.testId !== undefined
    ) {
      const resolved = resolveTarget(doc, {
        role: expectation.role,
        name: expectation.name,
        testId: expectation.testId,
      });
      if (!resolved.ok) return false;
    }
  }
  return true;
}

function defaultWaitForExpectation(
  doc: DemoWebDocument | null | undefined,
  getPath: (() => string | null) | undefined,
  expectation: DemoReadinessExpectation,
  timeoutMs: number,
  now: () => number,
): Promise<boolean> {
  const bounded = clampTimeout(timeoutMs);
  const check = (): boolean => {
    try {
      return observeExpectation(doc, getPath, expectation);
    } catch {
      return false;
    }
  };
  if (check()) return Promise.resolve(true);
  if (typeof requestAnimationFrame === 'undefined') {
    return Promise.resolve(check());
  }
  const startedAt = now();
  return new Promise((resolve) => {
    const tick = (): void => {
      if (check()) {
        resolve(true);
        return;
      }
      let elapsed = bounded;
      try {
        elapsed = now() - startedAt;
      } catch {
        resolve(false);
        return;
      }
      if (elapsed >= bounded) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// Default browser edit path: focus, select-all so the insert replaces the
// current text, then insert-text plus input/change events. No direct value
// assignment; false means the operation could not occur and the caller must
// fail closed.
function defaultUserFill(
  doc: DemoWebDocument,
  element: DemoControlElement,
  text: string,
): boolean {
  try {
    element.focus();
  } catch {
    return false;
  }
  try {
    if (!doc.selectAll || doc.selectAll() !== true) return false;
    if (!doc.execEdit || doc.execEdit(text) !== true) return false;
  } catch {
    return false;
  }
  try {
    if (
      typeof element.dispatchEvent === 'function' &&
      typeof Event !== 'undefined'
    ) {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } catch {
    return true;
  }
  return true;
}

function listOptions(element: DemoControlElement): DemoControlOption[] {
  try {
    if (!element.options) return [];
    return Array.from(element.options as ArrayLike<DemoControlOption>);
  } catch {
    return [];
  }
}

// Read-only selected-option probe. Reads selectedIndex/selected flags only;
// never assigns selection state.
function selectedOptionOf(
  element: DemoControlElement,
): DemoControlOption | null {
  try {
    const options = listOptions(element);
    if (options.length === 0) return null;
    const rawIndex = (element as unknown as { selectedIndex?: unknown })
      .selectedIndex;
    if (typeof rawIndex === 'number' && Number.isInteger(rawIndex)) {
      const current = options[rawIndex];
      if (current) return current;
    }
    return (
      options.find(
        (entry) =>
          (entry as unknown as { selected?: unknown }).selected === true,
      ) ?? null
    );
  } catch {
    return null;
  }
}

// Read-only current-index probe. Reads selectedIndex/selected flags only;
// null when the current position cannot be observed.
function selectedIndexOf(element: DemoControlElement): number | null {
  try {
    const options = listOptions(element);
    const rawIndex = (element as unknown as { selectedIndex?: unknown })
      .selectedIndex;
    if (
      typeof rawIndex === 'number' &&
      Number.isInteger(rawIndex) &&
      rawIndex >= 0 &&
      rawIndex < options.length
    ) {
      return rawIndex;
    }
    const flagged = options.findIndex(
      (entry) => (entry as unknown as { selected?: unknown }).selected === true,
    );
    return flagged >= 0 ? flagged : null;
  } catch {
    return null;
  }
}

// Default native keyboard/selection path for choose-option: focus (already
// established at open), compute the target index and the observed current
// index, dispatch the required ArrowDown/ArrowUp presses (native navigation
// skips disabled options, so they are not counted) plus input/change, then
// read the selected result to confirm. Never assigns value/selected/checked;
// false (unreachable target, unobservable position, unconfirmable selection)
// fails the step closed.
function defaultChooseOption(
  doc: DemoWebDocument,
  element: DemoControlElement,
  value: string,
): boolean {
  try {
    element.focus();
  } catch {
    return false;
  }
  if (!isFocused(doc, element)) return false;
  const options = listOptions(element);
  const targetIndex = options.findIndex(
    (entry) => entry.value === value || entry.label === value,
  );
  if (targetIndex < 0) return false;
  if (options[targetIndex]?.disabled) return false;
  const currentIndex = selectedIndexOf(element);
  if (currentIndex === null) return false;
  const presses: string[] = [];
  if (targetIndex !== currentIndex) {
    const step = targetIndex > currentIndex ? 1 : -1;
    const key = targetIndex > currentIndex ? 'ArrowDown' : 'ArrowUp';
    let position = currentIndex;
    while (position !== targetIndex) {
      position += step;
      const stepping = options[position];
      if (!stepping) return false;
      if (!stepping.disabled) presses.push(key);
    }
  }
  try {
    const dispatch = element.dispatchEvent;
    if (typeof dispatch !== 'function') return false;
    if (typeof KeyboardEvent === 'undefined' || typeof Event === 'undefined') {
      return false;
    }
    for (const key of presses) {
      dispatch.call(
        element,
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
      dispatch.call(
        element,
        new KeyboardEvent('keyup', { key, bubbles: true }),
      );
    }
    dispatch.call(element, new Event('input', { bubbles: true }));
    dispatch.call(element, new Event('change', { bubbles: true }));
  } catch {
    return false;
  }
  try {
    const selected = selectedOptionOf(element);
    return (
      selected !== null &&
      (selected.value === value || selected.label === value)
    );
  } catch {
    return false;
  }
}

function isFocused(doc: DemoWebDocument, element: DemoControlElement): boolean {
  try {
    return doc.activeElement === element;
  } catch {
    return false;
  }
}

function hasDeclaredExpectation(target: DemoWebTarget): boolean {
  return (
    target.path !== undefined ||
    target.text !== undefined ||
    target.role !== undefined ||
    target.name !== undefined ||
    target.testId !== undefined
  );
}

export function createWebActionExecutor(
  env: DemoWebEnvironment = {},
): DemoExecutor {
  let openedSelect: DemoControlElement | null = null;

  return (step) => {
    const target = parseTarget(step.detail);
    if (!target) {
      return { status: 'blocked', reason: 'DEMO_STEP_INVALID_DESCRIPTOR' };
    }
    const doc = env.getDocument ? env.getDocument() : defaultDocument();
    const now = env.now ?? defaultNow;
    const getPath = env.getPath ?? defaultPath;
    const waitForExpectation =
      env.waitForExpectation ??
      ((expectation: DemoReadinessExpectation, timeoutMs: number) =>
        defaultWaitForExpectation(doc, getPath, expectation, timeoutMs, now));
    const timeout = target.timeoutMs ?? 5000;
    const awaitDeclaredReadiness = (): Promise<
      | { status: 'settled'; reason: string }
      | { status: 'blocked'; reason: string }
    > =>
      waitForExpectation(
        { path: target.path, text: target.text },
        timeout,
      ).then((ready) =>
        ready
          ? { status: 'settled' as const, reason: 'DEMO_STEP_SETTLED' }
          : {
              status: 'blocked' as const,
              reason: 'DEMO_STEP_READINESS_TIMEOUT',
            },
      );
    const needsReadiness =
      target.path !== undefined || target.text !== undefined;

    switch (step.action.trim()) {
      case 'navigate': {
        if (!doc || !target.path) {
          return { status: 'blocked', reason: 'DEMO_STEP_INVALID_DESCRIPTOR' };
        }
        const resolved = resolveAnchor(doc, target);
        if (!resolved.ok) {
          return { status: 'blocked', reason: resolved.reason };
        }
        try {
          resolved.element.click();
        } catch {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        return awaitDeclaredReadiness();
      }
      case 'click': {
        if (!doc) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        const resolved = resolveTarget(doc, target);
        if (!resolved.ok) {
          return { status: 'blocked', reason: resolved.reason };
        }
        try {
          resolved.element.click();
        } catch {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        if (!needsReadiness) return 'settled';
        return awaitDeclaredReadiness();
      }
      case 'fill': {
        if (!doc) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        if (target.value === undefined) {
          return { status: 'blocked', reason: 'DEMO_STEP_INVALID_DESCRIPTOR' };
        }
        const resolved = resolveTarget(doc, target);
        if (!resolved.ok) {
          if (
            resolved.reason === 'DEMO_STEP_TARGET_NOT_FOUND' &&
            matchesPasswordControl(doc, target)
          ) {
            return { status: 'blocked', reason: 'DEMO_STEP_FORBIDDEN_CONTROL' };
          }
          return { status: 'blocked', reason: resolved.reason };
        }
        if (isPasswordInput(resolved.element)) {
          return { status: 'blocked', reason: 'DEMO_STEP_FORBIDDEN_CONTROL' };
        }
        if (env.fillText) {
          try {
            resolved.element.focus();
            if (env.fillText(resolved.element, target.value) !== true) {
              return {
                status: 'blocked',
                reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
              };
            }
          } catch {
            return {
              status: 'blocked',
              reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
            };
          }
        } else if (!defaultUserFill(doc, resolved.element, target.value)) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        if (!needsReadiness) return 'settled';
        return awaitDeclaredReadiness();
      }
      case 'open-select': {
        if (!doc) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        const resolved = resolveTarget(doc, {
          ...target,
          role: target.role ?? 'combobox',
        });
        if (!resolved.ok) {
          return { status: 'blocked', reason: resolved.reason };
        }
        if (resolved.element.tagName.toUpperCase() !== 'SELECT') {
          return { status: 'blocked', reason: 'DEMO_STEP_TARGET_NOT_FOUND' };
        }
        try {
          resolved.element.focus();
          if (env.openPicker) env.openPicker(resolved.element);
          else resolved.element.showPicker?.();
        } catch {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        // Focus is the observable open seam: env.openPicker (or the native
        // showPicker) may request the picker, but the select is recorded
        // only after document.activeElement confirms observable focus.
        if (!isFocused(doc, resolved.element)) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        openedSelect = resolved.element;
        return 'settled';
      }
      case 'choose-option': {
        if (!doc) {
          return { status: 'blocked', reason: 'SELECT_NOT_OPEN' };
        }
        if (target.value === undefined) {
          return { status: 'blocked', reason: 'DEMO_STEP_INVALID_DESCRIPTOR' };
        }
        if (!openedSelect || !isFocused(doc, openedSelect)) {
          return { status: 'blocked', reason: 'SELECT_NOT_OPEN' };
        }
        const resolved = resolveTarget(doc, {
          ...target,
          role: target.role ?? 'combobox',
        });
        if (!resolved.ok || resolved.element !== openedSelect) {
          return { status: 'blocked', reason: 'SELECT_NOT_OPEN' };
        }
        const options = listOptions(resolved.element);
        const option = options.find(
          (entry) =>
            entry.value === (target.value as string) ||
            entry.label === (target.value as string),
        );
        if (!option) {
          return { status: 'blocked', reason: 'DEMO_STEP_OPTION_NOT_FOUND' };
        }
        if (option.disabled) {
          return { status: 'blocked', reason: 'DEMO_STEP_OPTION_DISABLED' };
        }
        if (!env.chooseOption) {
          if (!defaultChooseOption(doc, resolved.element, option.value)) {
            return {
              status: 'blocked',
              reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
            };
          }
        } else {
          try {
            const confirmed = env.chooseOption(resolved.element, option.value);
            if (confirmed !== true) {
              return {
                status: 'blocked',
                reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
              };
            }
          } catch {
            return {
              status: 'blocked',
              reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
            };
          }
        }
        if (!needsReadiness) return 'settled';
        return awaitDeclaredReadiness();
      }
      case 'check': {
        if (!doc) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        const resolved = resolveTarget(doc, target);
        if (!resolved.ok) {
          return { status: 'blocked', reason: resolved.reason };
        }
        const desired =
          target.value === 'checked'
            ? true
            : target.value === 'unchecked'
              ? false
              : null;
        const current = resolved.element.checked === true;
        if (desired === null || desired !== current) {
          try {
            resolved.element.click();
          } catch {
            return {
              status: 'blocked',
              reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
            };
          }
        }
        // Confirm an explicitly requested state by reading checked back.
        // No assignment; a mismatch fails closed instead of claiming settled.
        if (desired !== null) {
          let confirmed = false;
          try {
            confirmed = resolved.element.checked === desired;
          } catch {
            return {
              status: 'blocked',
              reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
            };
          }
          if (!confirmed) {
            return {
              status: 'blocked',
              reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
            };
          }
        }
        if (!needsReadiness) return 'settled';
        return awaitDeclaredReadiness();
      }
      case 'submit': {
        if (!doc) {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        const resolved = resolveTarget(doc, target);
        if (!resolved.ok) {
          return { status: 'blocked', reason: resolved.reason };
        }
        try {
          if (env.dispatchSubmit) {
            env.dispatchSubmit(resolved.element);
          } else if (resolved.element.tagName.toUpperCase() === 'FORM') {
            if (typeof resolved.element.requestSubmit !== 'function') {
              return {
                status: 'blocked',
                reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
              };
            }
            resolved.element.requestSubmit();
          } else {
            resolved.element.click();
          }
        } catch {
          return {
            status: 'blocked',
            reason: 'DEMO_STEP_INTERACTION_UNAVAILABLE',
          };
        }
        if (!needsReadiness) return 'settled';
        return awaitDeclaredReadiness();
      }
      case 'wait-ready': {
        if (!hasDeclaredExpectation(target)) {
          return { status: 'blocked', reason: 'DEMO_STEP_INVALID_DESCRIPTOR' };
        }
        return waitForExpectation(
          {
            path: target.path,
            text: target.text,
            role: target.role,
            name: target.name,
            testId: target.testId,
          },
          timeout,
        ).then((ready) =>
          ready
            ? { status: 'settled', reason: 'DEMO_STEP_SETTLED' }
            : { status: 'blocked', reason: 'DEMO_STEP_READINESS_TIMEOUT' },
        );
      }
      case 'assert-state': {
        if (!hasDeclaredExpectation(target)) {
          return { status: 'blocked', reason: 'DEMO_STEP_INVALID_DESCRIPTOR' };
        }
        return waitForExpectation(
          {
            path: target.path,
            text: target.text,
            role: target.role,
            name: target.name,
            testId: target.testId,
          },
          timeout,
        ).then((ready) =>
          ready
            ? { status: 'settled', reason: 'DEMO_STEP_SETTLED' }
            : { status: 'blocked', reason: 'DEMO_STEP_ASSERT_MISMATCH' },
        );
      }
      default:
        return 'blocked';
    }
  };
}
