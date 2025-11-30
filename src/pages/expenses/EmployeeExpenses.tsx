import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreditCard, RefreshCw, UploadCloud } from 'lucide-react';

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

const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Other'];

export default function EmployeeExpenses() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const fetchExpenses = async () => {
    setListError(null);
    setLoadingList(true);
    try {
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data: ExpenseDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<ExpenseDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setExpenses(data);
    } catch (err) {
      console.error(err);
      setListError('Failed to load your expenses.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseAmount = (v: string) => (v ? Number(v) || 0 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!date || !amount || !description.trim()) {
      setSubmitError('Please fill date, amount and description.');
      return;
    }

    const amt = parseAmount(amount);
    if (amt <= 0) {
      setSubmitError('Amount must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);

      let receiptUrl: string | undefined;
      if (receiptFile) {
        const path = `expenses/${user.uid}/${Date.now()}_${receiptFile.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, receiptFile);
        receiptUrl = await getDownloadURL(storageRef);
      }

      const docRef = await addDoc(collection(db, 'expenses'), {
        userId: user.uid,
        employeeId: profile.employeeId,
        employeeName: profile.name,
        date,
        category,
        amount: amt,
        description: description.trim(),
        receiptUrl: receiptUrl || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSubmitSuccess('Expense submitted successfully.');
      setAmount('');
      setDescription('');
      setReceiptFile(null);

      setExpenses((prev) => [
        {
          id: docRef.id,
          userId: user.uid,
          employeeId: profile.employeeId,
          employeeName: profile.name,
          date,
          category,
          amount: amt,
          description: description.trim(),
          receiptUrl: receiptUrl || '',
          status: 'pending',
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to submit expense.');
    } finally {
      setSubmitting(false);
    }
  };

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
              <CreditCard className="w-5 h-5" />
              Expense Claim
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchExpenses}
            disabled={loadingList}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        {/* employee info */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-medium text-foreground">{profile.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Employee ID: <span className="font-mono text-foreground">{profile.employeeId}</span>
          </p>
        </div>

        {/* new expense form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Submit Expense</h2>
            {submitSuccess && (
              <span className="text-xs text-emerald-600">{submitSuccess}</span>
            )}
          </div>

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
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g. Cab from office to client site"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 flex items-center gap-1">
              <UploadCloud className="w-4 h-4" />
              Attach receipt (image, optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {receiptFile && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Selected: {receiptFile.name}
              </p>
            )}
          </div>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Expense'}
            </Button>
          </div>
        </form>

        {/* my expenses list */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">My Expenses</h2>
          </div>

          {loadingList && (
            <p className="text-xs text-muted-foreground">Loading expenses…</p>
          )}
          {listError && <p className="text-xs text-destructive">{listError}</p>}

          {!loadingList && !listError && expenses.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground">
              You have not submitted any expenses yet.
            </div>
          )}

          <div className="space-y-3">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      ₹ {e.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.category} • {e.date}
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
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
