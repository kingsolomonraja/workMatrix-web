import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw } from 'lucide-react';

type AttendanceDoc = {
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime?: any;
  checkOutTime?: any;
  totalHours?: number;
};

type RegularisationDoc = {
  id: string;
  date: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  currentCheckIn?: string;
  currentCheckOut?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverName?: string;
  approverComment?: string;
  createdAt?: any;
};

function formatTime(ts?: any) {
  if (!ts?.toDate) return '-';
  const d: Date = ts.toDate();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const yesterdayAsDefault = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export default function AttendanceRegularisation() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(yesterdayAsDefault);
  const [attendanceForDate, setAttendanceForDate] = useState<AttendanceDoc | null>(
    null
  );

  const [requestedIn, setRequestedIn] = useState('');
  const [requestedOut, setRequestedOut] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [requests, setRequests] = useState<RegularisationDoc[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [reqError, setReqError] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const attendanceId = `${user.uid}_${date}`;

  // load attendance for selected date
  const fetchAttendanceForDate = async () => {
    setAttendanceForDate(null);
    try {
      const ref = doc(db, 'attendance', attendanceId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setAttendanceForDate(snap.data() as AttendanceDoc);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendanceForDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // load previous regularisation requests for this user
  const fetchRequests = async () => {
    setReqError(null);
    setLoadingRequests(true);
    try {
      const q = query(
        collection(db, 'attendanceRegularisation'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data: RegularisationDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<RegularisationDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setRequests(data);
    } catch (err) {
      console.error(err);
      setReqError('Failed to load your regularisation requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = (status: RegularisationDoc['status']) => {
    const base =
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium';
    switch (status) {
      case 'pending':
        return `${base} bg-amber-100 text-amber-800`;
      case 'approved':
        return `${base} bg-emerald-100 text-emerald-800`;
      case 'rejected':
        return `${base} bg-rose-100 text-rose-800`;
      default:
        return base;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!date || !requestedIn || !requestedOut || !reason.trim()) {
      setSubmitError('Please select date, requested times and enter reason.');
      return;
    }

    try {
      setSubmitting(true);

      const currentCheckIn = attendanceForDate?.checkInTime
        ? formatTime(attendanceForDate.checkInTime)
        : '';
      const currentCheckOut = attendanceForDate?.checkOutTime
        ? formatTime(attendanceForDate.checkOutTime)
        : '';

      await addDoc(collection(db, 'attendanceRegularisation'), {
        userId: user.uid,
        employeeId: profile.employeeId,
        employeeName: profile.name,
        date,
        currentCheckIn,
        currentCheckOut,
        requestedCheckIn: requestedIn,
        requestedCheckOut: requestedOut,
        reason: reason.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSubmitSuccess('Regularisation request submitted.');
      setReason('');
      // keep times/date so they can reuse

      await fetchRequests();
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              ←
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Attendance Regularisation
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRequests}
            disabled={loadingRequests}
          >
            <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Employee info */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-medium text-foreground">{profile.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Employee ID: <span className="font-mono text-foreground">{profile.employeeId}</span>
          </p>
        </div>

        {/* Request form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">New Regularisation Request</h2>
            {submitSuccess && (
              <span className="text-xs text-emerald-600">{submitSuccess}</span>
            )}
          </div>

          {/* date + current times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2 text-xs text-muted-foreground flex flex-col justify-center gap-1">
              <span>
                Current In:{' '}
                <span className="font-medium text-foreground">
                  {attendanceForDate?.checkInTime
                    ? formatTime(attendanceForDate.checkInTime)
                    : '-'}
                </span>
              </span>
              <span>
                Current Out:{' '}
                <span className="font-medium text-foreground">
                  {attendanceForDate?.checkOutTime
                    ? formatTime(attendanceForDate.checkOutTime)
                    : '-'}
                </span>
              </span>
            </div>
          </div>

          {/* requested times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Requested In Time</label>
              <input
                type="time"
                value={requestedIn}
                onChange={(e) => setRequestedIn(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Requested Out Time</label>
              <input
                type="time"
                value={requestedOut}
                onChange={(e) => setRequestedOut(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* reason */}
          <div>
            <label className="block text-xs font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need this correction"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            />
          </div>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </form>

        {/* previous requests */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">My Regularisation Requests</h2>
          </div>

          {loadingRequests && (
            <p className="text-xs text-muted-foreground">Loading requests…</p>
          )}
          {reqError && <p className="text-xs text-destructive">{reqError}</p>}

          {!loadingRequests && !reqError && requests.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground">
              You have not submitted any regularisation requests yet.
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
                    <p className="text-sm font-medium">{r.date}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {r.currentCheckIn || '-'} – {r.currentCheckOut || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested: {r.requestedCheckIn} – {r.requestedCheckOut}
                    </p>
                  </div>
                  <span className={statusBadge(r.status)}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">{r.reason}</p>

                {r.approverName && (
                  <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                    {r.approverName}: {r.approverComment || (r.status === 'approved'
                      ? 'Approved'
                      : 'Updated')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
