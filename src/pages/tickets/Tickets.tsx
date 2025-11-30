// src/pages/tickets/Tickets.tsx
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Ticket, RefreshCw } from 'lucide-react';

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

const CATEGORIES = ['HR', 'IT', 'Payroll', 'Admin', 'Other'];
const PRIORITIES: TicketDoc['priority'][] = ['low', 'medium', 'high'];

export default function Tickets() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<TicketDoc['priority']>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<TicketDoc[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile...</div>;
  }

  const fetchTickets = async () => {
    setListError(null);
    setLoadingList(true);
    try {
      const q = query(
        collection(db, 'tickets'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data: TicketDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Omit<TicketDoc, 'id'>;
        data.push({ id: docSnap.id, ...d });
      });
      setTickets(data);
    } catch (err: any) {
      console.error(err);
      setListError('Failed to load your tickets.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!subject.trim() || !description.trim()) {
      setSubmitError('Please fill subject and description.');
      return;
    }

    try {
      setSubmitting(true);
      const docRef = await addDoc(collection(db, 'tickets'), {
        userId: user.uid,
        employeeId: profile.employeeId,
        employeeName: profile.name,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSubmitSuccess('Ticket created successfully.');
      setSubject('');
      setDescription('');

      // Optimistic append to list
      setTickets((prev) => [
        {
          id: docRef.id,
          userId: user.uid,
          employeeId: profile.employeeId,
          employeeName: profile.name,
          category,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          status: 'open',
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error(err);
      setSubmitError('Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const priorityLabel = (p: TicketDoc['priority']) =>
    p.charAt(0).toUpperCase() + p.slice(1);

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
              Tickets
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTickets}
            disabled={loadingList}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
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

        {/* New Ticket Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Create New Ticket</h2>
            {submitSuccess && (
              <span className="text-xs text-emerald-600">{submitSuccess}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
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

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketDoc['priority'])}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of the issue"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the issue in detail"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
            />
          </div>

          {submitError && <p className="text-xs text-destructive">{submitError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubject('');
                setDescription('');
              }}
              disabled={submitting}
            >
              Clear
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Ticket'}
            </Button>
          </div>
        </form>

        {/* My Tickets List */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">My Tickets</h2>
          </div>

          {loadingList && (
            <p className="text-xs text-muted-foreground">Loading your tickets…</p>
          )}
          {listError && <p className="text-xs text-destructive">{listError}</p>}

          {!loadingList && !listError && tickets.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground">
              You have not raised any tickets yet.
            </div>
          )}

          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} • Priority: {priorityLabel(t.priority)}
                    </p>
                  </div>
                  <span className={statusBadge(t.status)}>
                    {t.status === 'in_progress'
                      ? 'In Progress'
                      : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {t.description}
                </p>

                {t.hrComment && (
                  <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                    HR Note: {t.hrComment}
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
