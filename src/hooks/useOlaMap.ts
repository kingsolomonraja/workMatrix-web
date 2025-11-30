import { useEffect, useRef } from "react";

// THIS HOOK PROVIDES:
// - mapRef → attach to <div>
// - mapObject → Ola map instance
// - addMarker(lat, lng, htmlElement)
// - addAvatarMarker(lat, lng, imageUrl, size)
// - clearMarkers()

export const useOlaMap = (options?: {
  center?: [number, number];
  zoom?: number;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const olaInstanceRef = useRef<any>(null);
  const mapObjRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let mounted = true;

    import("olamaps-web-sdk")
      .then(({ OlaMaps }) => {
        if (!mounted || !mapRef.current) return;

        const ola = new OlaMaps({
          apiKey: import.meta.env.VITE_OLA_API_KEY,
          mode: "3d",
          threedTileset:
            "https://api.olamaps.io/tiles/vector/v1/3dtiles/tileset.json",
        });

        const map = ola.init({
          container: mapRef.current,
          center: options?.center || [77.5946, 12.9716], // Default Bangalore
          zoom: options?.zoom || 11,
          style:
            "https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json",
          attributionControl: false,
        });

        olaInstanceRef.current = ola;
        mapObjRef.current = map;

        // Remove POIs, metro, rail, etc.
        map.on("style.load", () => {
          map.getStyle().layers.forEach((layer: any) => {
            const id = layer.id.toLowerCase();
            if (layer.type === "symbol" && layer.layout?.["text-field"]) {
              if (id.includes("poi") || id.includes("station")) {
                map.setLayoutProperty(layer.id, "visibility", "none");
              }
            }
            if (layer.type === "line") {
              if (
                id.includes("rail") ||
                id.includes("subway") ||
                id.includes("metro")
              ) {
                map.setLayoutProperty(layer.id, "visibility", "none");
              }
            }
          });
        });
      })
      .catch(console.error);

    return () => {
      mounted = false;
      if (mapObjRef.current) {
        mapObjRef.current.remove();
      }
    };
  }, []);

  // ---- MAP ACTION HELPERS ----

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  };

  const addMarker = (lat: number, lng: number, element: HTMLElement) => {
    if (!olaInstanceRef.current || !mapObjRef.current) return;

    const marker = olaInstanceRef.current.addMarker(mapObjRef.current, {
      lngLat: [lng, lat],
      element,
    });

    markersRef.current.push(marker);
  };

  const addAvatarMarker = (
    lat: number,
    lng: number,
    imageUrl: string,
    size = 48
  ) => {
    const el = document.createElement("div");
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "50%";
    el.style.overflow = "hidden";
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    el.appendChild(img);
    addMarker(lat, lng, el);
  };

  return {
    mapRef,
    map: mapObjRef,
    addMarker,
    addAvatarMarker,
    clearMarkers,
  };
};
