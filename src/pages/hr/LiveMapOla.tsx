import { useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOpenStreetMap } from "@/hooks/useOpenStreetMap";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LiveMapOla() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isHr = profile?.role === "hr";

  const { mapRef, addAvatarMarker, clearMarkers, mapLoaded } = useOpenStreetMap({
    center: [77.5946, 12.9716],
    zoom: 11,
  });

  useEffect(() => {
    if (!isHr || !mapLoaded) return;

    const q = query(
      collection(db, "liveLocations"),
      where("active", "==", true)
    );

    const unsub = onSnapshot(q, (snap) => {
      clearMarkers();

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.lat && d.lng) {
          addAvatarMarker(d.lat, d.lng, d.photoUrl || "/placeholder.svg", 54);
        }
      });
    });

    return () => unsub();
  }, [isHr, mapLoaded, clearMarkers, addAvatarMarker]);

  if (!isHr) {
    return (
      <div className="p-6 text-center">
        <p>You are not authorized.</p>
        <Button onClick={() => navigate("/home")} className="mt-4">
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-4 border-b border-border flex items-center gap-3 bg-background">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          ←
        </Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Live Employee Map
        </h1>
      </header>

      <div className="relative w-full h-[calc(100vh-64px)]">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
