import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

type StartupDoc = {
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  workMode: 'office' | 'home' | 'field';
  notes: string;
};

const MODES: StartupDoc['workMode'][] = ['office', 'home', 'field'];

export default function Startup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [startup, setStartup] = useState<StartupDoc | null>(null);
  const [mode, setMode] = useState<StartupDoc['workMode']>('office');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const docId = `${user.uid}_${today}`;
  const docRef = doc(db, 'startups', docId);

  const loadStartup = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data() as StartupDoc;
        setStartup(d);
        setMode(d.workMode);
        setNotes(d.notes || '');
      } else {
        setStartup(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load today startup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStartup();
  }, []);

  const handleSave = async () => {
    if (!mode) return;
    setError(null);
    setSuccess(null);
    try {
      setSaving(true);
      await setDoc(
        docRef,
        {
          userId: user.uid,
          employeeId: profile.employeeId,
          employeeName: profile.name,
          date: today,
          workMode: mode,
          notes: notes.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSuccess('Startup saved for today.');
      await loadStartup();
    } catch (err) {
      console.error(err);
      setError('Failed to save startup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            ←
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            Startup
          </h1>
        </div>
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Employee:{' '}
            <span className="font-medium text-foreground">{profile.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Employee ID:{' '}
            <span className="font-mono text-foreground">{profile.employeeId}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Date: <span className="font-mono text-foreground">{today}</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today Startup</h2>
            {success && <span className="text-xs text-emerald-600">{success}</span>}
          </div>

          {loading && (
            <p className="text-xs text-muted-foreground">Loading…</p>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Work Mode</label>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border'
                  }`}
                >
                  {m === 'office'
                    ? 'Office'
                    : m === 'home'
                    ? 'Work From Home'
                    : 'Field'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              placeholder="Eg. Client visits, travel plan, special tasks…"
            />
          </div>

          {startup && (
            <p className="text-[11px] text-muted-foreground">
              Already started today in <b>{startup.workMode}</b> mode. Saving again will
              update it.
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !mode || notes.trim() === ''}
            >
              {saving ? 'Saving…' : 'Save Startup'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
