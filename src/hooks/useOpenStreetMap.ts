import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export const useOpenStreetMap = (options?: {
  center?: [number, number];
  zoom?: number;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: options?.center || [77.5946, 12.9716],
      zoom: options?.zoom || 11,
    });

    mapInstanceRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      map.remove();
    };
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
  };

  return {
    mapRef,
    map: mapInstanceRef,
    addMarker,
    addAvatarMarker,
    clearMarkers,
  };
};
