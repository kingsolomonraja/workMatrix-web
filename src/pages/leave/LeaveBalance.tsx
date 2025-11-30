// src/pages/leave/LeaveBalance.tsx
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type LeaveBalanceData = {
  casual: number;
  sick: number;
  earned: number;
  usedCasual: number;
  usedSick: number;
  usedEarned: number;
};

export default function LeaveBalance() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<LeaveBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      try {
        const ref = doc(db, 'leaveBalances', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setBalance(snap.data() as LeaveBalanceData);
        } else {
          setBalance(null);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load leave balance.');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [user]);

  if (!user || !profile) {
    return <div className="p-4">Loading profile...</div>;
  }

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
              Leave Balance
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-medium text-foreground">{profile.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Employee ID: <span className="font-mono text-foreground">{profile.employeeId}</span>
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading leave balance…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !balance && !error && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            Leave balance is not configured yet. Please contact HR.
          </div>
        )}

        {balance && (
          <div className="grid gap-3">
            {[
              {
                label: 'Casual Leave',
                total: balance.casual,
                used: balance.usedCasual,
              },
              {
                label: 'Sick Leave',
                total: balance.sick,
                used: balance.usedSick,
              },
              {
                label: 'Earned Leave',
                total: balance.earned,
                used: balance.usedEarned,
              },
            ].map((item) => {
              const remaining = item.total - item.used;
              return (
                <div
                  key={item.label}
                  className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Total: {item.total} • Used: {item.used}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${item.total > 0 ? (item.used / item.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Remaining:{' '}
                    <span className="font-semibold text-foreground">{remaining}</span> days
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
