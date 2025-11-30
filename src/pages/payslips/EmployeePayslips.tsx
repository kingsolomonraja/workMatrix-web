import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DollarSign, RefreshCw, FileText } from 'lucide-react';

type PayslipDoc = {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  basicPay: number;
  hra: number;
  allowances: number;
  deductions: number;
  netPay: number;
  remarks?: string;
  pdfUrl?: string;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function EmployeePayslips() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState<PayslipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const fetchPayslips = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(
        collection(db, 'payslips'),
        where('userId', '==', user.uid),
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      const snap = await getDocs(q);

      const data: PayslipDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<PayslipDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setPayslips(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load payslips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <DollarSign className="w-5 h-5" />
              Payslips
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPayslips}
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
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && (
          <p className="text-sm text-muted-foreground">Loading payslips…</p>
        )}

        {!loading && !error && payslips.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 text-sm text-muted-foreground">
            No payslips available yet.
          </div>
        )}

        <div className="space-y-3">
          {payslips.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Net Pay:{' '}
                    <span className="font-medium text-foreground">
                      ₹ {p.netPay.toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Basic: ₹ {p.basicPay.toLocaleString('en-IN')}</p>
                  <p>Allowances: ₹ {p.allowances.toLocaleString('en-IN')}</p>
                  <p>Deductions: ₹ {p.deductions.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {p.remarks && (
                <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                  Note: {p.remarks}
                </p>
              )}

              {p.pdfUrl ? (
                <div className="flex justify-end pt-1">
                  <a
                    href={p.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    View / Download PDF
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground text-right">
                  PDF not uploaded
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
