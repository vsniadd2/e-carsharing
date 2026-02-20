/* Yandex Maps JS API 2.1 */
declare global {
  interface Window {
    ymaps: {
      ready: (cb: () => void) => void
      Map: new (element: HTMLElement, state: { center: number[]; zoom: number; controls?: string[] }) => {
        geoObjects: { add: (obj: unknown) => void; removeAll: () => void }
        setCenter: (center: number[], zoom?: number) => void
        setZoom: (zoom: number) => void
        getZoom: () => number
        setBounds: (bounds: unknown, options?: { checkZoomRange?: boolean; zoomMargin?: number }) => void
        destroy: () => void
      }
      Placemark: new (coords: number[], properties: object, options: object) => {
        events: { add: (event: string, handler: () => void) => void }
      }
      util: {
        bounds: { fromPoints: (points: number[][]) => unknown }
      }
    }
  }
}

export {}
