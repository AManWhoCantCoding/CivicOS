import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { useSession } from '../auth/SessionContext';
import { LoginScreen } from '../auth/LoginScreen';
import { mobileBaseline } from '../components/States';
import { MapScreen } from '../features/map/MapScreen';
import { RelatedInfoScreen } from '../features/related-info/RelatedInfoScreen';
import type { RelatedInfoItem } from '../features/related-info/types';
import { AlarmScreen } from '../features/alarm/AlarmScreen';
import { DispatchScreen } from '../features/dispatch/DispatchScreen';
import { TaskScreen } from '../features/task/TaskScreen';
import { VehicleObservationDetail } from '../features/vehicle-observation/VehicleObservationDetail';
import { IncidentScreen } from '../features/incident/IncidentScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { LandScreen } from '../features/land/LandScreen';
import {
  deepLinkFor,
  type NavigationContext,
  type VehicleObservationOrigin,
} from './deepLinks';
import {
  nativeCommandIdentity,
  runNativeCommand,
  resolveNativeIntent,
  type NativeResult,
  type NativeSceneDescriptor,
} from '../demo/native-runner';

export const routes = [
  'Map',
  'RelatedInfo',
  'Alarms',
  'Dispatches',
  'Tasks',
  'Incident',
  'Land',
  'Settings',
] as const;

// Primary bottom-tab destinations. Everything else lives behind "Thêm".
const PRIMARY_TABS = ['Map', 'Alarms', 'Tasks'] as const;
const SECONDARY_ROUTES = [
  'RelatedInfo',
  'Dispatches',
  'Incident',
  'Land',
  'Settings',
] as const;

const ROUTE_LABEL: Record<(typeof routes)[number], string> = {
  Map: 'Bản đồ',
  RelatedInfo: 'Thông tin',
  Alarms: 'Cảnh báo',
  Dispatches: 'Điều phối',
  Tasks: 'Nhiệm vụ',
  Incident: 'Sự cố',
  Land: 'Đất đai',
  Settings: 'Cài đặt',
};

// Minimal text glyphs — no icon dependency installed.
const ROUTE_ICON: Record<(typeof routes)[number], string> = {
  Map: '◎',
  RelatedInfo: '☰',
  Alarms: '⚠',
  Dispatches: '⇄',
  Tasks: '☑',
  Incident: '⌁',
  Land: '⬡',
  Settings: '⚙',
};

