// src/pages/attendance/Punch.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Loader2, Camera } from 'lucide-react';
import { useShiftTracking } from '@/hooks/useShiftTracking';

type AttendanceDoc = {
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime?: any;
  checkOutTime?: any;
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
  checkInAddress?: string;
  checkOutAddress?: string;
  totalHours?: number;
  status?: string;
};

function formatTime(ts?: any) {
  if (!ts?.toDate) return '-';
  const d: Date = ts.toDate();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || '';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    if (!MAPTILER_KEY) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`
    );
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    return (
      feature.place_name ||
      feature.place_name_en ||
      feature.text_en ||
      feature.text ||
      `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    );
  } catch (err) {
    console.error('Reverse geocode error', err);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

export default function Punch() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState<AttendanceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // live clock
  const [liveTime, setLiveTime] = useState('');
  const [liveDate, setLiveDate] = useState('');

  // location + address (for UI)
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [address, setAddress] = useState<string>('Fetching location…');
  const [locationError, setLocationError] = useState<string | null>(null);

  // camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const attendanceId = `${user.uid}_${today}`;
  const attendanceRef = doc(db, 'attendance', attendanceId);

  // live clock effect
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setLiveDate(
        now.toLocaleDateString(undefined, {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // fetch today's attendance
  const fetchToday = async () => {
    setError(null);
    setLoading(true);
    try {
      const snap = await getDoc(attendanceRef);
      if (snap.exists()) {
        const data = snap.data() as AttendanceDoc;
        setAttendance(data);

        // Prefer punch-in location on UI
        if (data.checkInLat && data.checkInLng) {
          setCoords({ lat: data.checkInLat, lng: data.checkInLng });
          if (data.checkInAddress) {
            setAddress(data.checkInAddress);
          }
        }
      } else {
        setAttendance(null);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load today attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // camera preview
  useEffect(() => {
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API not supported in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.error('Camera error', err);
        setCameraError('Camera permission denied or not available.');
      }
    };

    startCamera();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // initial location (for pre-punch map preview)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location not available on this device.');
      setAddress('Location not available');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
      },
      (err) => {
        console.error(err);
        setLocationError('Location permission denied.');
        setAddress('Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const getLocationForPunch = async (): Promise<{ lat?: number; lng?: number }> => {
    if (coords.lat && coords.lng) return coords;

    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // single punch button logic + map + tracking integration
  const handlePunch = async () => {
    setError(null);

    const isPunchedIn = !!attendance?.checkInTime && !attendance?.checkOutTime;

    // Punch IN
    if (!attendance?.checkInTime) {
      try {
        setPunching(true);
        const loc = await getLocationForPunch();

        let punchAddress: string | undefined;
        if (loc.lat && loc.lng) {
          setCoords({ lat: loc.lat, lng: loc.lng });
          punchAddress = await reverseGeocode(loc.lat, loc.lng);
          setAddress(punchAddress);
        }

        await setDoc(
          attendanceRef,
          {
            userId: user.uid,
            employeeId: profile.employeeId,
            employeeName: profile.name,
            date: today,
            status: 'working',
            checkInTime: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...(loc.lat &&
              loc.lng && {
                checkInLat: loc.lat,
                checkInLng: loc.lng,
              }),
            ...(punchAddress && { checkInAddress: punchAddress }),
          },
          { merge: true }
        );

        await fetchToday();
      } catch (err: any) {
        console.error(err);
        setError('Failed to punch in. Please try again.');
      } finally {
        setPunching(false);
      }
      return;
    }

    // Punch OUT
    if (isPunchedIn) {
      try {
        setPunching(true);
        const loc = await getLocationForPunch();

        let totalHours: number | undefined;
        if (attendance.checkInTime?.toDate) {
          const inDate: Date = attendance.checkInTime.toDate();
          const now = new Date();
          const diffMs = now.getTime() - inDate.getTime();
          totalHours = +((diffMs / (1000 * 60 * 60))).toFixed(2);
        }

        let punchOutAddress: string | undefined;
        if (loc.lat && loc.lng) {
          punchOutAddress = await reverseGeocode(loc.lat, loc.lng);
        }

        await updateDoc(attendanceRef, {
          checkOutTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'present',
          ...(typeof totalHours === 'number' && { totalHours }),
          ...(loc.lat &&
            loc.lng && {
              checkOutLat: loc.lat,
              checkOutLng: loc.lng,
            }),
          ...(punchOutAddress && { checkOutAddress: punchOutAddress }),
        });

        // stop live tracking
        await updateDoc(doc(db, 'liveLocations', user.uid), {
          active: false,
          lastUpdated: serverTimestamp(),
        });

        await fetchToday();
      } catch (err: any) {
        console.error(err);
        setError('Failed to punch out. Please try again.');
      } finally {
        setPunching(false);
      }
      return;
    }

    // Already in & out
    if (attendance?.checkInTime && attendance?.checkOutTime) {
      setError('You have already completed punch in & out for today.');
    }
  };

  const statusLabel = (() => {
    if (!attendance?.checkInTime && !attendance?.checkOutTime) return 'You have not punched today';
    if (attendance.checkInTime && !attendance.checkOutTime) return 'You are currently PUNCHED IN';
    if (attendance.checkInTime && attendance.checkOutTime) return 'Punch completed for today';
    return '';
  })();

  const buttonLabel = (() => {
    if (!attendance?.checkInTime) return 'CLICK HERE TO PUNCH';
    if (attendance.checkInTime && !attendance.checkOutTime) return 'CLICK HERE TO PUNCH OUT';
    return 'PUNCH COMPLETED';
  })();

  const buttonDisabled =
    punching || (attendance?.checkInTime && attendance?.checkOutTime) || loading;

  // MapTiler static map URL – uses current coords (prefer punch location if set)
  const mapUrl =
    coords.lat &&
    coords.lng &&
    MAPTILER_KEY &&
    `https://api.maptiler.com/maps/streets-v2/static/${coords.lng},${coords.lat},16/600x300@2x.png?key=${MAPTILER_KEY}`;

  // 🔥 Start background tracking every 10 minutes while punched in
  const trackingEnabled = !!attendance?.checkInTime && !attendance?.checkOutTime;
  useShiftTracking({
    enabled: trackingEnabled,
    userId: user.uid,
    employeeId: profile.employeeId,
    employeeName: profile.name,
    photoUrl: (profile as any).photoUrl, // if you store it
  });

  return (
    <div className="min-h-screen bg-[#111116] text-white flex flex-col">
      {/* Top bar */}
      <header className="bg-[#111116] border-b border-zinc-800 sticky top-0 z-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-zinc-800"
          >
            ←
          </Button>
          <h1 className="text-lg font-semibold">Punch</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-8 flex flex-col items-center gap-6">
        {/* live time */}
        <div className="text-center space-y-1">
          <p className="text-3xl font-semibold tracking-widest">{liveTime}</p>
          <p className="text-sm text-zinc-400">{liveDate}</p>
        </div>

        {/* circular camera */}
        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-zinc-700 flex items-center justify-center bg-black relative">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center text-zinc-500 text-center px-4">
              <Camera className="w-10 h-10 mb-2" />
              <span className="text-xs">{cameraError}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* map preview (punch location placeholder) */}
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-black/40 overflow-hidden">
          <div className="h-40 w-full flex items-center justify-center text-xs text-zinc-500">
            {mapUrl ? (
              <img src={mapUrl} alt="Map preview" className="w-full h-full object-cover" />
            ) : (
              <span>Map preview unavailable</span>
            )}
          </div>
        </div>

        {/* address */}
        <div className="w-full max-w-md text-xs text-zinc-300 flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-0.5 text-amber-400" />
          <div>
            <p className="leading-snug">
              {/* Prefer stored punch-in address if any */}
              {attendance?.checkInAddress || address}
            </p>
            {locationError && (
              <p className="text-[11px] text-amber-500 mt-1">{locationError}</p>
            )}
          </div>
        </div>

        {/* status + error */}
        <p className="text-xs text-zinc-400 text-center max-w-md">{statusLabel}</p>
        {error && <p className="text-xs text-red-400 text-center max-w-md">{error}</p>}

        {/* big punch button */}
        <div className="w-full max-w-md mt-auto">
          <Button
            className="w-full py-6 rounded-full bg-orange-500 hover:bg-orange-600 text-sm font-semibold tracking-wide"
            disabled={buttonDisabled}
            onClick={handlePunch}
          >
            {punching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                PROCESSING…
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
