import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMarkerPopupContent,
  markerDetailUrl,
  createParcelPopupContent,
  parcelDetailUrl,
} from '../../src/components/map/marker-popup';

describe('map marker popup safety', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('creates safe detail URLs for supported marker IDs only', () => {
    expect(
      markerDetailUrl({ id: 'Incident:case / 1', aggregateType: 'Incident' }),
    ).toBe('/incidents/case%20%2F%201');
    expect(
      markerDetailUrl({
        id: 'Inspection:inspection-2',
        aggregateType: 'Inspection',
      }),
    ).toBe('/inspections/inspection-2');
    expect(parcelDetailUrl('parcel / 1')).toBe(
      '/land/parcels/parcel%20%2F%201',
    );
    expect(parcelDetailUrl('')).toBeNull();
    expect(
      markerDetailUrl({
        id: 'Inspection:inspect:1',
        aggregateType: 'Inspection',
      }),
    ).toBeNull();
    expect(
      markerDetailUrl({ id: 'Camera:1', aggregateType: 'Camera' }),
    ).toBeNull();
    expect(
      markerDetailUrl({ id: 'Incident:', aggregateType: 'Incident' }),
    ).toBeNull();
  });

  it('uses text nodes for the delivered title and status and includes the safe link', () => {
    class ElementStub {
      children: ElementStub[] = [];
      attributes = new Map<string, string>();
      set href(value: string) {
        this.attributes.set('href', value);
      }
      private text = '';
      set textContent(value: string) {
        this.text = value;
      }
      get textContent() {
        return (
          this.text + this.children.map((child) => child.textContent).join('')
        );
      }
      append(...children: ElementStub[]) {
        this.children.push(...children);
      }
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      }
      getAttribute(name: string) {
        return this.attributes.get(name) ?? null;
      }
      querySelector(tag: string): ElementStub | null {
        return (
          this.children.find((child) => child.tagName === tag) ??
          this.children
            .map((child) => child.querySelector(tag))
            .find(Boolean) ??
          null
        );
      }
      constructor(readonly tagName: string) {}
    }
    vi.stubGlobal('document', {
      createElement: (tag: string) => new ElementStub(tag),
    });
    const content = createMarkerPopupContent({
      id: 'Incident:123',
      aggregateType: 'Incident',
      title: '<img src=x onerror=alert(1)>',
      status: 'open',
    });
    expect(content.querySelector('img')).toBeNull();
    expect(content.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(content.textContent).toContain('open');
    expect(content.querySelector('a')?.getAttribute('href')).toBe(
      '/incidents/123',
    );
  });

  it('renders simulated parcel summary and detail link as safe text', () => {
    class ElementStub {
      children: ElementStub[] = [];
      attributes = new Map<string, string>();
      set href(value: string) {
        this.attributes.set('href', value);
      }
      private text = '';
      set textContent(value: string) {
        this.text = value;
      }
      get textContent() {
        return (
          this.text + this.children.map((child) => child.textContent).join('')
        );
      }
      append(...children: ElementStub[]) {
        this.children.push(...children);
      }
      getAttribute(name: string) {
        return this.attributes.get(name) ?? null;
      }
      querySelector(tag: string): ElementStub | null {
        return this.children.find((child) => child.tagName === tag) ?? null;
      }
      constructor(readonly tagName: string) {}
    }
    vi.stubGlobal('document', {
      createElement: (tag: string) => new ElementStub(tag),
    });
    const content = createParcelPopupContent({
      id: 'parcel / 1',
      parcelCode: '<script>',
      status: 'active',
    });
    expect(content.textContent).toContain('<script>');
    expect(content.textContent).toContain('Dữ liệu mô phỏng nội bộ');
    expect(content.querySelector('script')).toBeNull();
    expect(content.querySelector('a')?.getAttribute('href')).toBe(
      '/land/parcels/parcel%20%2F%201',
    );
  });
});
