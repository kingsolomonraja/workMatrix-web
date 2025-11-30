import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Search, UploadCloud } from 'lucide-react';

type EmployeeInfo = {
  uid: string;
  employeeId: string;
  name: string;
};

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();

export default function HrPayslipEntry() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isHr = profile?.role === 'hr';

  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [searchingEmp, setSearchingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(currentYear);

  const [basicPay, setBasicPay] = useState('');
  const [hra, setHra] = useState('');
  const [allowances, setAllowances] = useState('');
  const [deductions, setDeductions] = useState('');
  const [remarks, setRemarks] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSaveMessage(null);
  }, [employeeIdInput, month, year, basicPay, hra, allowances, deductions, remarks, pdfFile]);

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

    if (!employeeIdInput.trim()) {
      setEmpError('Enter an Employee ID.');
      return;
    }

    try {
      setSearchingEmp(true);

      // 🔁 Change 'users' below if your collection is named differently.
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

      setEmployee({
        uid: docSnap.id,
        employeeId: data.employeeId,
        name: data.name || data.fullName || '',
      });
    } catch (err: any) {
      console.error(err);
      setEmpError('Failed to search employee.');
    } finally {
      setSearchingEmp(false);
    }
  };

  const parseNumber = (v: string) => (v ? Number(v) || 0 : 0);

  const handleSave = async () => {
    setFormError(null);
    setSaveMessage(null);

    if (!employee) {
      setFormError('Select an employee first.');
      return;
    }

    if (!month || !year) {
      setFormError('Select month and year.');
      return;
    }

    const basic = parseNumber(basicPay);
    const h = parseNumber(hra);
    const all = parseNumber(allowances);
    const ded = parseNumber(deductions);
    const net = basic + h + all - ded;

    try {
      setSaving(true);

      // upload PDF if any
      let pdfUrl: string | undefined;
      if (pdfFile) {
        const path = `payslips/${employee.uid}/${year}_${month}.pdf`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, pdfFile);
        pdfUrl = await getDownloadURL(storageRef);
      }

      const docId = `${employee.uid}_${year}_${month}`;
      const refDoc = doc(db, 'payslips', docId);

      await setDoc(
        refDoc,
        {
          userId: employee.uid,
          employeeId: employee.employeeId,
          employeeName: employee.name,
          month,
          year,
          basicPay: basic,
          hra: h,
          allowances: all,
          deductions: ded,
          netPay: net,
          remarks: remarks.trim() || '',
          ...(pdfUrl ? { pdfUrl } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaveMessage('Payslip saved successfully.');
    } catch (err: any) {
      console.error(err);
      setFormError('Failed to save payslip.');
    } finally {
      setSaving(false);
    }
  };

  const yearOptions = [];
  for (let y = currentYear - 3; y <= currentYear + 1; y++) {
    yearOptions.push(y);
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
              <DollarSign className="w-5 h-5" />
              HR Payslip Entry
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Employee search box */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
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
            <div className="mt-2 text-xs text-muted-foreground">
              <p>
                Employee: <span className="font-medium text-foreground">{employee.name}</span>
              </p>
              <p>
                Emp ID: <span className="font-mono text-foreground">{employee.employeeId}</span>
              </p>
            </div>
          )}
        </section>

        {/* Payslip details */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Payslip Details</h2>
            {saveMessage && (
              <span className="text-xs text-emerald-600">{saveMessage}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary components */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Basic Pay (₹)</label>
              <input
                type="number"
                value={basicPay}
                onChange={(e) => setBasicPay(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">HRA (₹)</label>
              <input
                type="number"
                value={hra}
                onChange={(e) => setHra(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Allowances (₹)</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Deductions (₹)</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium mb-1">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[70px]"
            />
          </div>

          {/* PDF upload */}
          <div>
            <label className="block text-xs font-medium mb-1 flex items-center gap-1">
              <UploadCloud className="w-4 h-4" />
              Attach Payslip PDF (optional)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {pdfFile && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Selected: {pdfFile.name}
              </p>
            )}
          </div>

          {formError && <p className="text-xs text-destructive">{formError}</p>}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Payslip'}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
