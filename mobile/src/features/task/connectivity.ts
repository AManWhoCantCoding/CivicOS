import { DeviceEventEmitter, type EmitterSubscription } from 'react-native';

// Emitted by the existing Android-native "CivicOSApiConfig" module
// (mobile/android/app/src/main/java/com/civicosmobile/ApiConfigModule.kt),
// exactly once per genuine offline -> validated-online transition of the
// default network while the app is running. Keep the literal in sync with the
// Kotlin file. The event carries no payload: no network identifiers, payloads
// or user data cross the bridge.
export const RESTORED_ONLINE_EVENT = 'civicos:restored-online';

/**
 * Subscribes to the Android connectivity-restored event and returns its
 * unsubscribe function. Registering the listener while already online is a
 * no-op by design: the native side only emits real transitions, and the
 * startup/re-entry sync is owned by TaskScreen's session-change retry.
 */
export function addRestoredOnlineListener(listener: () => void): () => void {
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    RESTORED_ONLINE_EVENT,
    listener,
  );
  return () => subscription.remove();
}
