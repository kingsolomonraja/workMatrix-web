// src/pages/hr/HrLeaveApprovals.tsx
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type LeaveDoc = {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  appliedAt?: any;
};

export default function HrLeaveApprovals() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHr = profile?.role === 'hr';

  const fetchLeaves = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(
        collection(db, 'leaves'),
        where('status', '==', 'pending'),
        orderBy('appliedAt', 'desc')
      );
      const snap = await getDocs(q);
      const data: LeaveDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<LeaveDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setLeaves(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load pending leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHr) return;
    fetchLeaves();
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

  const handleUpdateStatus = async (leaveId: string, newStatus: 'approved' | 'rejected') => {
    const comment = newStatus === 'rejected'
      ? window.prompt('Optional: Add rejection comment (or leave blank):', '')
      : '';

    try {
      setUpdatingId(leaveId);
      const ref = doc(db, 'leaves', leaveId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        approverId: profile?.employeeId || profile?.uid || '',
        approverName: profile?.name || 'HR',
        approverComment: comment || '',
      });

      // Locally update list
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (err: any) {
      console.error(err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              ←
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              HR Leave Approvals
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLeaves}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && <p className="text-sm text-muted-foreground">Loading pending leaves…</p>}

        {!loading && leaves.length === 0 && !error && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No pending leave requests.
          </div>
        )}

        <div className="space-y-3">
          {leaves.map((leave) => (
            <div
              key={leave.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {leave.employeeName}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({leave.employeeId})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leave.type} • {leave.days} day(s)
                  </p>
                </div>
                <span className="text-xs rounded-full px-2 py-1 bg-amber-100 text-amber-800">
                  Pending
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">From:</span> {leave.fromDate}
                </p>
                <p>
                  <span className="font-medium text-foreground">To:</span> {leave.toDate}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Reason</p>
                <p className="whitespace-pre-line">{leave.reason}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === leave.id}
                  onClick={() => handleUpdateStatus(leave.id, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={updatingId === leave.id}
                  onClick={() => handleUpdateStatus(leave.id, 'approved')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
