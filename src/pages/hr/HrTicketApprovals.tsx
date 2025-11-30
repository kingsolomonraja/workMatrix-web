// src/pages/hr/HrTicketApprovals.tsx
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Ticket, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type TicketDoc = {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  category: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt?: any;
  updatedAt?: any;
  hrComment?: string;
};

export default function HrTicketApprovals() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isHr = profile?.role === 'hr';

  const fetchTickets = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data: TicketDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<TicketDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setTickets(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHr) return;
    fetchTickets();
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

  const statusBadge = (status: TicketDoc['status']) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium';
    switch (status) {
      case 'open':
        return `${base} bg-amber-100 text-amber-800`;
      case 'in_progress':
        return `${base} bg-blue-100 text-blue-800`;
      case 'resolved':
        return `${base} bg-emerald-100 text-emerald-800`;
      case 'closed':
        return `${base} bg-zinc-200 text-zinc-800`;
      default:
        return base;
    }
  };

  const priorityBadge = (p: TicketDoc['priority']) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium';
    switch (p) {
      case 'high':
        return `${base} bg-rose-100 text-rose-800`;
      case 'medium':
        return `${base} bg-amber-100 text-amber-800`;
      case 'low':
      default:
        return `${base} bg-emerald-100 text-emerald-800`;
    }
  };

  const handleStatusChange = async (
    ticketId: string,
    newStatus: TicketDoc['status'],
    askComment: boolean
  ) => {
    let comment = '';
    if (askComment) {
      comment = window.prompt('Optional: Add a comment for the employee (or leave blank):', '') || '';
    }

    try {
      setUpdatingId(ticketId);
      const ref = doc(db, 'tickets', ticketId);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        handlerId: profile?.employeeId || profile?.uid || '',
        handlerName: profile?.name || 'HR',
        hrComment: comment,
        ...(newStatus === 'resolved' || newStatus === 'closed'
          ? { resolvedAt: serverTimestamp() }
          : {}),
      });

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus, hrComment: comment } : t))
      );
    } catch (err: any) {
      console.error(err);
      alert('Failed to update ticket status. Please try again.');
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
              <Ticket className="w-5 h-5" />
              HR Ticket Approvals
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTickets}
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
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading tickets…
          </p>
        )}

        {!loading && tickets.length === 0 && !error && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No tickets found.
          </div>
        )}

        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {t.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.employeeName} ({t.employeeId}) • {t.category}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={priorityBadge(t.priority)}>
                    Priority: {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                  </span>
                  <span className={statusBadge(t.status)}>
                    {t.status === 'in_progress'
                      ? 'In Progress'
                      : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground whitespace-pre-line">
                {t.description}
              </p>

              {t.hrComment && (
                <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                  HR Note: {t.hrComment}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === t.id || t.status === 'closed'}
                  onClick={() => handleStatusChange(t.id, 'in_progress', false)}
                >
                  <Loader2 className="w-4 h-4 mr-1" />
                  In Progress
                </Button>
                <Button
                  size="sm"
                  disabled={updatingId === t.id || t.status === 'resolved' || t.status === 'closed'}
                  onClick={() => handleStatusChange(t.id, 'resolved', true)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingId === t.id || t.status === 'closed'}
                  onClick={() => handleStatusChange(t.id, 'closed', true)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
