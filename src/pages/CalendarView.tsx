// src/pages/attendance/CalendarView.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  CalendarX,
  Sun,
  Star,
  Home,
} from "lucide-react";

type AttendanceDoc = {
  id: string;
  date: string; // YYYY-MM-DD
  status?: "present" | "absent" | "half-day" | "wfh" | string;
  note?: string;
};

type LeaveDoc = {
  id: string;
  type: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  status: string; // approved | pending | rejected
  reason?: string;
};

type Holiday = {
  id?: string;
  date: string; // YYYY-MM-DD
  name: string;
};

type DayInfo = {
  iso: string; // '' for blank cells
  dayNumber?: number;
  // Derived info:
  attendance?: AttendanceDoc;
  leaves?: LeaveDoc[];
  holiday?: Holiday | null;
  isSunday?: boolean;
};

export default function CalendarView() {
  const { user } = useAuth();
  const now = new Date();

  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-11

  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [leaves, setLeaves] = useState<LeaveDoc[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI: date detail modal
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch data from Firestore
  async function fetchAll() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Attendance: fetch recent entries (we will filter to month later)
      const attQ = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        limit(500)
      );
      const attSnap = await getDocs(attQ);
      const attData: AttendanceDoc[] = attSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Leaves
      const leaveQ = query(
        collection(db, "leaves"),
        where("userId", "==", user.uid),
        orderBy("fromDate", "desc"),
        limit(500)
      );
      const leaveSnap = await getDocs(leaveQ);
      const leaveData: LeaveDoc[] = leaveSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Holidays (project-level collection)
      const holSnap = await getDocs(collection(db, "holidays"));
      const holData: Holiday[] = holSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      setAttendance(attData);
      setLeaves(leaveData);
      setHolidays(holData);
    } catch (err) {
      console.error(err);
      setError("Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  }

  // Helpers
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const isoFor = (y: number, m0: number, d: number) =>
    `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Build month grid (with leading blanks so grid is Sun..Sat)
  const monthGrid: DayInfo[] = useMemo(() => {
    const days: DayInfo[] = [];
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    // leading blanks
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ iso: "" });
    }

    // fill days
    for (let d = 1; d <= totalDays; d++) {
      const iso = isoFor(year, month, d);
      days.push({ iso, dayNumber: d });
    }

    // ensure 6 rows (6*7 = 42 cells) — optional, keeps consistent height
    while (days.length < 42) days.push({ iso: "" });

    // attach derived info from attendance/leaves/holidays
    const mapByIso = new Map<string, DayInfo>();
    days.forEach((dd) => {
      if (!dd.iso) return;
      mapByIso.set(dd.iso, dd);
    });

    // holidays
    holidays.forEach((h) => {
      if (mapByIso.has(h.date)) {
        mapByIso.get(h.date)!.holiday = h;
      }
    });

    // attendance entries relevant to this month
    attendance.forEach((a) => {
      if (mapByIso.has(a.date)) {
        mapByIso.get(a.date)!.attendance = a;
      }
    });

    // expand leaves to each date in the month
    leaves.forEach((L) => {
      const from = new Date(L.fromDate + "T00:00:00");
      const to = new Date(L.toDate + "T00:00:00");
      // iterate days in span
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().slice(0, 10);
        if (mapByIso.has(iso)) {
          const curr = mapByIso.get(iso)!;
          curr.leaves = curr.leaves || [];
          curr.leaves.push(L);
        }
      }
    });

    // Sundays flag
    mapByIso.forEach((v, iso) => {
      if (!iso) return;
      const dow = new Date(iso + "T00:00:00").getDay();
      v.isSunday = dow === 0;
    });

    // return days array (with mutated DayInfo via map)
    return days;
  }, [year, month, attendance, leaves, holidays]);

  // Priority function (single visual state per date)
  function getPriorityForDay(day: DayInfo) {
    // returns { type, colorClass, bgClass, label, Icon }
    if (!day.iso) return null;

    // 1. Holiday
    if (day.holiday) {
      return {
        type: "holiday",
        label: day.holiday.name,
        colorClass: "text-amber-600",
        bgClass: "bg-muted/50",
        Icon: Star,
      };
    }

    // 2. Sunday
    if (day.isSunday) {
      return {
        type: "sunday",
        label: "Sunday",
        colorClass: "text-muted-foreground",
        bgClass: "bg-muted/30",
        Icon: Sun,
      };
    }

    // 3. Leave (if any)
    if (day.leaves && day.leaves.length > 0) {
      // if any leave type contains 'wfh' show home icon
      const isWfh = day.leaves.some((l) =>
        l.type?.toLowerCase().includes("wfh")
      );
      return {
        type: "leave",
        label: day.leaves.map((l) => l.type).join(", "),
        colorClass: "text-blue-600",
        bgClass: "bg-muted/50",
        Icon: isWfh ? Home : CalendarX,
      };
    }

    // 4. Absent
    if (day.attendance && day.attendance.status === "absent") {
      return {
        type: "absent",
        label: "Absent",
        colorClass: "text-rose-600",
        bgClass: "bg-muted/50",
        Icon: XCircle,
      };
    }

    // 5. Half-day
    if (day.attendance && day.attendance.status === "half-day") {
      return {
        type: "half-day",
        label: "Half Day",
        colorClass: "text-amber-600",
        bgClass: "bg-muted/50",
        Icon: Clock,
      };
    }

    // 6. Present (full day)
    if (day.attendance && day.attendance.status === "present") {
      return {
        type: "present",
        label: "Present",
        colorClass: "text-emerald-600",
        bgClass: "bg-muted/50",
        Icon: CheckCircle,
      };
    }

    // default: no event
    return null;
  }

  // Stats for header
  const stats = useMemo(() => {
    let present = 0,
      absent = 0,
      half = 0,
      leaveDays = 0,
      holidaysCount = 0,
      sundays = 0,
      totalDays = 0;

    // count across current month displayed cells
    const visited = new Set<string>();
    monthGrid.forEach((d) => {
      if (!d.iso) return;
      totalDays++;
      const p = getPriorityForDay(d);
      if (p?.type === "present") present++;
      if (p?.type === "absent") absent++;
      if (p?.type === "half-day") half++;
      if (p?.type === "leave") {
        // count leave days (distinct iso)
        leaveDays++;
      }
      if (p?.type === "holiday") holidaysCount++;
      if (d.isSunday) sundays++;
      visited.add(d.iso);
    });

    return {
      totalDays,
      present,
      absent,
      half,
      leaveDays,
      holidaysCount,
      sundays,
    };
  }, [monthGrid]);

  // year options small range
  const yearOptions = useMemo(() => {
    const cy = now.getFullYear();
    const arr: number[] = [];
    for (let y = cy - 3; y <= cy + 3; y++) arr.push(y);
    return arr;
  }, [now]);

  // UI components: small presentational helpers
  const StatCard: React.FC<{ title: string; value: number; colorClass?: string }> = ({ title, value, colorClass }) => (
    <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col items-start gap-1 min-w-[110px]">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={`text-lg font-semibold ${colorClass || "text-foreground"}`}>{value}</div>
    </div>
  );

  // Click day: show details
  const openDay = (d: DayInfo) => setSelectedDay(d);
  const closeDay = () => setSelectedDay(null);

  // Render
  return (
    <div className="min-h-screen p-4 bg-background">
      {/* header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">{`${new Date(year, month).toLocaleString(undefined, { month: "long" })} ${year}`}</div>

          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {new Date(0, i).toLocaleString(undefined, { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StatCard title="Days" value={stats.totalDays} />
          <StatCard title="Present" value={stats.present} colorClass="text-emerald-600" />
          <StatCard title="Absent" value={stats.absent} colorClass="text-rose-600" />
          <StatCard title="Leave" value={stats.leaveDays} colorClass="text-blue-600" />
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} className="text-center">{w}</div>
        ))}
      </div>

      {/* calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {monthGrid.map((d, idx) => {
          const priority = getPriorityForDay(d);
          const isToday = d.iso === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={idx}
              onClick={() => d.iso && openDay(d)}
              className={`
                p-3 rounded-lg border border-border cursor-pointer flex flex-col justify-between transition
                ${d.iso ? "min-h-[92px]" : "min-h-[92px] opacity-30 pointer-events-none"}
                ${priority ? priority.bgClass : "bg-card"}
                ${isToday ? "ring-2 ring-primary" : ""}
                hover:shadow-md active:scale-95
              `}
            >
              {/* Top: day number */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{d.dayNumber || ""}</div>
                {priority ? (
                  <div className={`flex items-center gap-1 text-[12px] ${priority.colorClass}`}>
                    <priority.Icon className="w-4 h-4" />
                  </div>
                ) : null}
              </div>

              {/* Bottom: label */}
              <div className="mt-2">
                {priority ? (
                  <div className="text-xs font-medium truncate" title={priority.label}>
                    {priority.label}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No data</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* bottom legend */}
      <div className="mt-6 flex flex-wrap gap-3 items-center justify-center">
        <LegendDot color="bg-emerald-600" label="Present" Icon={CheckCircle} />
        <LegendDot color="bg-rose-600" label="Absent" Icon={XCircle} />
        <LegendDot color="bg-amber-600" label="Half-day" Icon={Clock} />
        <LegendDot color="bg-blue-600" label="Leave" Icon={CalendarX} />
        <LegendDot color="bg-amber-600" label="Holiday" Icon={Star} />
        <LegendDot color="bg-muted-foreground" label="Sunday" Icon={Sun} />
      </div>

      {/* day details panel (simple modal) */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDay} />
          <div className="relative bg-card border border-border rounded-xl p-4 w-full md:w-2/5 max-h-[80vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-muted-foreground">
                  {selectedDay.iso}
                </div>
                <div className="text-lg font-semibold">
                  {new Date(selectedDay.iso + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeDay}>✕</Button>
            </div>

            <div className="space-y-3">
              {/* holiday */}
              {selectedDay.holiday && (
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-600" />
                    <div className="font-medium">{selectedDay.holiday.name}</div>
                  </div>
                </div>
              )}

              {/* attendance */}
              {selectedDay.attendance ? (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">Attendance</div>
                    <div className="text-xs text-muted-foreground">{selectedDay.attendance.date}</div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm">
                      Status: <span className="font-semibold">{selectedDay.attendance.status}</span>
                    </div>
                    {selectedDay.attendance.note && (
                      <div className="text-xs text-muted-foreground mt-1">Note: {selectedDay.attendance.note}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="text-sm text-muted-foreground">No attendance record for this day.</div>
                </div>
              )}

              {/* leaves */}
              {selectedDay.leaves && selectedDay.leaves.length > 0 && (
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="font-medium mb-2">Leave(s)</div>
                  <div className="space-y-2">
                    {selectedDay.leaves.map((L) => (
                      <div key={L.id} className="bg-card p-2 rounded-lg border border-border">
                        <div className="text-sm font-medium">{L.type} · {L.status}</div>
                        <div className="text-xs text-muted-foreground">
                          {L.fromDate} → {L.toDate}
                          {L.reason ? ` · ${L.reason}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeDay}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// small legend component
function LegendDot({ color, label, Icon }: { color: string; label: string; Icon: any }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
