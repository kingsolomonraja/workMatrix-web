import { useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOlaMap } from "@/hooks/useOlaMap";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LiveMapOla() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isHr = profile?.role === "hr";

  const { mapRef, addAvatarMarker, clearMarkers, map } = useOlaMap({
    center: [77.5946, 12.9716],
    zoom: 11,
  });

  useEffect(() => {
    if (!isHr) return;

    const q = query(
      collection(db, "liveLocations"),
      where("active", "==", true)
    );

    const unsub = onSnapshot(q, (snap) => {
      clearMarkers();

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.lat && d.lng) {
          addAvatarMarker(d.lat, d.lng, d.photoUrl || "/default-avatar.png", 54);
        }
      });
    });

    return () => unsub();
  }, [isHr]);

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
    <div className="min-h-screen bg-black">
      <header className="p-4 border-b border-zinc-700 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          ←
        </Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Live Employee Map (Ola)
        </h1>
      </header>

      <div ref={mapRef} className="w-full h-[calc(100vh-64px)]" />
    </div>
  );
}
