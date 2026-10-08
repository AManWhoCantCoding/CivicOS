import React, { useState } from 'react';
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

export function AppNavigator() {
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
  if (session.status === 'loading')
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}
      >
        <View style={{ padding: mobileBaseline.space.s4 }}>
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
  const navigate = (link: ReturnType<typeof deepLinkFor>) => {
    if (!link) return;
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
  };
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
    setRoute(item);
  };
  const screen =
    route === 'Map' ? (
      <View style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}>
        {vehicleMapOrigin !== null ? (
          <View style={{ padding: mobileBaseline.space.s2 }}>
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
        key={`${relatedReference?.entityType ?? 'list'}:${relatedReference?.id ?? ''}`}
        initialReference={relatedReference}
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
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: mobileBaseline.color.canvas }}
    >
      <View style={{ flex: 1 }}>{screen}</View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          backgroundColor: mobileBaseline.color.surface,
          borderTopColor: mobileBaseline.color.border,
          borderTopWidth: 1,
        }}
      >
        {routes.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            onPress={() => openTab(item)}
            style={{
              minHeight: mobileBaseline.controlMin,
              minWidth: mobileBaseline.controlMin,
              padding: mobileBaseline.space.s2,
            }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.text,
              }}
            >
              {item === 'Land' ? 'Đất đai' : item}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={{
            minHeight: mobileBaseline.controlMin,
            minWidth: mobileBaseline.controlMin,
            padding: mobileBaseline.space.s2,
          }}
        >
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.text,
            }}
          >
            Đăng xuất
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
