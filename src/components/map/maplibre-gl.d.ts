// Khai báo tối thiểu để typecheck khi package chưa cài xong.
declare module 'maplibre-gl' {
  export class Map {
    constructor(options: Record<string, unknown>);
    addControl(control: unknown): void;
    on(event: string, handler: () => void): void;
    addSource(id: string, source: Record<string, unknown>): void;
    getSource(id: string): unknown;
    addLayer(layer: Record<string, unknown>): void;
    remove(): void;
  }
  export class Marker {
    setLngLat(position: [number, number]): Marker;
    addTo(map: Map): Marker;
  }
  export class NavigationControl {
    constructor();
  }
  const maplibregl: {
    Map: typeof Map;
    Marker: typeof Marker;
    NavigationControl: typeof NavigationControl;
  };
  export default maplibregl;
}
