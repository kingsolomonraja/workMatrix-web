// src/pages/leave/ApplyLeave.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, FileText } from 'lucide-react';

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave'];

export default function ApplyLeave() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState(LEAVE_TYPES[0]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="p-4">Loading profile...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fromDate || !toDate || !reason.trim()) {
      setError('Please fill all required fields.');
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (end < start) {
      setError('To date cannot be before From date.');
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    try {
      setSubmitting(true);

      await addDoc(collection(db, 'leaves'), {
        userId: user.uid,
        employeeId: profile.employeeId,
        employeeName: profile.name,
        type,
        fromDate,
        toDate,
        days,
        reason: reason.trim(),
        status: 'pending',
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess('Leave applied successfully. Waiting for HR approval.');
      setReason('');
      // optional: reset dates too
      // setFromDate('');
      // setToDate('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while applying leave.');
    } finally {
      setSubmitting(false);
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
              <FileText className="w-5 h-5" />
              Apply Leave
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

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-4">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {LEAVE_TYPES.map((lt) => (
                <option key={lt} value={lt}>
                  {lt}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
              placeholder="Explain briefly why you are applying leave"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/home')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Leave'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
