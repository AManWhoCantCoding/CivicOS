import React, { useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { useSession } from '../auth/SessionContext';
import { LoginScreen } from '../auth/LoginScreen';
import { MapScreen } from '../features/map/MapScreen';
import { RelatedInfoScreen } from '../features/related-info/RelatedInfoScreen';
import type { RelatedInfoItem } from '../features/related-info/types';
import { AlarmScreen } from '../features/alarm/AlarmScreen';
import { DispatchScreen } from '../features/dispatch/DispatchScreen';
import { TaskScreen } from '../features/task/TaskScreen';
import { IncidentScreen } from '../features/incident/IncidentScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { deepLinkFor, type NavigationContext } from './deepLinks';

export const routes = [
  'Map',
  'RelatedInfo',
  'Alarms',
  'Dispatches',
  'Tasks',
  'Incident',
  'Settings',
] as const;

export function AppNavigator() {
  const { session, signOut } = useSession();
  const [route, setRoute] = useState<(typeof routes)[number]>('Map');
  const [mapItem, setMapItem] = useState<RelatedInfoItem>();
  const [context, setContext] = useState<NavigationContext>({});
  const [relatedReference, setRelatedReference] =
    useState<NavigationContext['relatedInfo']>();
  if (session.status === 'loading') return <Text>Đang tải phiên…</Text>;
  if (session.status !== 'authenticated') return <LoginScreen />;
  const navigate = (link: ReturnType<typeof deepLinkFor>) => {
    if (!link) return;
    setContext(link.params);
    setMapItem(undefined);
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
  const screen =
    route === 'Map' ? (
      <MapScreen
        focusItem={mapItem}
        focusResourceId={context.resourceId}
        focusCoordinates={context.coordinates}
        onOpenRelatedInfo={(item) => {
          setRelatedReference({ entityType: item.entityType, id: item.id });
          setRoute('RelatedInfo');
        }}
      />
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
    ) : route === 'Incident' ? (
      <IncidentScreen
        incidentId={context.incidentId}
        onOpenMap={() => openMap(undefined, context)}
      />
    ) : (
      <SettingsScreen />
    );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{screen}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {routes.map((item) => (
          <Pressable
            key={item}
            onPress={() => setRoute(item)}
            style={{ minHeight: 44, padding: 8 }}
          >
            <Text>{item}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => void signOut()}
          style={{ minHeight: 44, padding: 8 }}
        >
          <Text>Đăng xuất</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
