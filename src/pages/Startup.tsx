import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Frown, Meh, Smile, Laugh, PartyPopper, Megaphone } from 'lucide-react';

type StartupDoc = {
  userId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  workMode: 'office' | 'home' | 'field';
  mood: string;
  notes: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  createdAt: any;
  priority: 'low' | 'medium' | 'high';
};

const MODES: StartupDoc['workMode'][] = ['office', 'home', 'field'];

const MOODS = [
  { emoji: Frown, label: 'Unhappy', value: 'unhappy', color: 'text-red-600' },
  { emoji: Meh, label: 'Sad', value: 'sad', color: 'text-orange-600' },
  { emoji: Smile, label: 'Ok', value: 'ok', color: 'text-yellow-600' },
  { emoji: Laugh, label: 'Happy', value: 'happy', color: 'text-green-600' },
  { emoji: PartyPopper, label: 'Excited', value: 'excited', color: 'text-purple-600' },
];

export default function Startup() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [startup, setStartup] = useState<StartupDoc | null>(null);
  const [mode, setMode] = useState<StartupDoc['workMode']>('office');
  const [mood, setMood] = useState<string>('ok');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (user && profile) {
      loadStartup();
      loadAnnouncements();
    }
  }, [user, profile]);

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
        setMood(d.mood || 'ok');
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

  const loadAnnouncements = async () => {
    try {
      const q = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      const data: Announcement[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  const handleSave = async () => {
    if (!mode || !mood) return;
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
          mood,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-600';
      case 'medium':
        return 'border-l-yellow-600';
      default:
        return 'border-l-blue-600';
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
        {/* User Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">ID: {profile.employeeId}</p>
            </div>
          </div>
        </div>

        {/* Mood Selector */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">How's your day today?</h3>
          <div className="flex justify-between gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  mood === m.value
                    ? 'bg-secondary scale-110'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                <m.emoji className={`w-8 h-8 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-foreground">Announcements</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-3 rounded-lg bg-background border-l-4 ${getPriorityColor(
                    announcement.priority
                  )}`}
                >
                  <h4 className="text-sm font-medium text-foreground">{announcement.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{announcement.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Mode & Notes */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today's Startup</h2>
            {success && <span className="text-xs text-green-600">{success}</span>}
          </div>

          {loading && (
            <p className="text-xs text-muted-foreground">Loading…</p>
          )}

          <div>
            <label className="block text-xs font-medium mb-2">Work Mode</label>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {m === 'office'
                    ? 'Office'
                    : m === 'home'
                    ? 'WFH'
                    : 'Field'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              placeholder="Eg. Client visits, travel plan, special tasks…"
            />
          </div>

          {startup && (
            <p className="text-[11px] text-muted-foreground">
              Already started today in <b>{startup.workMode}</b> mode. Saving again will update it.
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !mode || !mood}
              className="w-full"
            >
              {saving ? 'Saving…' : 'Save Startup'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
