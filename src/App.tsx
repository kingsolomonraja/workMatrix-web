import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import ApplyLeave from '@/pages/leave/ApplyLeave';
import LeaveBalance from '@/pages/leave/LeaveBalance';
import HrLeaveApprovals from '@/pages/hr/HrLeaveApprovals';
import Tickets from '@/pages/tickets/Tickets';
import HrTicketApprovals from '@/pages/hr/HrTicketApprovals';
import Punch from '@/pages/attendance/Punch';
import InOutReport from '@/pages/attendance/InOutReport';
import DailyAttendance from '@/pages/attendance/DailyAttendance';
import EmployeePayslips from '@/pages/payslips/EmployeePayslips';
import HrPayslipEntry from '@/pages/hr/HrPayslipEntry';
import EmployeeExpenses from '@/pages/expenses/EmployeeExpenses';
import HrExpenses from '@/pages/hr/HrExpenses';
import Startup from '@/pages/Startup';
import CalendarView from '@/pages/CalendarView';
import ItDeclaration from '@/pages/it/ItDeclaration';
import HrShifts from '@/pages/hr/HrShifts';
import LiveMapOla from "./pages/hr/LiveMapOla";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* Leave - employee */}
            <Route
              path="/leave/apply"
              element={
                <ProtectedRoute>
                  <ApplyLeave />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave/balance"
              element={
                <ProtectedRoute>
                  <LeaveBalance />
                </ProtectedRoute>
              }
            />

            {/* HR */}
            <Route
              path="/hr/leave-approvals"
              element={
                <ProtectedRoute>
                  <HrLeaveApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <Tickets />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hr/ticket-approvals"
              element={
                <ProtectedRoute>
                  <HrTicketApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/punch"
              element={
                <ProtectedRoute>
                  <Punch />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/in-out"
              element={
                <ProtectedRoute>
                  <InOutReport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance/daily-report"
              element={
                <ProtectedRoute>
                  <DailyAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payslips"
              element={
                <ProtectedRoute>
                  <EmployeePayslips />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hr/payslips/entry"
              element={
                <ProtectedRoute>
                  <HrPayslipEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/employee"
              element={
                <ProtectedRoute>
                  <EmployeeExpenses />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hr/expenses"
              element={
                <ProtectedRoute>
                  <HrExpenses />
                </ProtectedRoute>
              }
            />
            <Route
  path="/startup"
  element={
    <ProtectedRoute>
      <Startup />
    </ProtectedRoute>
  }
/>

<Route
  path="/calendar"
  element={
    <ProtectedRoute>
      <CalendarView />
    </ProtectedRoute>
  }
/>

<Route
  path="/it-declaration"
  element={
    <ProtectedRoute>
      <ItDeclaration />
    </ProtectedRoute>
  }
/>

<Route
  path="/hr/shifts"
  element={
    <ProtectedRoute>
      <HrShifts />
    </ProtectedRoute>
  }
/>

<Route
  path="/hr/live-map-ola"
  element={
    <ProtectedRoute>
      <LiveMapOla />
    </ProtectedRoute>
  }
/>  


          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
