import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Settings, Search, RefreshCw } from 'lucide-react';

type EmployeeInfo = {
  uid: string;
  employeeId: string;
  name: string;
};

type ShiftDoc = {
  userId: string;
  employeeId: string;
  employeeName: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
};

const PRESET_SHIFTS: Array<
  Pick<ShiftDoc, 'shiftCode' | 'shiftName' | 'startTime' | 'endTime'>
> = [
  { shiftCode: 'G', shiftName: 'General', startTime: '09:00', endTime: '18:00' },
  { shiftCode: 'M', shiftName: 'Morning', startTime: '06:00', endTime: '15:00' },
  { shiftCode: 'N', shiftName: 'Night', startTime: '21:00', endTime: '06:00' },
];

export default function HrShifts() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isHr = profile?.role === 'hr';

  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [searchingEmp, setSearchingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  const [shift, setShift] = useState<ShiftDoc | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('G');

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [loadingAll, setLoadingAll] = useState(false);
  const [shiftsList, setShiftsList] = useState<ShiftDoc[]>([]);

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

  const handleSearchEmployee = async () => {
    setEmpError(null);
    setEmployee(null);
    setShift(null);
    setSaveMsg(null);

    if (!employeeIdInput.trim()) {
      setEmpError('Enter an Employee ID.');
      return;
    }

    try {
      setSearchingEmp(true);
      const q = query(
        collection(db, 'users'),
        where('employeeId', '==', employeeIdInput.trim())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setEmpError('No employee found with this ID.');
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data() as any;

      const emp: EmployeeInfo = {
        uid: docSnap.id,
        employeeId: data.employeeId,
        name: data.name || data.fullName || '',
      };
      setEmployee(emp);

      // load current shift
      const shiftSnap = await getDoc(doc(db, 'shifts', emp.uid));
      if (shiftSnap.exists()) {
        setShift(shiftSnap.data() as ShiftDoc);
        setSelectedPreset(shiftSnap.data().shiftCode || 'G');
      } else {
        setShift(null);
        setSelectedPreset('G');
      }
    } catch (err) {
      console.error(err);
      setEmpError('Failed to search employee.');
    } finally {
      setSearchingEmp(false);
    }
  };

  const handleSaveShift = async () => {
    if (!employee) return;
    setSaveMsg(null);
    const preset =
      PRESET_SHIFTS.find((s) => s.shiftCode === selectedPreset) || PRESET_SHIFTS[0];

    const data: ShiftDoc = {
      userId: employee.uid,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      shiftCode: preset.shiftCode,
      shiftName: preset.shiftName,
      startTime: preset.startTime,
      endTime: preset.endTime,
    };

    try {
      setSaving(true);
      await setDoc(
        doc(db, 'shifts', employee.uid),
        {
          ...data,
          updatedBy: profile?.name || 'HR',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setShift(data);
      setSaveMsg('Shift updated.');
      await loadAllShifts();
    } catch (err) {
      console.error(err);
      setSaveMsg('Failed to update shift.');
    } finally {
      setSaving(false);
    }
  };

  const loadAllShifts = async () => {
    setLoadingAll(true);
    try {
      const snap = await getDocs(collection(db, 'shifts'));
      const list: ShiftDoc[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as ShiftDoc);
      });
      // sort by employeeId
      list.sort((a, b) => (a.employeeId < b.employeeId ? -1 : 1));
      setShiftsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    loadAllShifts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              ←
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Change Shift
            </h1>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadAllShifts}
            disabled={loadingAll}
          >
            <RefreshCw className={`w-4 h-4 ${loadingAll ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Search + change shift */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <h2 className="text-sm font-semibold mb-1">Select Employee</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={employeeIdInput}
              onChange={(e) => setEmployeeIdInput(e.target.value)}
              placeholder="Employee ID"
              className="flex-1 min-w-[160px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              size="sm"
              type="button"
              onClick={handleSearchEmployee}
              disabled={searchingEmp || !employeeIdInput.trim()}
            >
              <Search className="w-4 h-4 mr-1" />
              {searchingEmp ? 'Searching…' : 'Search'}
            </Button>
          </div>

          {empError && <p className="text-xs text-destructive">{empError}</p>}

          {employee && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>
                Employee:{' '}
                <span className="font-medium text-foreground">{employee.name}</span>
              </p>
              <p>
                Emp ID:{' '}
                <span className="font-mono text-foreground">{employee.employeeId}</span>
              </p>
              {shift && (
                <p>
                  Current shift:{' '}
                  <span className="font-medium text-foreground">
                    {shift.shiftName} ({shift.startTime} – {shift.endTime})
                  </span>
                </p>
              )}
            </div>
          )}

          {employee && (
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium mb-1">
                Select new shift
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SHIFTS.map((s) => (
                  <button
                    key={s.shiftCode}
                    type="button"
                    onClick={() => setSelectedPreset(s.shiftCode)}
                    className={`px-3 py-2 rounded-xl border text-xs text-left min-w-[120px] ${
                      selectedPreset === s.shiftCode
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border'
                    }`}
                  >
                    <div className="font-medium">{s.shiftName}</div>
                    <div className="text-[11px] opacity-80">
                      {s.startTime} – {s.endTime}
                    </div>
                  </button>
                ))}
              </div>

              {saveMsg && (
                <p className="text-[11px] text-muted-foreground">{saveMsg}</p>
              )}

              <div className="flex justify-end pt-1">
                <Button onClick={handleSaveShift} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Shift'}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Shifts overview */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-semibold mb-1">All Employee Shifts</h2>
          {loadingAll && (
            <p className="text-xs text-muted-foreground">Loading shifts…</p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Emp ID</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Shift</th>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {shiftsList.map((s) => (
                  <tr key={s.userId} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{s.employeeId}</td>
                    <td className="px-3 py-2">{s.employeeName}</td>
                    <td className="px-3 py-2">
                      {s.shiftName} ({s.shiftCode})
                    </td>
                    <td className="px-3 py-2">
                      {s.startTime} – {s.endTime}
                    </td>
                  </tr>
                ))}
                {!shiftsList.length && !loadingAll && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-center text-xs text-muted-foreground"
                    >
                      No shifts configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
