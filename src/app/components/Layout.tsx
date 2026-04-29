import { Outlet, Link, useLocation } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, UserCog, Calendar, PartyPopper, 
  Briefcase, ClipboardCheck, BarChart3, Menu, X, LogOut,
  Settings, Bell, ChevronDown, CheckCircle2, AlertCircle,
  Moon, Sun, User, Lock, Save, Eye, EyeOff, ShieldCheck,
} from 'lucide-react';
import { getSubDeptDisplayName, SUBDEPT_COLORS } from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { getVisibleNav, ROLE_LABELS, UserRole } from '../lib/permissions';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from './ui/sheet';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { useTheme } from '../context/ThemeContext';
import { EthiopianDateTimeSidebar, EthiopianDateBadge } from './EthiopianDateTime';
import { Separator } from './ui/separator';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const ALL_NAV = [
  { name: 'Dashboard',         href: '/',                 icon: LayoutDashboard, key: 'dashboard' },
  { name: 'Children',          href: '/children',         icon: Users,           key: 'children' },
  { name: 'Members',           href: '/members',          icon: UserCog,         key: 'members' },
  { name: 'Weekly Programs',   href: '/weekly-programs',  icon: Calendar,        key: 'weekly-programs' },
  { name: 'Events',            href: '/events',           icon: PartyPopper,     key: 'events' },
  { name: 'Member Activities', href: '/member-activities',icon: Briefcase,       key: 'member-activities' },
  { name: 'Timhert Academic',  href: '/timhert',          icon: BarChart3,       key: 'timhert' },
  { name: 'Attendance',        href: '/attendance',       icon: ClipboardCheck,  key: 'attendance' },
  { name: 'Reports',           href: '/reports',          icon: BarChart3,       key: 'reports' },
  { name: 'User Management',   href: '/user-management',  icon: ShieldCheck,     key: 'user-management' },
] as const;

// ── Settings Panel ────────────────────────────────────────────────────────

function SettingsPanel({
  userName, userEmail, userRole, userSubDept,
  getRoleDisplay, theme, toggleTheme, logout,
}: {
  userName: string; userEmail: string; userRole: string;
  userSubDept?: string; getRoleDisplay: (r: string) => string;
  theme: string; toggleTheme: () => void; logout: () => void;
}) {
  const [displayName, setDisplayName] = useState(userName);
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { name: displayName.trim() } });
    setSavingName(false);
    if (error) toast.error('Failed to update name');
    else toast.success('Name updated');
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw !== confirmPw) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPw.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">

          {/* Profile avatar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-white text-sm" style={{ backgroundColor: '#0d7377' }}>
                {userName.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              <Badge variant="outline" className="text-xs mt-1">{getRoleDisplay(userRole)}</Badge>
            </div>
          </div>

          <Separator />

          {/* Edit display name */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <User className="w-3 h-3 inline mr-1" />Personal Info
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="h-8 px-2" onClick={handleSaveName} disabled={savingName || !displayName.trim()}>
                    {savingName ? '…' : <Save className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={userEmail} disabled className="h-8 text-sm opacity-60" />
              </div>
              {userSubDept && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Sub-Department</Label>
                  <Input value={getSubDeptDisplayName(userSubDept)} disabled className="h-8 text-sm opacity-60" />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Change password */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Lock className="w-3 h-3 inline mr-1" />Change Password
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="h-8 text-sm pr-8"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirm Password</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm" className="w-full h-8"
                onClick={handleChangePassword}
                disabled={savingPw || !newPw || !confirmPw}
              >
                {savingPw ? 'Saving…' : 'Update Password'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Appearance */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</p>
            <button onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm">Theme</span>
              </div>
              <span className="text-sm text-muted-foreground capitalize">{theme}</span>
            </button>
          </div>

          <Separator />

          {/* Sign out */}
          <button onClick={logout}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const userName = user?.name ?? '';
  const userRole = user?.role ?? 'chairperson';
  const userSubDept = user?.subDepartment;
  const userEmail = user?.email ?? '';

  const { notifications, markNotificationsRead, subDepts } = useSchedule();
  const unreadCount = notifications.filter(n => !n.read).length;
  const canSeeNotifications = userRole === 'chairperson' || userRole === 'vice-chairperson' || userRole === 'secretary';

  const visibleKeys = getVisibleNav(userRole as UserRole, userSubDept);
  const navigation = ALL_NAV.filter(item => visibleKeys.includes(item.key));

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const getRoleDisplay = (role: string) => ROLE_LABELS[role as UserRole] ?? role;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 bg-sidebar border-sidebar-border ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f3c912, #f5d842)' }}>
                <span className="font-bold text-lg" style={{ color: '#5f0113' }}>HK</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">Hitsanat KFL</h1>
                <p className="text-xs text-white/50">Management System</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg text-white/70">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'text-white/80 hover:bg-sidebar-accent hover:text-white'}`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-sidebar-primary-foreground' : 'text-white/50'}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Sub-departments */}
            {(userRole === 'subdept-leader' || userRole === 'subdept-vice-leader') && (
              <div className="mt-8">
                <h3 className="px-4 mb-3 text-xs font-semibold text-white/50 uppercase tracking-wider">Sub-Departments</h3>
                <ul className="space-y-1" data-testid="subdept-nav">
                  {(() => {
                    const liveMatch = subDepts.find(sd => sd.name === userSubDept);
                    const deptId = liveMatch?.id;
                    const deptColor = SUBDEPT_COLORS[userSubDept ?? ''] ?? '#f3c912';
                    if (!deptId || !userSubDept) return null;
                    return (
                      <li key={deptId}>
                        <Link to={`/subdepartment/${deptId}`} onClick={() => setSidebarOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 rounded-lg text-white/80 hover:bg-sidebar-accent hover:text-white transition-colors">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: deptColor }} />
                          <span className="text-sm">{getSubDeptDisplayName(userSubDept)}</span>
                        </Link>
                      </li>
                    );
                  })()}
                </ul>
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <EthiopianDateTimeSidebar />
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
              <Avatar>
                <AvatarFallback className="text-sidebar-primary-foreground font-semibold" style={{ backgroundColor: 'hsl(var(--sidebar-primary))' }}>
                  {userName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-white/50 truncate">{getRoleDisplay(userRole)}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-muted rounded-lg text-muted-foreground">
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden sm:block">
                <h2 className="text-lg font-bold text-foreground">Welcome back, {userName.split(' ')[0]}!</h2>
                <EthiopianDateBadge />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" onClick={() => { if (canSeeNotifications && unreadCount > 0) markNotificationsRead(); }}>
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && <Badge variant="outline" className="text-xs">{unreadCount} new</Badge>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    notifications.slice(0, 8).map(n => (
                      <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-3 cursor-default">
                        <div className="flex items-center gap-2 w-full">
                          {n.read
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          }
                          <span className="text-sm font-medium">Attendance — {n.day} {n.date}</span>
                          {!n.read && <Badge className="ml-auto text-[10px] px-1 py-0 bg-blue-100 text-blue-700">New</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          {n.presentCount} present · {n.absentCount} absent · {n.totalCount} total
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Language toggle */}
              <LanguageToggle />

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Settings */}
              <SettingsPanel
                userName={userName}
                userEmail={userEmail}
                userRole={userRole}
                userSubDept={userSubDept}
                getRoleDisplay={getRoleDisplay}
                theme={theme}
                toggleTheme={toggleTheme}
                logout={logout}
              />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden sm:flex">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-white text-xs" style={{ backgroundColor: '#0d7377' }}>
                        {userName.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 bg-background text-foreground">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
