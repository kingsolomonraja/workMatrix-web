import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

type ItDoc = {
  userId: string;
  employeeId: string;
  employeeName: string;
  pan: string;
  taxRegime: 'old' | 'new';
  hraRent: number;
  investment80C: number;
  investment80D: number;
  otherInvestments: number;
  notes: string;
};

const parseNum = (v: string) => (v ? Number(v) || 0 : 0);

export default function ItDeclaration() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [pan, setPan] = useState('');
  const [regime, setRegime] = useState<'old' | 'new'>('old');
  const [hra, setHra] = useState('');
  const [c80, setC80] = useState('');
  const [d80, setD80] = useState('');
  const [other, setOther] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile…</div>;
  }

  const docRef = doc(db, 'itDeclarations', user.uid);

  const loadIt = async () => {
    setError(null);
    setLoading(true);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data() as any;
        setPan(d.pan || '');
        setRegime(d.taxRegime || 'old');
        setHra(String(d.hraRent || ''));
        setC80(String(d.investment80C || ''));
        setD80(String(d.investment80D || ''));
        setOther(String(d.otherInvestments || ''));
        setNotes(d.notes || '');
        if (d.updatedAt?.toDate) {
          setLastUpdated(d.updatedAt.toDate().toLocaleString());
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load IT declaration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!pan.trim()) {
      setError('PAN is required.');
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        docRef,
        {
          userId: user.uid,
          employeeId: profile.employeeId,
          employeeName: profile.name,
          pan: pan.trim().toUpperCase(),
          taxRegime: regime,
          hraRent: parseNum(hra),
          investment80C: parseNum(c80),
          investment80D: parseNum(d80),
          otherInvestments: parseNum(other),
          notes: notes.trim(),
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSuccess('IT declaration saved.');
      await loadIt();
    } catch (err) {
      console.error(err);
      setError('Failed to save.');
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
            <ShieldCheck className="w-5 h-5" />
            IT Declaration
          </h1>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <p className="text-sm text-muted-foreground">
            Employee:{' '}
            <span className="font-medium text-foreground">{profile.name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Employee ID:{' '}
            <span className="font-mono text-foreground">{profile.employeeId}</span>
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
          {loading && (
            <p className="text-xs text-muted-foreground">Loading saved data…</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">PAN</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tax Regime</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs ${
                    regime === 'old'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border'
                  }`}
                  onClick={() => setRegime('old')}
                >
                  Old Regime
                </button>
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs ${
                    regime === 'new'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border'
                  }`}
                  onClick={() => setRegime('new')}
                >
                  New Regime
                </button>
              </div>
            </div>
          </div>

          {/* Investments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                HRA – Annual Rent (₹)
              </label>
              <input
                type="number"
                value={hra}
                onChange={(e) => setHra(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                80C Investments (₹)
              </label>
              <input
                type="number"
                value={c80}
                onChange={(e) => setC80(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="PF, ELSS, LIC, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                80D (Health Insurance) (₹)
              </label>
              <input
                type="number"
                value={d80}
                onChange={(e) => setD80(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Other Investments (₹)
              </label>
              <input
                type="number"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="NPS, donations, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Notes / Declaration (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-emerald-600">{success}</p>}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Declaration'}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
