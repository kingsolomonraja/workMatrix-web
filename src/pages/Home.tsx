import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ClipboardList, 
  FileText, 
  Clock, 
  Ticket, 
  DollarSign,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  Users,
  CreditCard,
  ShieldCheck,
  MapPin,
  Sun,
  Moon
} from 'lucide-react';
import { useState } from 'react';

const employeeCards = [
  { title: 'Startup', icon: LayoutDashboard, route: '/startup', iconColor: 'text-purple-600' },
  { title: 'Punch', icon: Clock, route: '/punch', iconColor: 'text-orange-600' },
  { title: 'Apply Leave', icon: FileText, route: '/leave/apply', iconColor: 'text-cyan-600' },
  { title: 'Leave Balance', icon: ClipboardList, route: '/leave/balance', iconColor: 'text-pink-600' },
  { title: 'Calendar', icon: Calendar, route: '/calendar', iconColor: 'text-green-600' },
  { title: 'Tickets', icon: Ticket, route: '/tickets', iconColor: 'text-blue-600' },
  { title: 'Payslip', icon: DollarSign, route: '/payslips', iconColor: 'text-yellow-600' },
  { title: 'In Out Report', icon: FileText, route: '/attendance/in-out', iconColor: 'text-red-600' },
  { title: 'IT Declaration', icon: ShieldCheck, route: '/it-declaration', iconColor: 'text-indigo-600' },
  { title: 'Attendance Regularisation', icon: Settings, route: '/attendance/regularisation', iconColor: 'text-teal-600' },
  { title: 'Daily Attendance', icon: Calendar, route: '/attendance/daily-report', iconColor: 'text-violet-600' },
  { title: 'Expense Claim', icon: CreditCard, route: '/expenses/employee', iconColor: 'text-rose-600' },
];

const hrCards = [
  { title: 'HR Leave Approval', icon: ClipboardList, route: '/hr/leave-approvals', iconColor: 'text-emerald-600' },
  { title: 'HR Ticket Approval', icon: Ticket, route: '/hr/ticket-approvals', iconColor: 'text-amber-600' },
  { title: 'HR Payslip Entry', icon: DollarSign, route: '/hr/payslips/entry', iconColor: 'text-fuchsia-600' },
  { title: 'Change Shift', icon: Settings, route: '/hr/shifts', iconColor: 'text-lime-600' },
  { title: 'Expense Overview', icon: CreditCard, route: '/hr/expenses', iconColor: 'text-sky-600' },
  { title: 'Attendance Regularisation', icon: Settings, route: '/hr/attendance-regularisation', iconColor: 'text-teal-600' },
  { title: 'Live Map', icon: MapPin, route: '/hr/live-map-ola', iconColor: 'text-sky-600' },
];

export default function Home() {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const cards = profile?.role === 'hr' ? [...employeeCards, ...hrCards] : employeeCards;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Home</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Side Menu Overlay */}
      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{profile?.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile?.employeeId}</p>
                </div>
              </div>

              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/home'); setMenuOpen(false); }}>
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Home
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/startup'); setMenuOpen(false); }}>
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Startup
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                  <Users className="w-5 h-5 mr-3" />
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="p-4 pb-20">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">Welcome, {profile?.name}</h2>
          <p className="text-muted-foreground">
            {profile?.role === 'hr' ? 'HR Dashboard' : 'Employee Dashboard'}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <button
              key={card.route}
              onClick={() => navigate(card.route)}
              className="bg-card border border-border rounded-2xl p-6 hover:scale-105 transition-all duration-300 hover:shadow-lg active:scale-95"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                  <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                </div>
                <span className="text-sm font-medium text-foreground">{card.title}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
