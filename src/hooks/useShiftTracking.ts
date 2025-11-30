import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface Options {
  enabled: boolean;       // true only when punched in
  userId: string;
  employeeId: string;
  employeeName: string;
  photoUrl?: string;
}

export function useShiftTracking(options: Options) {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const { enabled, userId, employeeId, employeeName, photoUrl } = options;

    if (!enabled || !userId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          await setDoc(
            doc(db, "liveLocations", userId),
            {
              userId,
              employeeId,
              employeeName,
              photoUrl: photoUrl || "",
              lat,
              lng,
              active: true,
              lastUpdated: serverTimestamp(),
            },
            { merge: true }
          );
        },
        (err) => {
          console.log("Location error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Send once immediately
    updateLocation();

    // 🔥 Repeat every 10 minutes
    intervalRef.current = window.setInterval(updateLocation, 10 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    options.enabled,
    options.userId,
    options.employeeId,
    options.employeeName,
    options.photoUrl,
  ]);
}
