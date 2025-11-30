// src/pages/attendance/InOutReport.tsx
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, RefreshCw } from 'lucide-react';

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

export default function InOutReport() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const fetchRows = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      const data: AttendanceRow[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<AttendanceRow, 'id'>;
        data.push({ id: docSnap.id, ...d });
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
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <FileText className="w-5 h-5" />
              In Out Report
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

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Employee info */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-medium text-foreground">{profile.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Employee ID: <span className="font-mono text-foreground">{profile.employeeId}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Showing last 30 days of attendance.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && (
          <p className="text-sm text-muted-foreground">Loading attendance…</p>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No attendance records found.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="min-w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">In</th>
                  <th className="px-3 py-2 text-left font-medium">Out</th>
                  <th className="px-3 py-2 text-left font-medium">Hours</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{r.date}</td>
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
