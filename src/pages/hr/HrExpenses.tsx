import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  WalletCards,
} from 'lucide-react';

type ExpenseDoc = {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  hrComment?: string;
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paid';

export default function HrExpenses() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isHr = profile?.role === 'hr';

  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const fetchExpenses = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data: ExpenseDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<ExpenseDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setExpenses(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHr) return;
    fetchExpenses();
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

  const statusBadge = (status: ExpenseDoc['status']) => {
    const base =
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium';
    switch (status) {
      case 'pending':
        return `${base} bg-amber-100 text-amber-800`;
      case 'approved':
        return `${base} bg-blue-100 text-blue-800`;
      case 'paid':
        return `${base} bg-emerald-100 text-emerald-800`;
      case 'rejected':
        return `${base} bg-rose-100 text-rose-800`;
      default:
        return base;
    }
  };

  const handleUpdateStatus = async (exp: ExpenseDoc, newStatus: ExpenseDoc['status']) => {
    const comment =
      newStatus === 'rejected'
        ? window.prompt('Optional: Add rejection comment (or leave blank):', '') || ''
        : newStatus === 'paid'
        ? window.prompt('Optional: Add payment note (or leave blank):', '') || ''
        : '';

    try {
      setUpdatingId(exp.id);
      const ref = collection(db, 'expenses');
      await import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) =>
        updateDoc(doc(ref, exp.id), {
          status: newStatus,
          hrComment: comment,
          updatedAt: serverTimestamp(),
        })
      );

      setExpenses((prev) =>
        prev.map((e) =>
          e.id === exp.id ? { ...e, status: newStatus, hrComment: comment } : e
        )
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredExpenses =
    statusFilter === 'all'
      ? expenses
      : expenses.filter((e) => e.status === statusFilter);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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
              <WalletCards className="w-5 h-5" />
              Expense Overview
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchExpenses}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-4">
        {/* filter bar */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Total: <span className="font-medium text-foreground">₹ {totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && (
          <p className="text-sm text-muted-foreground">Loading expenses…</p>
        )}

        {!loading && filteredExpenses.length === 0 && !error && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No expenses found for this filter.
          </div>
        )}

        <div className="space-y-3">
          {filteredExpenses.map((e) => (
            <div
              key={e.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    ₹ {e.amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.category} • {e.date}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {e.employeeName} ({e.employeeId})
                  </p>
                </div>
                <span className={statusBadge(e.status)}>
                  {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{e.description}</p>

              {e.receiptUrl && (
                <a
                  href={e.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline"
                >
                  View receipt
                </a>
              )}

              {e.hrComment && (
                <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                  HR: {e.hrComment}
                </p>
              )}

              {/* actions */}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {e.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === e.id}
                      onClick={() => handleUpdateStatus(e, 'rejected')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={updatingId === e.id}
                      onClick={() => handleUpdateStatus(e, 'approved')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </>
                )}

                {e.status === 'approved' && (
                  <Button
                    size="sm"
                    disabled={updatingId === e.id}
                    onClick={() => handleUpdateStatus(e, 'paid')}
                  >
                    Mark Paid
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
