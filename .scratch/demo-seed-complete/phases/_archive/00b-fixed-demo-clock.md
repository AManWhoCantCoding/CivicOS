# Archive 00b — Fixed demo clock

- Add explicit `Clock`, `systemClock`, fixed clock and `DEMO_NOW` parser/resolver.
- Invalid/missing timezone input returns `DEMO_NOW_INVALID` before mutation.
- Do not patch global `Date`; production defaults to system clock.
