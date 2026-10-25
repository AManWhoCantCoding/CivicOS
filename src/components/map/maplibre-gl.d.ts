// Khai báo tối thiểu để typecheck khi package chưa cài xong.
declare module 'maplibre-gl' {
  export class Map {
    constructor(options: Record<string, unknown>);
    addControl(control: unknown): void;
    on(event: string, handler: () => void): void;
    on(
      event: 'click',
      layerId: string,
      handler: (event: MapLayerMouseEvent) => void,
    ): void;
    addSource(id: string, source: Record<string, unknown>): void;
    getSource(id: string): unknown;
    addLayer(layer: Record<string, unknown>): void;
    remove(): void;
  }
  export type MapLayerMouseEvent = {
    features?: Array<{ properties?: Record<string, unknown> }>;
    lngLat: { lng: number; lat: number };
  };
  export class Popup {
    setLngLat(position: [number, number]): Popup;
    setDOMContent(node: Node): Popup;
    addTo(map: Map): Popup;
  }
  export class Marker {
    setLngLat(position: [number, number]): Marker;
    addTo(map: Map): Marker;
    getElement(): HTMLElement;
    setPopup(popup: Popup): Marker;
  }
  export class NavigationControl {
    constructor();
  }
  const maplibregl: {
    Map: typeof Map;
    Marker: typeof Marker;
    Popup: typeof Popup;
    NavigationControl: typeof NavigationControl;
  };
  export default maplibregl;
}
