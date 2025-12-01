// src/hooks/useOpenStreetMap.ts
import { useEffect, useRef, useCallback, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type UseOpenStreetMapOptions = {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
};

export const useOpenStreetMap = (options?: UseOpenStreetMapOptions) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty", // OpenFreeMap
      center: options?.center || [77.5946, 12.9716], // Bengaluru
      zoom: options?.zoom ?? 11,
      pitch: options?.pitch ?? 60, // tilt = fake 3D look
      bearing: options?.bearing ?? -20,
    } as maplibregl.MapOptions);

    mapInstanceRef.current = map;

    // zoom / rotate UI
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      setMapLoaded(true);

      // Try adding 3D buildings (if style supports OpenMapTiles)
      try {
        const style = map.getStyle();
        const layers = style.layers || [];

        const labelLayer = layers.find(
          (l: any) => l.type === "symbol" && l.layout && l.layout["text-field"]
        );
        const labelLayerId = labelLayer?.id;

        map.addLayer(
          {
            id: "3d-buildings",
            type: "fill-extrusion",
            source: "openmaptiles",
            "source-layer": "building",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#cccccc",
              "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                ["get", "height"],
                20,
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                ["get", "min_height"],
                0,
              ],
              "fill-extrusion-opacity": 0.9,
            },
          } as any,
          labelLayerId
        );
      } catch (err) {
        console.warn("3D buildings could not be added:", err);
      }
    });

    return () => {
      setMapLoaded(false);
      map.remove();
    };
  }, [options?.center, options?.zoom, options?.pitch, options?.bearing]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  const addMarker = useCallback((lat: number, lng: number, element: HTMLElement) => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const marker = new maplibregl.Marker({ element })
      .setLngLat([lng, lat])
      .addTo(mapInstanceRef.current);

    markersRef.current.push(marker);
  }, [mapLoaded]);

  const addAvatarMarker = useCallback((
    lat: number,
    lng: number,
    imageUrl: string,
    size = 48
  ) => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const el = document.createElement("div");
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.borderRadius = "50%";
    el.style.overflow = "hidden";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    el.style.cursor = "pointer";

    const img = document.createElement("img");
    img.src = imageUrl || "/default-avatar.png";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.onerror = () => {
      img.src = "/default-avatar.png";
    };

    el.appendChild(img);
    addMarker(lat, lng, el);
  }, [mapLoaded, addMarker]);

  return {
    mapRef,
    map: mapInstanceRef,
    addMarker,
    addAvatarMarker,
    clearMarkers,
    mapLoaded,
  };
};
