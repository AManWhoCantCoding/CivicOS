# Evidence kiểm tra — 05-mobile-readonly-client

## Lần chạy 1 — 2026-09-26T00:56:21.167Z (scope=full)

- HEAD: 17258fc | file chưa commit: 7 | Tree: 2bb05818
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 20.5s |
| typecheck | `npm run typecheck` | FAIL | 6.8s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run1-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
mobile/src/api/__tests__/forces.test.ts(6,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/map.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/map.test.ts(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(13,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/relatedInfo.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/relatedInfo.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(13,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(14,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/session.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/session.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(8,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(9,5): error TS2304: Cannot find name 'expect'.
mobile/src/auth/LoginScreen.tsx(2,64): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/components/__tests__/states.test.tsx(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/states.test.tsx(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/states.test.tsx(10,29): error TS7006: Parameter 'state' implicitly has an 'any' type.
mobile/src/components/__tests__/states.test.tsx(10,36): error TS7006: Parameter 'label' implicitly has an 'any' type.
mobile/src/components/__tests__/states.test.tsx(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(6,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(9,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(10,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/States.tsx(2,39): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/config.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(13,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(14,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(19,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(19,96): error TS7006: Parameter 'buildTimeBaseUrl' implicitly has an 'any' type.
mobile/src/config.test.ts(20,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.ts(1,31): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/__tests__/deepLinks.test.ts(1,29): error TS2307: Cannot find module '../navigation/deepLinks' or its corresponding type declarations.
mobile/src/features/__tests__/deepLinks.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/deepLinks.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/deepLinks.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/deepLinks.test.ts(9,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/navigation-readonly.test.tsx(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/navigation-readonly.test.tsx(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/navigation-readonly.test.tsx(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/navigation-readonly.test.tsx(5,32): error TS2304: Cannot find name 'expect'.
mobile/src/features/alarm/AlarmScreen.tsx(2,39): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/dispatch/DispatchScreen.tsx(2,39): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/map/MapScreen.tsx(2,69): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/map/MapScreen.tsx(3,97): error TS2307: Cannot find module '@maplibre/maplibre-react-native' or its corresponding type declarations.
mobile/src/features/map/MapScreen.tsx(43,155): error TS7006: Parameter 'result' implicitly has an 'any' type.
mobile/src/features/map/MapScreen.tsx(47,556): error TS7006: Parameter 'event' implicitly has an 'any' type.
mobile/src/features/related-info/RelatedInfoDetail.tsx(2,53): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/related-info/RelatedInfoScreen.tsx(2,71): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/settings/SettingsScreen.tsx(2,28): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/features/task/TaskScreen.tsx(2,39): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
mobile/src/navigation/AppNavigator.tsx(2,53): error TS2307: Cannot find module 'react-native' or its corresponding type declarations.
````

## Lần chạy 2 — 2026-09-26T01:02:27.441Z (scope=fast)

- HEAD: 17258fc | file chưa commit: 8 | Tree: 763699ed
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | FAIL | 14.3s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run2-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
mobile/src/api/__tests__/client.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/client.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/client.test.ts(5,11): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/client.test.ts(8,11): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/forces.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/forces.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/forces.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/forces.test.ts(6,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/map.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/map.test.ts(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(13,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/relatedInfo.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/relatedInfo.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(13,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(14,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/session.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/session.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(8,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(9,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/states.test.tsx(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/states.test.tsx(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/states.test.tsx(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(6,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(9,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(10,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(13,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(14,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(19,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(20,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/deepLinks.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/deepLinks.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/deepLinks.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/deepLinks.test.ts(9,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/navigation-readonly.test.tsx(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/navigation-readonly.test.tsx(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/navigation-readonly.test.tsx(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/navigation-readonly.test.tsx(5,32): error TS2304: Cannot find name 'expect'.
mobile/src/features/map/MapScreen.tsx(3,18): error TS2305: Module '"@maplibre/maplibre-react-native"' has no exported member 'CircleLayer'.
mobile/src/features/map/MapScreen.tsx(3,31): error TS2305: Module '"@maplibre/maplibre-react-native"' has no exported member 'FillLayer'.
mobile/src/features/map/MapScreen.tsx(3,78): error TS2305: Module '"@maplibre/maplibre-react-native"' has no exported member 'ShapeSource'.
mobile/src/features/map/MapScreen.tsx(47,196): error TS2322: Type '{ centerCoordinate: number[]; zoomLevel: number; }' is not assignable to type 'IntrinsicAttributes & CameraProps'.
  Property 'centerCoordinate' does not exist on type 'IntrinsicAttributes & CameraProps'.
src/app/api/evidence/route.ts(20,21): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(21,29): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(22,27): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(23,32): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(24,30): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(25,31): error TS2339: Property 'get' does not exist on type 'FormData'.
````

## Lần chạy 3 — 2026-09-26T01:14:03.998Z (scope=fast)

- HEAD: 17258fc | file chưa commit: 8 | Tree: 7e6378ff
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | FAIL | 14.0s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run3-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 typecheck
> tsc --noEmit

mobile/src/api/__tests__/client.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/client.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/client.test.ts(5,11): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/client.test.ts(8,11): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/forces.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/forces.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/forces.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/forces.test.ts(6,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/map.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/map.test.ts(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/map.test.ts(13,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/relatedInfo.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/relatedInfo.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(13,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/relatedInfo.test.ts(14,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/session.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/api/__tests__/session.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(8,5): error TS2304: Cannot find name 'expect'.
mobile/src/api/__tests__/session.test.ts(9,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/states.test.tsx(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/states.test.tsx(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/states.test.tsx(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(6,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(9,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/components/__tests__/writeGuard.test.ts(10,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(11,5): error TS2304: Cannot find name 'expect'.
mobile/src/components/__tests__/writeGuard.test.ts(12,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(13,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(14,5): error TS2304: Cannot find name 'expect'.
mobile/src/config.test.ts(19,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/config.test.ts(20,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/deepLinks.test.ts(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/deepLinks.test.ts(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/deepLinks.test.ts(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/deepLinks.test.ts(9,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/navigation-readonly.test.tsx(3,1): error TS2582: Cannot find name 'describe'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/navigation-readonly.test.tsx(4,3): error TS2582: Cannot find name 'it'. Do you need to install type definitions for a test runner? Try `npm i --save-dev @types/jest` or `npm i --save-dev @types/mocha`.
mobile/src/features/__tests__/navigation-readonly.test.tsx(5,5): error TS2304: Cannot find name 'expect'.
mobile/src/features/__tests__/navigation-readonly.test.tsx(5,32): error TS2304: Cannot find name 'expect'.
src/app/api/evidence/route.ts(20,21): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(21,29): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(22,27): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(23,32): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(24,30): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(25,31): error TS2339: Property 'get' does not exist on type 'FormData'.
````

## Lần chạy 4 — 2026-09-26T01:18:46.988Z (scope=fast)

- HEAD: 17258fc | file chưa commit: 8 | Tree: f6e31ab8
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | FAIL | 13.6s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run4-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 typecheck
> tsc --noEmit

mobile/src/api/__tests__/client.test.ts(7,39): error TS2345: Argument of type '{ status: number; }' is not assignable to parameter of type 'ApiError'.
  Type '{ status: number; }' is missing the following properties from type 'ApiError': code, body, name, message
mobile/src/api/__tests__/client.test.ts(10,39): error TS2345: Argument of type '{ status: number; }' is not assignable to parameter of type 'ApiError'.
  Type '{ status: number; }' is missing the following properties from type 'ApiError': code, body, name, message
src/app/api/evidence/route.ts(20,21): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(21,29): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(22,27): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(23,32): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(24,30): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(25,31): error TS2339: Property 'get' does not exist on type 'FormData'.
````

## Lần chạy 5 — 2026-09-26T01:22:39.215Z (scope=fast)

- HEAD: 17258fc | file chưa commit: 8 | Tree: 2221ab90
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | FAIL | 14.2s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run5-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 typecheck
> tsc --noEmit

src/app/api/evidence/route.ts(20,21): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(21,29): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(22,27): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(23,32): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(24,30): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(25,31): error TS2339: Property 'get' does not exist on type 'FormData'.
src/components/incidents/IntakeReportForm.tsx(41,47): error TS2345: Argument of type 'import("D:/Project/CivicOS/mobile/node_modules/undici-types/formdata").FormDataEntryValue | null' is not assignable to parameter of type 'FormDataEntryValue | null'.
  Type 'File' is not assignable to type 'FormDataEntryValue | null'.
    Property 'webkitRelativePath' is missing in type 'import("buffer").File' but required in type 'File'.
src/components/incidents/IntakeReportForm.tsx(42,48): error TS2345: Argument of type 'import("D:/Project/CivicOS/mobile/node_modules/undici-types/formdata").FormDataEntryValue | null' is not assignable to parameter of type 'FormDataEntryValue | null'.
  Type 'File' is not assignable to type 'FormDataEntryValue | null'.
    Property 'webkitRelativePath' is missing in type 'import("buffer").File' but required in type 'File'.
````

## Lần chạy 6 — 2026-09-26T01:26:14.158Z (scope=fast)

- HEAD: 17258fc | file chưa commit: 8 | Tree: ae5fc214
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | FAIL | 14.2s |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: typecheck

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run6-typecheck.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 typecheck
> tsc --noEmit

src/app/api/evidence/route.ts(20,21): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(21,29): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(22,27): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(23,32): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(24,30): error TS2339: Property 'get' does not exist on type 'FormData'.
src/app/api/evidence/route.ts(25,31): error TS2339: Property 'get' does not exist on type 'FormData'.
````

## Lần chạy 7 — 2026-09-26T11:09:19.120Z (only=mobile:typecheck)

- HEAD: edf994d | file chưa commit: 46 | Tree: eb3a4e28
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 3.0s |

## Lần chạy 8 — 2026-09-26T12:22:42.395Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 55 | Tree: 4964c55b
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 5.1s |
| lint | `npm run lint` | FAIL | 18.9s |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: lint

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run8-lint.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

D:\Project\CivicOS\mobile\src\features\map\MapScreen.tsx:130:10
  128 |
  129 |   useEffect(() => {
> 130 |     void load();
      |          ^^^^ Avoid calling setState() directly within an effect
  131 |     if (Platform.OS === 'android') {
  132 |       void PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then(
  133 |         (result) =>  react-hooks/set-state-in-effect
  139:6   warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoDetail.tsx
  23:26  error    Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoDetail.tsx:23:26
  21 |     }
  22 |   };
> 23 |   useEffect(() => { void load(); }, [item.entityType, item.id]);
     |                          ^^^^ Avoid calling setState() directly within an effect
  24 |   return <SafeAreaView><View style={{ padding: 16, gap: 12 }}><Pressable onPress={onBack} style={{ minHeight: 44 }}><Text>‹ Quay lại</Text></Pressable>{state === 'loading' && <StateMessage state="loading" />}{state === 'empty' && !detail && <StateMessage state="empty" />}{state === 'error' && <StateMessage state="error" retry={() => void load()} />}{state === 'forbidden' && <StateMessage state="forbidden" />}{state === 'offline' && <StateMessage state="offline" retry={() => void load()} />}{state === 'masked' && <StateMessage state="masked" />}{detail && <><Text>{detail.title}</Text><Text>{detail.status}</Text><MaskedValue value={detail.address} masked={detail.masked} /><Text>{detail.updatedAt}</Text>{(detail.geometry || detail.lat !== undefined) && <Pressable onPress={() => onOpenMap?.(detail)} style={{ minHeight: 44, padding: 8 }}><Text>Mở trên bản đồ</Text></Pressable>}{detail.geometry && <Text>Polygon/geometry từ response server</Text>}{detail.lat !== undefined && <Text>Vị trí: {detail.lat}, {detail.lng}</Text>}</>}</View></SafeAreaView>;
  25 | }
  26 |  react-hooks/set-state-in-effect
  23:37  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\related-info\RelatedInfoScreen.tsx
  38:108  warning  React Hook useEffect has a missing dependency: 'load'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

D:\Project\CivicOS\mobile\src\features\task\TaskScreen.tsx
  14:26  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

D:\Project\CivicOS\mobile\src\features\task\TaskScreen.tsx:14:26
  12 |   const load = async () => { try { setState('loading'); const response = await listTasks(); setItems(response.data); setState(response.data.length ? response.data.some(item => !item.assignmentSummary) ? 'masked' : 'ready' : 'empty'); } catch (reason: unknown) { setState(stateFor(reason)); } };
  13 |   const select = async (item: ForceItem) => { setDetailTarget(item); setDetailState('loading'); setSelected(null); try { setSelected(await getTask(item.id)); setDetailState(null); } catch (reason: unknown) { setDetailState(stateFor(reason)); } };
> 14 |   useEffect(() => { void load(); }, []);
     |                          ^^^^ Avoid calling setState() directly within an effect
  15 |   if (state !== 'ready' && state !== 'masked' && !detailState) return <View style={{ padding: 16 }}>{state === 'offline' && <OfflineBanner />}<StateMessage state={state} retry={() => void load()} /></View>;
  16 |   return <View style={{ padding: 16 }}>{detailState === 'loading' && <StateMessage state="loading" />}{detailState === 'error' && <StateMessage state="error" retry={() => detailTarget && void select(detailTarget)} />}{detailState === 'forbidden' && <StateMessage state="forbidden" />}{detailState === 'offline' && <><OfflineBanner /><StateMessage state="offline" retry={() => detailTarget && void select(detailTarget)} /></>}{detailState === 'masked' && <StateMessage state="masked" />}{selected ? <View><Pressable onPress={() => setSelected(null)} style={{ minHeight: 44 }}><Text>‹ Quay lại</Text></Pressable><Text>{selected.title}</Text><Text>{selected.status} · {selected.createdAt}</Text>{selected.assignmentSummary ? <MaskedValue value={selected.assignmentSummary.task} /> : <StateMessage state="masked" />}<Pressable onPress={() => { const link = deepLinkFor(selected); if (link) onNavigate?.(link); }} style={{ minHeight: 44, padding: 8 }}><Text>Mở bản đồ/RelatedInfo</Text></Pressable></View> : <>{state === 'masked' && <StateMessage state="masked" />}{items.map(item => <Pressable key={item.id} onPress={() => void select(item)} style={{ minHeight: 44, padding: 8 }}><Text>{item.title}</Text><Text>{item.status} · {item.dispatchId ?? 'Không có dispatch'}</Text></Pressable>)}</>}</View>;
  17 | }  react-hooks/set-state-in-effect

D:\Project\CivicOS\mobile\src\test-globals.d.ts
  1:1  error  Do not use a triple slash reference for ../node_modules/@types/jest/index.d.ts, use `import` style instead              @typescript-eslint/triple-slash-reference
  2:1  error  Do not use a triple slash reference for ../node_modules/@types/node/web-globals/fetch.d.ts, use `import` style instead  @typescript-eslint/triple-slash-reference

D:\Project\CivicOS\src\modules\incidents\commands.ts
  1830:9  warning  'resource' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 16 problems (11 errors, 5 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
````

## Lần chạy 9 — 2026-09-26T12:32:35.683Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 60 | Tree: 0130b60d
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 4.8s |
| lint | `npm run lint` | PASS | 17.9s |
| format:check | `npm run format:check` | PASS | 23.4s |
| test | `npm run test` | FAIL | 37.8s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run9-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 ↓ tests/inspections/inspection-schedule.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/inspections/inspection-slices-4-6.postgres.test.ts (10 tests | 10 skipped)
 ↓ tests/inspections/inspection-stats.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/integration/parallel-wave-authorization.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/integration/parallel-wave-resilience.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/residents/resident-scope-regression.postgres.test.ts (5 tests | 5 skipped)
 ↓ tests/residents/resident-workflow.postgres.test.ts (8 tests | 8 skipped)
 ↓ tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts (11 tests | 11 skipped)

 Test Files  1 failed | 50 passed | 17 skipped (68)
      Tests  6 failed | 228 passed | 191 skipped (425)
   Start at  19:31:59
   Duration  36.40s (transform 1.58s, setup 0ms, collect 9.02s, tests 8.50s, environment 20ms, prepare 7.43s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:15:28

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:26:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:63:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯
````

## Lần chạy 10 — 2026-09-26T12:37:03.981Z (scope=mobile)

- HEAD: 55cfe22 | file chưa commit: 60 | Tree: 0130b60d
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 3.3s |
| mobile:test | `npm run mobile:test` | PASS | 11.7s |
| mobile:build | `npm run mobile:build` | PASS | 19.5s |

## Lần chạy 11 — 2026-09-26T13:03:38.854Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 61 | Tree: 9f2b4154
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 17.0s |
| format:check | `npm run format:check` | PASS | 19.8s |
| test | `npm run test` | FAIL | 32.1s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run11-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
      Tests  6 failed | 228 passed | 191 skipped (425)
   Start at  20:03:07
   Duration  30.87s (transform 1.23s, setup 0ms, collect 7.49s, tests 7.54s, environment 16ms, prepare 6.04s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 12 — 2026-09-26T13:08:56.068Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 61 | Tree: 9f2b4154
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 14.5s |
| format:check | `npm run format:check` | PASS | 19.6s |
| test | `npm run test` | PASS | 35.8s |
| test:e2e | `npm run test:e2e` | PASS | 165.3s |
| build | `npm run build` | PASS | 13.6s |

## Lần chạy 13 — 2026-09-26T13:12:48.785Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 62 | Tree: 0130b60d
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 2.4s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run13-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp19204' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 14 — 2026-09-26T13:20:29.625Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 9f2b4154
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.2s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 15.9s |
| format:check | `npm run format:check` | PASS | 19.4s |
| test | `npm run test` | PASS | 33.5s |
| test:e2e | `npm run test:e2e` | PASS | 147.0s |
| build | `npm run build` | PASS | 13.7s |

## Lần chạy 15 — 2026-09-26T13:28:38.469Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 62 | Tree: 0130b60d
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.5s |
| typecheck | `npm run typecheck` | PASS | 4.1s |
| lint | `npm run lint` | PASS | 18.3s |
| format:check | `npm run format:check` | PASS | 23.0s |
| test | `npm run test` | FAIL | 37.1s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run15-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
      Tests  6 failed | 228 passed | 191 skipped (425)
   Start at  20:28:02
   Duration  35.80s (transform 1.65s, setup 0ms, collect 8.99s, tests 7.70s, environment 18ms, prepare 7.55s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 16 — 2026-09-26T13:36:21.189Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 9f2b4154
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 16.9s |
| format:check | `npm run format:check` | PASS | 23.1s |
| test | `npm run test` | PASS | 37.8s |
| test:e2e | `npm run test:e2e` | PASS | 140.4s |
| build | `npm run build` | PASS | 12.4s |

## Lần chạy 17 — 2026-09-26T13:57:09.467Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 557cce94
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 2.5s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run17-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp11924' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 18 — 2026-09-26T14:00:39.898Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 557cce94
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 18.1s |
| format:check | `npm run format:check` | PASS | 23.1s |
| test | `npm run test` | FAIL | 14.2s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run18-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run


 RUN  v3.2.7 D:/Project/CivicOS

 ✓ tests/tooling/verify-tree-fingerprint.test.ts (5 tests) 3299ms
   ✓ verify tree fingerprint > keeps Tree stable when generated artifacts appear and change  1389ms
   ✓ verify tree fingerprint > changes Tree for untracked source outside build  871ms
   ✓ verify tree fingerprint > changes Tree for tracked config edit  811ms
 ❯ tests/mobile/readonly-http.contract.test.ts (6 tests | 6 failed) 60ms
   × mobile read-only HTTP contract > reads layers from the real backend contract 38ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract 4ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract 4ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract 3ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract 3ms
     → fetch failed
   × mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias 7ms
     → fetch failed
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 1306ms
   ✓ mobile contract matrix > checks layers, related-info, forces, boundaries, masking, and GET-only shape  977ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 490ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 479ms
 ✓ tests/mobile-readonly/related-info-detail.contract.test.ts (5 tests) 448ms
 ✓ tests/tooling/mobile-build-boundary.test.ts (5 tests) 375ms
   ✓ mobile build boundary > keeps the mobile verifier profile ordered and selectable  308ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (2 tests) 363ms
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 290ms
 ✓ tests/mobile-readonly/map-layers.contract.test.ts (1 test) 256ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (2 tests) 248ms
````

## Lần chạy 19 — 2026-09-26T15:03:56.032Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 21.4s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run19-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp20616' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 20 — 2026-09-26T15:08:29.767Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.2s |
| typecheck | `npm run typecheck` | PASS | 5.4s |
| lint | `npm run lint` | PASS | 19.6s |
| format:check | `npm run format:check` | PASS | 19.0s |
| test | `npm run test` | PASS | 36.8s |

## Lần chạy 21 — 2026-09-26T15:16:20.503Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 3.9s |
| lint | `npm run lint` | PASS | 15.1s |
| format:check | `npm run format:check` | PASS | 19.2s |
| test | `npm run test` | PASS | 32.8s |
| test:e2e | `npm run test:e2e` | PASS | 137.1s |
| build | `npm run build` | PASS | 14.8s |

## Lần chạy 22 — 2026-09-26T15:22:21.581Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 3.1s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 15.3s |
| format:check | `npm run format:check` | PASS | 19.3s |
| test | `npm run test` | FAIL | 21.5s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run22-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run


 RUN  v3.2.7 D:/Project/CivicOS

 ✓ tests/tooling/verify-tree-fingerprint.test.ts (5 tests) 3643ms
   ✓ verify tree fingerprint > keeps Tree stable when generated artifacts appear and change  1562ms
   ✓ verify tree fingerprint > changes Tree for untracked source outside build  974ms
   ✓ verify tree fingerprint > changes Tree for tracked config edit  873ms
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 1025ms
   ✓ mobile contract matrix > checks layers, related-info, forces, boundaries, masking, and GET-only shape  735ms
 ✓ tests/mobile/readonly-http.contract.test.ts (6 tests) 809ms
   ✓ mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias  379ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 473ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 439ms
 ✓ tests/mobile-readonly/related-info-detail.contract.test.ts (5 tests) 488ms
 ✓ tests/tooling/mobile-build-boundary.test.ts (5 tests) 358ms
   ✓ mobile build boundary > keeps the mobile verifier profile ordered and selectable  306ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (2 tests) 378ms
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 294ms
 ✓ tests/mobile-readonly/map-layers.contract.test.ts (1 test) 249ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (2 tests) 246ms
 ✓ tests/incidents/intake-report-lifecycle.test.ts (43 tests) 20ms
 ✓ tests/incidents/incident-ticket04.postgres.test.ts (17 tests | 11 skipped) 22ms
 ✓ tests/eventing/event-catalog.test.ts (4 tests) 15ms
 ✓ tests/integration/schema-and-migration.test.ts (7 tests | 2 skipped) 15ms
 ✓ tests/platform/shared-capabilities.test.ts (3 tests) 11ms
 ✓ tests/vehicles/vehicle-watch-contract.test.ts (6 tests) 11ms
 ✓ tests/identity/capability-policy.test.ts (11 tests) 12ms
 ✓ tests/inspections/inspection-slice-7-8.test.ts (5 tests) 11ms
 ✓ tests/inspections/inspection-contract.test.ts (6 tests) 11ms
 ✓ tests/identity/role-migration.test.ts (15 tests | 9 skipped) 9ms
 ✓ tests/inspections/inspection-ps007-regression.test.ts (6 tests) 8ms
 ✓ tests/identity/encryption.integration.test.ts (5 tests | 1 skipped) 10ms
 ✓ tests/integration/parallel-wave.integration.test.ts (30 tests | 23 skipped) 9ms
 ✓ tests/identity/sensitive-log-leak.test.ts (3 tests | 2 skipped) 7ms
 ✓ tests/vehicles/vehicle-watch-slices-8-9.test.ts (5 tests) 8ms
 ✓ tests/map/map-provider.test.ts (6 tests) 7ms
 ✓ tests/platform/evidence.integration.test.ts (3 tests | 1 skipped) 6ms
````

## Lần chạy 23 — 2026-09-26T15:26:59.616Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 4.0s |
| lint | `npm run lint` | PASS | 17.1s |
| format:check | `npm run format:check` | PASS | 19.2s |
| test | `npm run test` | FAIL | 14.3s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run23-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run


 RUN  v3.2.7 D:/Project/CivicOS

 ✓ tests/tooling/verify-tree-fingerprint.test.ts (5 tests) 3689ms
   ✓ verify tree fingerprint > keeps Tree stable when generated artifacts appear and change  1519ms
   ✓ verify tree fingerprint > changes Tree for untracked source outside build  966ms
   ✓ verify tree fingerprint > changes Tree for tracked config edit  962ms
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 1014ms
   ✓ mobile contract matrix > checks layers, related-info, forces, boundaries, masking, and GET-only shape  694ms
 ✓ tests/mobile/readonly-http.contract.test.ts (6 tests) 797ms
   ✓ mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias  378ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 485ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 445ms
 ✓ tests/mobile-readonly/related-info-detail.contract.test.ts (5 tests) 438ms
 ✓ tests/tooling/mobile-build-boundary.test.ts (5 tests) 352ms
   ✓ mobile build boundary > keeps the mobile verifier profile ordered and selectable  303ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (2 tests) 334ms
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 294ms
 ✓ tests/mobile-readonly/map-layers.contract.test.ts (1 test) 253ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (2 tests) 251ms
 ✓ tests/incidents/intake-report-lifecycle.test.ts (43 tests) 20ms
````

## Lần chạy 24 — 2026-09-26T15:30:18.760Z (only=test)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| test | `npm run test` | FAIL | 13.5s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run24-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 test
> vitest run


 RUN  v3.2.7 D:/Project/CivicOS

 ✓ tests/tooling/verify-tree-fingerprint.test.ts (5 tests) 3636ms
   ✓ verify tree fingerprint > keeps Tree stable when generated artifacts appear and change  1546ms
   ✓ verify tree fingerprint > changes Tree for untracked source outside build  970ms
   ✓ verify tree fingerprint > changes Tree for tracked config edit  893ms
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 946ms
   ✓ mobile contract matrix > checks layers, related-info, forces, boundaries, masking, and GET-only shape  689ms
 ✓ tests/mobile/readonly-http.contract.test.ts (6 tests) 757ms
   ✓ mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias  366ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 480ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 430ms
 ✓ tests/mobile-readonly/related-info-detail.contract.test.ts (5 tests) 434ms
 ✓ tests/tooling/mobile-build-boundary.test.ts (5 tests) 365ms
   ✓ mobile build boundary > keeps the mobile verifier profile ordered and selectable  314ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (2 tests) 331ms
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 285ms
 ✓ tests/mobile-readonly/map-layers.contract.test.ts (1 test) 251ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (2 tests) 239ms
````

## Lần chạy 25 — 2026-09-26T15:34:59.948Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 13.9s |
| format:check | `npm run format:check` | PASS | 19.1s |
| test | `npm run test` | PASS | 32.8s |

## Lần chạy 26 — 2026-09-26T15:40:46.250Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 64 | Tree: 1fcbf91c
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 3.9s |
| lint | `npm run lint` | PASS | 13.9s |
| format:check | `npm run format:check` | PASS | 19.0s |
| test | `npm run test` | PASS | 32.4s |
| test:e2e | `npm run test:e2e` | PASS | 134.8s |
| build | `npm run build` | PASS | 13.4s |

## Lần chạy 27 — 2026-09-26T15:50:50.246Z (scope=mobile)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 2014df0f
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 4.1s |
| mobile:test | `npm run mobile:test` | PASS | 25.7s |
| mobile:build | `npm run mobile:build` | FAIL | 46.7s |

### Lỗi: mobile:build

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run27-mobile_build.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 mobile:build
> npm --prefix mobile run build


> civicos-mobile@0.1.0 build
> cd android && gradlew.bat assembleDebug

Starting a Gradle Daemon, 1 busy Daemon could not be reused, use --status for details
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:shared:processResources NO-SOURCE
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:processResources
> Task :gradle-plugin:shared:compileKotlin
> Task :gradle-plugin:shared:compileJava NO-SOURCE
> Task :gradle-plugin:shared:classes UP-TO-DATE
> Task :gradle-plugin:shared:jar
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
10 actionable tasks: 10 executed

--- stderr ---

FAILURE: Build failed with an exception.

* Where:
Build file 'D:\Project\CivicOS\mobile\android\app\build.gradle' line: 1

* What went wrong:
An exception occurred applying plugin request [id: 'com.android.application']
> Failed to apply plugin 'com.android.internal.version-check'.
   > Minimum supported Gradle version is 8.13. Current version is 8.11.1.
     Try updating the 'distributionUrl' property in D:\Project\CivicOS\mobile\android\gradle\wrapper\gradle-wrapper.properties to 'gradle-8.13-bin.zip'.

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 45s
````

## Lần chạy 28 — 2026-09-26T16:03:42.399Z (only=mobile:build)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 3a69d54d
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:build | `npm run mobile:build` | PASS | 78.0s |

## Lần chạy 29 — 2026-09-26T16:07:11.085Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 62 | Tree: edafd143
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 3.0s |
| typecheck | `npm run typecheck` | PASS | 4.8s |
| lint | `npm run lint` | PASS | 19.0s |
| format:check | `npm run format:check` | PASS | 22.9s |
| test | `npm run test` | FAIL | 36.0s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run29-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
 ↓ tests/integration/parallel-wave-authorization.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/integration/parallel-wave-resilience.integration.test.ts (4 tests | 4 skipped)
 ↓ tests/inspections/inspection-schedule.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/inspections/inspection-slices-4-6.postgres.test.ts (10 tests | 10 skipped)
 ↓ tests/inspections/inspection-stats.postgres.test.ts (2 tests | 2 skipped)
 ↓ tests/residents/resident-scope-regression.postgres.test.ts (5 tests | 5 skipped)
 ↓ tests/residents/resident-workflow.postgres.test.ts (8 tests | 8 skipped)
 ↓ tests/vehicles/vehicle-watch-slices-4-7.postgres.test.ts (11 tests | 11 skipped)

 Test Files  1 failed | 50 passed | 17 skipped (68)
      Tests  6 failed | 228 passed | 191 skipped (425)
   Start at  23:06:36
   Duration  34.46s (transform 1.64s, setup 0ms, collect 8.42s, tests 8.26s, environment 18ms, prepare 7.08s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:15:28

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:26:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:63:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯
````

## Lần chạy 30 — 2026-09-26T16:10:01.789Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 62 | Tree: edafd143
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 4.3s |
| lint | `npm run lint` | PASS | 18.2s |
| format:check | `npm run format:check` | PASS | 22.3s |
| test | `npm run test` | FAIL | 26.8s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run30-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract 3ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract 2ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract 2ms
     → fetch failed
   × mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract 2ms
     → fetch failed
   × mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias 5ms
     → fetch failed
 ✓ tests/tooling/verify-tree-fingerprint.test.ts (5 tests) 3361ms
   ✓ verify tree fingerprint > keeps Tree stable when generated artifacts appear and change  1395ms
   ✓ verify tree fingerprint > changes Tree for untracked source outside build  898ms
   ✓ verify tree fingerprint > changes Tree for tracked config edit  837ms
 ✓ tests/mobile-readonly/contract-matrix.contract.test.ts (1 test) 1009ms
   ✓ mobile contract matrix > checks layers, related-info, forces, boundaries, masking, and GET-only shape  729ms
 ✓ tests/mobile-readonly/related-info-search.contract.test.ts (1 test) 519ms
 ✓ tests/mobile-readonly/forces-read.contract.test.ts (1 test) 479ms
 ✓ tests/mobile-readonly/related-info-detail.contract.test.ts (5 tests) 456ms
 ✓ tests/tooling/mobile-build-boundary.test.ts (5 tests) 348ms
 ✓ tests/mobile-readonly/tasks-by-dispatch.contract.test.ts (2 tests) 350ms
 ✓ tests/mobile-readonly/related-info-counts.contract.test.ts (1 test) 305ms
 ✓ tests/mobile-readonly/map-layers.contract.test.ts (1 test) 259ms
 ✓ tests/mobile-readonly/boundary.regression.test.ts (2 tests) 255ms
 ✓ tests/incidents/intake-report-lifecycle.test.ts (43 tests) 20ms
 ✓ tests/incidents/incident-ticket04.postgres.test.ts (17 tests | 11 skipped) 18ms
 ✓ tests/eventing/event-catalog.test.ts (4 tests) 12ms
 ✓ tests/integration/schema-and-migration.test.ts (7 tests | 2 skipped) 13ms
 ✓ tests/platform/shared-capabilities.test.ts (3 tests) 10ms
 ✓ tests/inspections/inspection-contract.test.ts (6 tests) 8ms
 ✓ tests/vehicles/vehicle-watch-contract.test.ts (6 tests) 9ms
 ✓ tests/identity/role-migration.test.ts (15 tests | 9 skipped) 8ms
 ✓ tests/inspections/inspection-slice-7-8.test.ts (5 tests) 11ms
 ✓ tests/map/map-provider.test.ts (6 tests) 7ms
 ✓ tests/identity/audit.integration.test.ts (3 tests | 2 skipped) 5ms
 ✓ tests/identity/capability-policy.test.ts (11 tests) 9ms
 ✓ tests/map/map-geometry.test.ts (5 tests) 7ms
 ✓ tests/identity/encryption.integration.test.ts (5 tests | 1 skipped) 8ms
 ✓ tests/integration/parallel-wave.integration.test.ts (30 tests | 23 skipped) 8ms
 ✓ tests/inspections/inspection-ps007-regression.test.ts (6 tests) 8ms
 ✓ tests/incidents/incident-authorization.unit.test.ts (7 tests) 7ms
 ✓ tests/identity/sensitive-log-leak.test.ts (3 tests | 2 skipped) 6ms
 ✓ tests/platform/geo.integration.test.ts (8 tests) 6ms
 ✓ tests/vehicles/vehicle-watch-slices-8-9.test.ts (5 tests) 7ms
 ✓ tests/map/map-smoke.test.ts (4 tests) 6ms
 ✓ tests/inspections/inspection-workflow.integration.test.ts (4 tests) 7ms
 ✓ tests/residents/resident-contracts.test.ts (11 tests) 8ms
 ✓ tests/platform/evidence.integration.test.ts (3 tests | 1 skipped) 7ms
 ✓ tests/map/map-polygon.test.ts (3 tests) 6ms
 ✓ tests/incidents/intake-report-notification.test.ts (1 test) 8ms
 ✓ tests/mobile-readonly/read-only-guard.regression.test.ts (1 test) 6ms
 ✓ tests/demo/demo-bootstrap.test.ts (8 tests | 4 skipped) 7ms
 ✓ tests/residents/resident-regression.test.ts (3 tests) 7ms
 ✓ tests/platform/offline-sync.integration.test.ts (5 tests | 3 skipped) 5ms
 ✓ tests/map/map-permission-offline.test.ts (5 tests) 7ms
 ✓ tests/platform/sla.integration.test.ts (6 tests | 2 skipped) 10ms
 ✓ tests/eventing/event-kernel.integration.test.ts (2 tests) 4ms
 ✓ tests/incidents/incident-workflow.integration.test.ts (2 tests) 5ms
 ✓ tests/identity/identity-display.integration.test.ts (5 tests | 3 skipped) 6ms
````

## Lần chạy 31 — 2026-09-26T16:13:05.053Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 36173835
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 3.0s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run31-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp18136' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 32 — 2026-09-26T16:16:47.610Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 36173835
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 3.4s |
| lint | `npm run lint` | PASS | 15.0s |
| format:check | `npm run format:check` | PASS | 19.0s |
| test | `npm run test` | FAIL | 31.6s |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run32-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
      Tests  6 failed | 228 passed | 191 skipped (425)
   Start at  23:16:17
   Duration  30.33s (transform 1.28s, setup 0ms, collect 7.40s, tests 7.39s, environment 16ms, prepare 5.86s)


--- stderr ---

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, incidents, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 33 — 2026-09-26T16:19:17.219Z (scope=fast)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 36173835
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.3s |
| lint | `npm run lint` | PASS | 16.5s |
| format:check | `npm run format:check` | PASS | 22.6s |
| test | `npm run test` | PASS | 37.2s |

## Lần chạy 34 — 2026-09-26T16:26:08.059Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 36173835
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.3s |
| lint | `npm run lint` | PASS | 16.3s |
| format:check | `npm run format:check` | PASS | 22.2s |
| test | `npm run test` | PASS | 36.8s |
| test:e2e | `npm run test:e2e` | PASS | 140.4s |
| build | `npm run build` | PASS | 12.0s |

## Lần chạy 35 — 2026-09-26T16:42:26.277Z (scope=full)

- HEAD: 55cfe22 | file chưa commit: 63 | Tree: 36173835
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.4s |
| typecheck | `npm run typecheck` | PASS | 3.4s |
| lint | `npm run lint` | PASS | 17.7s |
| format:check | `npm run format:check` | PASS | 21.6s |
| test | `npm run test` | PASS | 37.1s |
| test:e2e | `npm run test:e2e` | PASS | 145.9s |
| build | `npm run build` | PASS | 12.2s |

## Lần chạy 36 — 2026-09-26T21:27:34.043Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 66 | Tree: fe5c1195
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.7s |
| lint | `npm run lint` | PASS | 16.1s |
| format:check | `npm run format:check` | PASS | 22.3s |
| test | `npm run test` | FAIL | 84.0s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run36-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.brain/evidence/03-ps-e1005-intake-report/logs/e2e-read-model-trace.jsonl', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/plan.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05-mobile-readonly-client/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05a-mobile-build-boundary-fix/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05b-mobile-gradle-repository-mode-fix/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05d-verifier-tree-fingerprint-generated-artifacts/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/review.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.brain/evidence/05e-verifier-tree-fingerprint-build-checkpoint/tests.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05-mobile-readonly-client.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:15:28

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:26:30

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
Error: CIVICOS_API_BASE_URL is required for the HTTP contract test
 ❯ get tests/mobile/readonly-http.contract.test.ts:7:11
      5| async function get(path: string): Promise<Response> {
      6|   if (!baseUrl)
      7|     throw new Error(
       |           ^
      8|       'CIVICOS_API_BASE_URL is required for the HTTP contract test',
      9|     );
 ❯ tests/mobile/readonly-http.contract.test.ts:77:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯
````

## Lần chạy 37 — 2026-09-26T21:34:10.368Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 67 | Tree: fe5c1195
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 16.3s |
| format:check | `npm run format:check` | PASS | 22.5s |
| test | `npm run test` | FAIL | 71.0s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run37-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 38 — 2026-09-26T21:36:55.278Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 68 | Tree: 3ccd08e2
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | FAIL | 3.0s |
| typecheck | `npm run typecheck` | NOT_RUN | - |
| lint | `npm run lint` | NOT_RUN | - |
| format:check | `npm run format:check` | NOT_RUN | - |
| test | `npm run test` | NOT_RUN | - |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: prisma:generate

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run38-prisma_generate.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text

> civic-os@0.1.0 prisma:generate
> prisma generate

Prisma schema loaded from prisma\schema.prisma

--- stderr ---
Environment variables loaded from .env
Error: 
EPERM: operation not permitted, rename 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node.tmp9608' -> 'D:\Project\CivicOS\node_modules\.prisma\client\query_engine-windows.dll.node'
````

## Lần chạy 39 — 2026-09-26T21:45:10.639Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 68 | Tree: 3ccd08e2
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 16.1s |
| format:check | `npm run format:check` | PASS | 22.6s |
| test | `npm run test` | FAIL | 71.8s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run39-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 40 — 2026-09-26T21:48:14.488Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 68 | Tree: 3ccd08e2
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 16.1s |
| format:check | `npm run format:check` | PASS | 22.6s |
| test | `npm run test` | FAIL | 72.8s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run40-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 41 — 2026-09-26T21:50:58.290Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 68 | Tree: 3ccd08e2
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 3.7s |
| lint | `npm run lint` | PASS | 16.2s |
| format:check | `npm run format:check` | PASS | 22.7s |
| test | `npm run test` | FAIL | 71.5s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run41-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'next-env.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 42 — 2026-09-26T21:57:37.025Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 68 | Tree: fe5c1195
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 4.2s |
| lint | `npm run lint` | PASS | 16.4s |
| format:check | `npm run format:check` | PASS | 22.5s |
| test | `npm run test` | PASS | 76.4s |
| test:e2e | `npm run test:e2e` | PASS | 160.6s |
| build | `npm run build` | PASS | 11.9s |

## Lần chạy 43 — 2026-09-26T22:17:04.013Z (scope=mobile)

- HEAD: 1ec7739 | file chưa commit: 67 | Tree: fe5c1195
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| mobile:typecheck | `npm run mobile:typecheck` | PASS | 3.9s |
| mobile:test | `npm run mobile:test` | PASS | 25.9s |
| mobile:build | `npm run mobile:build` | PASS | 6.3s |

## Lần chạy 44 — 2026-09-26T22:22:42.366Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 67 | Tree: fe5c1195
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 3.9s |
| lint | `npm run lint` | PASS | 19.0s |
| format:check | `npm run format:check` | PASS | 23.8s |
| test | `npm run test` | FAIL | 77.2s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run44-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 45 — 2026-09-26T22:25:55.921Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 67 | Tree: fe5c1195
- Kết quả: **FAIL**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.1s |
| typecheck | `npm run typecheck` | PASS | 3.8s |
| lint | `npm run lint` | PASS | 16.2s |
| format:check | `npm run format:check` | PASS | 22.7s |
| test | `npm run test` | FAIL | 71.7s |
| test:e2e | `npm run test:e2e` | NOT_RUN | - |
| build | `npm run build` | NOT_RUN | - |

### Lỗi: test

Log đầy đủ: `.brain/evidence/05-mobile-readonly-client/logs/run45-test.log`. 60 dòng cuối (đã bỏ mã màu ANSI, đã che giá trị bí mật):

````text
warning: in the working copy of '.scratch/civicos-e1-clone-mvp/issues/05d-verifier-tree-fingerprint-generated-artifacts.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Lesson-learned.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/deepLinks.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/features/__tests__/navigation-readonly.test.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'mobile/src/test-globals.d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/tooling/mobile-build-boundary.test.ts', LF will be replaced by CRLF the next time Git touches it

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads layers from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo RESIDENT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo BUSINESS from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo HOTSPOT from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads RelatedInfo VIOLATION from the real backend contract
 FAIL  tests/mobile/readonly-http.contract.test.ts > mobile read-only HTTP contract > reads counts, alarms, dispatches, tasks, and the task alias
TypeError: fetch failed
{
  stack: 'AggregateError: \n' +
    '    at internalConnectMultiple (node:net:1194:18)\n' +
    '    at afterConnectMultiple (node:net:1784:7)',
  errors: [
    {
      stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '127.0.0.1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    },
    {
      stack: 'Error: connect ECONNREFUSED ::1:3000\n' +
        '    at createConnectionError (node:net:1747:14)\n' +
        '    at afterConnectMultiple (node:net:1777:16)',
      message: 'connect ECONNREFUSED ::1:3000',
      errno: -4078,
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '::1',
      port: 3000,
      constructor: 'Function<Error>',
      name: 'Error',
      toString: 'Function<toString>'
    }
  ],
  code: 'ECONNREFUSED',
  message: '',
  constructor: 'Function<AggregateError>',
  name: 'Caused by: AggregateError',
  toString: 'Function<toString>',
  stacks: []
}
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errors: [ { stack: 'Error: connect ECONNREFUSED 127.0.0.1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED 127.0.0.1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '127.0.0.1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' }, { stack: 'Error: connect ECONNREFUSED ::1:3000\n    at createConnectionError (node:net:1747:14)\n    at afterConnectMultiple (node:net:1777:16)', message: 'connect ECONNREFUSED ::1:3000', errno: -4078, code: 'ECONNREFUSED', syscall: 'connect', address: '::1', port: 3000, constructor: 'Function<Error>', name: 'Error', toString: 'Function<toString>' } ], code: 'ECONNREFUSED' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯
````

## Lần chạy 46 — 2026-09-26T22:31:23.297Z (scope=full)

- HEAD: 1ec7739 | file chưa commit: 67 | Tree: fe5c1195
- Kết quả: **PASS**

| Bước | Lệnh | Kết quả | Thời gian |
|---|---|---|---|
| prisma:generate | `npm run prisma:generate` | PASS | 2.0s |
| typecheck | `npm run typecheck` | PASS | 4.3s |
| lint | `npm run lint` | PASS | 16.6s |
| format:check | `npm run format:check` | PASS | 22.6s |
| test | `npm run test` | PASS | 75.4s |
| test:e2e | `npm run test:e2e` | PASS | 141.2s |
| build | `npm run build` | PASS | 12.3s |
