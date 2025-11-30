// src/pages/attendance/DailyAttendance.tsx
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw } from 'lucide-react';

type AttendanceRow = {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime?: any;
  checkOutTime?: any;
  totalHours?: number;
  status?: string;
};

function formatTime(ts?: any) {
  if (!ts?.toDate) return '-';
  const d: Date = ts.toDate();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function defaultDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DailyAttendance() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(defaultDate);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHr = profile?.role === 'hr';

  const fetchRows = async () => {
    if (!date) return;
    setError(null);
    setLoading(true);
    try {
      const q = query(collection(db, 'attendance'), where('date', '==', date));
      const snap = await getDocs(q);
      const data: AttendanceRow[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<AttendanceRow, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });

      // sort client-side: employeeId then name
      data.sort((a, b) => {
        if (a.employeeId < b.employeeId) return -1;
        if (a.employeeId > b.employeeId) return 1;
        return (a.employeeName || '').localeCompare(b.employeeName || '');
      });

      setRows(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHr) return;
    fetchRows();
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
              <Calendar className="w-5 h-5" />
              Daily Attendance
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRows}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button
            className="ml-auto"
            size="sm"
            onClick={fetchRows}
            disabled={loading || !date}
          >
            Apply
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && (
          <p className="text-sm text-muted-foreground">Loading attendance…</p>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No attendance records found for {date}.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="min-w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Emp ID</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">In</th>
                  <th className="px-3 py-2 text-left font-medium">Out</th>
                  <th className="px-3 py-2 text-left font-medium">Hours</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{r.employeeId}</td>
                    <td className="px-3 py-2">{r.employeeName}</td>
                    <td className="px-3 py-2">{formatTime(r.checkInTime)}</td>
                    <td className="px-3 py-2">{formatTime(r.checkOutTime)}</td>
                    <td className="px-3 py-2">
                      {typeof r.totalHours === 'number' ? r.totalHours.toFixed(2) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800">
                        {r.status || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
