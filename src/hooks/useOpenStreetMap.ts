// src/hooks/useOpenStreetMap.ts
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type UseOpenStreetMapOptions = {
  center?: [number, number];      // [lng, lat]
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  restrictToIndia?: boolean;
};

export const useOpenStreetMap = (options?: UseOpenStreetMapOptions) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // 👉 Default: South India / Karnataka-ish view
    const defaultCenter: [number, number] = [77.65, 12.9]; // near Bengaluru
    const defaultZoom = 7; // shows Karnataka + nearby

    const indiaBounds: maplibregl.LngLatBoundsLike = [
      [68.0, 6.0],   // SW corner (Gujarat / Indian Ocean)
      [98.0, 37.0],  // NE corner (NE India)
    ];

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty", // clean OSM style
      center: options?.center || defaultCenter,
      zoom: options?.zoom ?? defaultZoom,
      minZoom: options?.minZoom ?? 4,   // can't zoom out too far
      maxZoom: options?.maxZoom ?? 18,  // normal street level
      maxBounds: options?.restrictToIndia ? indiaBounds : undefined,
    } as maplibregl.MapOptions);

    mapInstanceRef.current = map;

    // Basic controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      map.remove();
    };
    // we only want to init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  };

  const addMarker = (lat: number, lng: number, element: HTMLElement) => {
    if (!mapInstanceRef.current) return;

    const marker = new maplibregl.Marker({ element })
      .setLngLat([lng, lat])
      .addTo(mapInstanceRef.current);

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
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
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
  };

  // Optional helper: fit map to all markers (if you want later)
  const fitToMarkers = () => {
    if (!mapInstanceRef.current || markersRef.current.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    markersRef.current.forEach((m) => {
      const lngLat = m.getLngLat();
      bounds.extend(lngLat);
    });

    mapInstanceRef.current.fitBounds(bounds, {
      padding: 80,
      maxZoom: 15,
      duration: 800,
    });
  };

  return {
    mapRef,
    map: mapInstanceRef,
    addMarker,
    addAvatarMarker,
    clearMarkers,
    fitToMarkers,
  };
};