export function AppNavigator({
  demoCommand,
  demoScene,
  onDemoResult,
}: {
  demoCommand?: unknown;
  demoScene?: NativeSceneDescriptor;
  onDemoResult?: (result: NativeResult) => void;
}) {
  const { session, signOut } = useSession();
  const [route, setRoute] = useState<
    (typeof routes)[number] | 'VehicleObservationDetail'
  >('Map');
  const [mapItem, setMapItem] = useState<RelatedInfoItem>();
  const [landParcelId, setLandParcelId] = useState<string | undefined>();
  const [landParcelCode, setLandParcelCode] = useState<string | undefined>();
  const [context, setContext] = useState<NavigationContext>({});
  const [vehicleOrigin, setVehicleOrigin] =
    useState<VehicleObservationOrigin>('Alarms');
  const [vehicleMapOrigin, setVehicleMapOrigin] =
    useState<VehicleObservationOrigin | null>(null);
  const [relatedReference, setRelatedReference] =
    useState<NavigationContext['relatedInfo']>();
  const [relatedQuery, setRelatedQuery] = useState<string>();
  const [relatedStatus, setRelatedStatus] = useState<string>();
  const [relatedEntityType, setRelatedEntityType] = useState<
    'RESIDENT' | 'BUSINESS' | 'HOTSPOT' | 'VIOLATION' | undefined
  >();
  const [showMore, setShowMore] = useState(false);
  const lastDemoCommand = useRef<string | undefined>(undefined);
  const navigate = useCallback(
    (link: ReturnType<typeof deepLinkFor>) => {
      if (!link) return;
      // Presentation-only: a deep-link navigation must surface its target
      // screen, so the More panel is dismissed when a link is accepted.
      setShowMore(false);
      setContext(link.params);
      setMapItem(undefined);
      if (link.route === 'VehicleObservationDetail') {
        setVehicleOrigin(
          route === 'Dispatches' || route === 'Tasks' ? route : 'Alarms',
        );
        setRoute(link.route);
        return;
      }
      setVehicleMapOrigin(null);
      if (link.route === 'RelatedInfoDetail') {
        setRelatedReference(link.params.relatedInfo);
        setRoute('RelatedInfo');
        return;
      }
      setRoute(link.route);
    },
    [route],
  );
  const openMap = (
    item?: RelatedInfoItem,
    nextContext: NavigationContext = {},
  ) => {
    setMapItem(item);
    setLandParcelId(undefined);
    setVehicleMapOrigin(null);
    setContext({
      ...nextContext,
      resourceId: nextContext.resourceId ?? item?.id,
      coordinates:
        nextContext.coordinates ??
        (item?.lat !== undefined && item.lng !== undefined
          ? { lat: item.lat, lng: item.lng }
          : undefined),
    });
    setRoute('Map');
  };
  const openVehicleMap = (vehicleContext: NavigationContext) => {
    openMap(undefined, vehicleContext);
    setVehicleMapOrigin(vehicleOrigin);
  };
  const openLandParcelOnMap = (parcelId: string) => {
    setMapItem(undefined);
    setLandParcelId(parcelId);
    setVehicleMapOrigin(null);
    // Drop stale generic map context so the land focus owns the camera.
    setContext({});
    setRoute('Map');
  };
  const openLandParcelDetail = (parcelCode: string) => {
    setLandParcelCode(parcelCode);
    setRoute('Land');
  };
  const openTab = (item: (typeof routes)[number]) => {
    // A manual tab entry starts a blank land form, not a stale auto-load.
    if (item === 'Land') setLandParcelCode(undefined);
    setVehicleMapOrigin(null);
    setShowMore(false);
    setRoute(item);
  };
  useEffect(() => {
    if (session.status !== 'authenticated' || demoCommand === undefined) return;
    const identity = nativeCommandIdentity(demoCommand);
    if (lastDemoCommand.current === identity) return;
    lastDemoCommand.current = identity;
    const result = runNativeCommand({
      command: demoCommand,
      authenticated: true,
      scene: demoScene,
    });
    onDemoResult?.(result);
    if (result.status !== 'ready') return;
    const intent = resolveNativeIntent(demoScene);
    queueMicrotask(() => {
      if (intent.type === 'tab') openTab(intent.route);
      if (intent.type === 'related-info') {
        setRelatedReference(undefined);
        setRelatedQuery(intent.query);
        setRelatedStatus(intent.status);
        setRelatedEntityType(intent.entityType);
        openTab('RelatedInfo');
      }
      if (intent.type === 'deep-link') navigate(intent.link);
    });
  }, [demoCommand, demoScene, navigate, onDemoResult, session.status]);
  if (session.status === 'loading')
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: mobileBaseline.space.s2,
            padding: mobileBaseline.space.s4,
          }}
        >
          <Text
            aria-hidden
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.section,
              color: mobileBaseline.color.info,
            }}
          >
            ◌
          </Text>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.body,
              lineHeight: mobileBaseline.size.bodyLine,
              color: mobileBaseline.color.textMuted,
            }}
          >
            Đang tải phiên…
          </Text>
        </View>
      </SafeAreaView>
    );
  if (session.status !== 'authenticated') return <LoginScreen />;
  const screen =
    route === 'Map' ? (
      <View style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}>
        {vehicleMapOrigin !== null ? (
          <View
            style={{
              padding: mobileBaseline.space.s2,
              borderBottomColor: mobileBaseline.color.border,
              borderBottomWidth: 1,
              backgroundColor: mobileBaseline.color.surface,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => {
                const origin = vehicleMapOrigin;
                setVehicleMapOrigin(null);
                setRoute(origin);
              }}
              style={{ minHeight: 44, minWidth: 44, padding: 8 }}
            >
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.accent,
                }}
              >
                ‹ Quay lại
              </Text>
            </Pressable>
          </View>
        ) : null}
        <MapScreen
          focusItem={mapItem}
          focusResourceId={context.resourceId}
          focusCoordinates={context.coordinates}
          focusParcelId={landParcelId}
          onOpenRelatedInfo={(item) => {
            setRelatedReference({ entityType: item.entityType, id: item.id });
            setRoute('RelatedInfo');
          }}
          onOpenLandDetail={openLandParcelDetail}
        />
      </View>
    ) : route === 'RelatedInfo' ? (
      <RelatedInfoScreen
        key={`${relatedReference?.entityType ?? 'list'}:${relatedReference?.id ?? ''}:${relatedQuery ?? ''}:${relatedStatus ?? ''}:${relatedEntityType ?? ''}`}
        initialReference={relatedReference}
        initialQuery={relatedQuery}
        initialStatus={relatedStatus}
        initialEntityType={relatedEntityType}
        onOpenMap={(item) => openMap(item, context)}
      />
    ) : route === 'Alarms' ? (
      <AlarmScreen onNavigate={navigate} />
    ) : route === 'Dispatches' ? (
      <DispatchScreen onNavigate={navigate} />
    ) : route === 'Tasks' ? (
      <TaskScreen onNavigate={navigate} />
    ) : route === 'VehicleObservationDetail' ? (
      <VehicleObservationDetail
        key={context.resourceId ?? 'vehicle'}
        observationId={context.resourceId ?? ''}
        assignmentSummary={context.assignmentSummary}
        onBack={() => setRoute(vehicleOrigin)}
        onOpenMap={openVehicleMap}
      />
    ) : route === 'Incident' ? (
      <IncidentScreen
        incidentId={context.incidentId}
        onOpenMap={() => openMap(undefined, context)}
      />
    ) : route === 'Land' ? (
      <LandScreen
        session={session}
        onOpenMap={openLandParcelOnMap}
        initialParcelCode={landParcelCode}
      />
    ) : (
      <SettingsScreen />
    );
  // Presentation-only derivation: the header and selected tab follow the
  // transient VehicleObservationDetail's origin surface, and show "Thêm" while
  // the More panel is open. No route or state semantics change.
  const presentationRoute: (typeof routes)[number] =
    route === 'VehicleObservationDetail' ? vehicleOrigin : route;
  const headerTitle = showMore ? 'Thêm' : ROUTE_LABEL[presentationRoute];
  const moreActive =
    showMore || (SECONDARY_ROUTES as readonly string[]).includes(presentationRoute);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}
    >
      <View
        accessibilityRole="header"
        style={{
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: mobileBaseline.space.s3,
          backgroundColor: mobileBaseline.color.surface,
          borderBottomColor: mobileBaseline.color.border,
          borderBottomWidth: 1,
        }}
      >
        <Text
          aria-hidden
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.body,
            fontWeight: '700',
            color: mobileBaseline.color.accent,
          }}
        >
          CivicOS
        </Text>
        <Text
          accessibilityLabel={`Màn hình ${headerTitle}`}
          style={{
            fontFamily: mobileBaseline.font.sans,
            fontSize: mobileBaseline.size.label,
            color: mobileBaseline.color.textMuted,
          }}
        >
          {headerTitle}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        {showMore ? (
          <View
            style={{
              flex: 1,
              padding: mobileBaseline.space.s3,
              gap: mobileBaseline.space.s2,
            }}
          >
            {/* Header already announces the surface; keep spacing for the list. */}
            {SECONDARY_ROUTES.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={ROUTE_LABEL[item]}
                accessibilityState={{ selected: route === item }}
                onPress={() => openTab(item)}
                style={{
                  minHeight: mobileBaseline.controlMin,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: mobileBaseline.space.s2,
                  paddingHorizontal: mobileBaseline.space.s3,
                  backgroundColor: mobileBaseline.color.surface,
                  borderColor: mobileBaseline.color.border,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.md,
                }}
              >
                <Text
                  aria-hidden
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.body,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  {ROUTE_ICON[item]}
                </Text>
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.body,
                    lineHeight: mobileBaseline.size.bodyLine,
                    fontWeight: route === item ? '600' : '400',
                    color: mobileBaseline.color.text,
                  }}
                >
                  {ROUTE_LABEL[item]}
                </Text>
              </Pressable>
            ))}
            <View
              style={{
                borderTopColor: mobileBaseline.color.border,
                borderTopWidth: 1,
                paddingTop: mobileBaseline.space.s2,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng xuất"
                onPress={() => void signOut()}
                style={{
                  minHeight: mobileBaseline.controlMin,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: mobileBaseline.space.s2,
                  paddingHorizontal: mobileBaseline.space.s3,
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.body,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  {'⏏'}
                </Text>
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.body,
                    lineHeight: mobileBaseline.size.bodyLine,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  Đăng xuất
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          screen
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: mobileBaseline.color.surface,
          borderTopColor: mobileBaseline.color.border,
          borderTopWidth: 1,
        }}
      >
        {PRIMARY_TABS.map((item) => {
          const active = !showMore && presentationRoute === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityLabel={ROUTE_LABEL[item]}
              accessibilityState={{ selected: active }}
              onPress={() => openTab(item)}
              style={{
                flex: 1,
                minHeight: 56,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                paddingVertical: mobileBaseline.space.s2,
                borderTopWidth: 2,
                borderTopColor: active
                  ? mobileBaseline.color.accent
                  : 'transparent',
              }}
            >
              <Text
                aria-hidden
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.section,
                  color: active
                    ? mobileBaseline.color.accent
                    : mobileBaseline.color.textMuted,
                }}
              >
                {ROUTE_ICON[item]}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.caption,
                  fontWeight: active ? '600' : '500',
                  color: active
                    ? mobileBaseline.color.accent
                    : mobileBaseline.color.textMuted,
                }}
              >
                {ROUTE_LABEL[item]}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Thêm"
          accessibilityState={{ selected: moreActive }}
          onPress={() => setShowMore((prev) => !prev)}
          style={{
            flex: 1,
            minHeight: 56,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            paddingVertical: mobileBaseline.space.s2,
            borderLeftColor: mobileBaseline.color.border,
            borderLeftWidth: 1,
            borderTopWidth: 2,
            borderTopColor: moreActive
              ? mobileBaseline.color.accent
              : 'transparent',
          }}
        >
          <Text
            aria-hidden
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.section,
              color: moreActive
                ? mobileBaseline.color.accent
                : mobileBaseline.color.textMuted,
            }}
          >
            {'⋯'}
          </Text>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.caption,
              fontWeight: moreActive ? '600' : '500',
              color: moreActive
                ? mobileBaseline.color.accent
                : mobileBaseline.color.textMuted,
            }}
          >
            Thêm
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
