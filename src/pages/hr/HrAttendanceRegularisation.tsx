import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

type RegDoc = {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  currentCheckIn?: string;
  currentCheckOut?: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
};

function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const [h, min] = timeStr.split(':').map((n) => Number(n));
  if ([y, m, d, h, min].some((v) => Number.isNaN(v))) return null;
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export default function HrAttendanceRegularisation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isHr = profile?.role === 'hr';

  const [requests, setRequests] = useState<RegDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendanceRegularisation'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      const data: RegDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<RegDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load regularisation requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHr) return;
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHr]);

  if (!isHr) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
        <Button className="mt-4" onClick={() => navigate('/home')}>
          Go Home
        </Button>
      </div>
    );
  }

  const handleDecision = async (
    reg: RegDoc,
    newStatus: 'approved' | 'rejected'
  ) => {
    const comment =
      newStatus === 'rejected'
        ? window.prompt('Optional: Add rejection comment (or leave blank):', '') || ''
        : window.prompt('Optional: Add approval note (or leave blank):', '') || '';

    try {
      setUpdatingId(reg.id);

      // update regularisation doc
      const regRef = doc(db, 'attendanceRegularisation', reg.id);
      await updateDoc(regRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        approverId: profile?.employeeId || profile?.uid || '',
        approverName: profile?.name || 'HR',
        approverComment: comment,
      });

      // if approved, also update attendance record
      if (newStatus === 'approved') {
        const attendanceId = `${reg.userId}_${reg.date}`;
        const attendRef = doc(db, 'attendance', attendanceId);
        const attendSnap = await getDoc(attendRef);

        const inDate = combineDateAndTime(reg.date, reg.requestedCheckIn);
        const outDate = combineDateAndTime(reg.date, reg.requestedCheckOut);

        let totalHours: number | undefined;
        if (inDate && outDate) {
          const diffMs = outDate.getTime() - inDate.getTime();
          if (diffMs > 0) {
            totalHours = +((diffMs / (1000 * 60 * 60))).toFixed(2);
          }
        }

        const baseData = {
          userId: reg.userId,
          employeeId: reg.employeeId,
          employeeName: reg.employeeName,
          date: reg.date,
          status: 'present',
          updatedAt: serverTimestamp(),
        };

        if (attendSnap.exists()) {
          await updateDoc(attendRef, {
            ...baseData,
            ...(inDate ? { checkInTime: Timestamp.fromDate(inDate) } : {}),
            ...(outDate ? { checkOutTime: Timestamp.fromDate(outDate) } : {}),
            ...(typeof totalHours === 'number' ? { totalHours } : {}),
          });
        } else {
          await setDoc(attendRef, {
            ...baseData,
            ...(inDate ? { checkInTime: Timestamp.fromDate(inDate) } : {}),
            ...(outDate ? { checkOutTime: Timestamp.fromDate(outDate) } : {}),
            ...(typeof totalHours === 'number' ? { totalHours } : {}),
            createdAt: serverTimestamp(),
          });
        }
      }

      // remove from pending list in UI
      setRequests((prev) => prev.filter((r) => r.id !== reg.id));
    } catch (err) {
      console.error(err);
      alert('Failed to update request.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* top bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              ←
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Attendance Regularisation (HR)
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRequests}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && (
          <p className="text-sm text-muted-foreground">Loading requests…</p>
        )}

        {!loading && requests.length === 0 && !error && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No pending regularisation requests.
          </div>
        )}

        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {r.employeeName}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({r.employeeId})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">Date: {r.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p>
                    Current: {r.currentCheckIn || '-'} – {r.currentCheckOut || '-'}
                  </p>
                  <p>
                    Requested:{' '}
                    <span className="font-medium text-foreground">
                      {r.requestedCheckIn} – {r.requestedCheckOut}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Reason</p>
                  <p className="whitespace-pre-line">{r.reason}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === r.id}
                  onClick={() => handleDecision(r, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={updatingId === r.id}
                  onClick={() => handleDecision(r, 'approved')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve & Update
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
