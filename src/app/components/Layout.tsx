import { Outlet, Link, useLocation } from 'react-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  Calendar, 
  PartyPopper, 
  Briefcase,
  ClipboardCheck,
  BarChart3,
  Menu,
  X,
  LogOut,
  Settings,
  Bell,
  ChevronDown
} from 'lucide-react';
import { subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';

const ALL_NAV = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: 'all' },
  { name: 'Children', href: '/children', icon: Users, roles: 'all' },
  { name: 'Members', href: '/members', icon: UserCog, roles: 'all' },
  { name: 'Weekly Programs', href: '/weekly-programs', icon: Calendar, roles: 'all' },
  { name: 'Events', href: '/events', icon: PartyPopper, roles: 'all' },
  { name: 'Member Activities', href: '/member-activities', icon: Briefcase, roles: 'all' },
  { name: 'Attendance', href: '/attendance', icon: ClipboardCheck, roles: 'kuttr-chairperson' },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: 'all' },
] as const;

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();

  // Fall back to empty strings so the component never crashes before user is set
  const userName = user?.name ?? '';
  const userRole = user?.role ?? 'chairperson';
  const userSubDept = user?.subDepartment;
  const userEmail = user?.email ?? '';

  const { notifications, markNotificationsRead } = useSchedule();
  const unreadCount = notifications.filter(n => !n.read).length;

  const isKuttr = userRole === 'subdept-leader' && userSubDept === 'Kuttr';
  const isChairperson = userRole !== 'subdept-leader' && userRole !== 'member';

  const navigation = ALL_NAV.filter(item => {
    if (item.roles === 'all') return true;
    if (item.roles === 'kuttr-chairperson') return isKuttr || isChairperson;
    if (item.roles === 'chairperson') return isChairperson;
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'chairperson': 'Chairperson',
      'vice-chairperson': 'Vice Chairperson',
      'secretary': 'Secretary',
      'subdept-leader': 'Sub-Department Leader',
      'member': 'Member'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ backgroundColor: "#2c2c2c", borderColor: "#3d3d3d" }}
        className={`fixed top-0 left-0 z-50 h-full w-72 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-[#3d3d3d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5f0113, #f3c913)" }}>
                <span className="text-white font-bold text-lg">HK</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">Hitsanat KFL</h1>
                <p className="text-xs text-gray-400">Management System</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-[#3d3d3d] rounded-lg text-gray-300"
            >
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-[#5f0113] text-[#f3c913] font-medium'
                          : 'text-gray-300 hover:bg-[#3d3d3d]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-[#f3c913]' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Sub-departments — only visible to subdept-leaders */}
            {userRole === 'subdept-leader' && (
            <div className="mt-8">
              <h3 className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Sub-Departments
              </h3>
              <ul className="space-y-1" data-testid="subdept-nav">
                {subDepartments.filter(sd => sd.name === userSubDept).map((dept) => (
                  <li key={dept.id}>
                    <Link
                      to={`/subdepartment/${dept.id}`}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-300 hover:bg-[#3d3d3d] transition-colors"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="text-sm">{getSubDeptDisplayName(dept.name)}</span>
                      <span className="ml-auto text-xs text-gray-400">{dept.memberCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[#3d3d3d]">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#3d3d3d]">
              <Avatar>
                <AvatarFallback className="text-white" style={{ backgroundColor: "#5f0113" }}>
                  {userName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {getRoleDisplay(userRole)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-[#3d3d3d] rounded-lg text-gray-300"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Welcome back, {userName.split(' ')[0]}!
                </h2>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications — badge shows unread attendance reports for chairperson */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  if (isChairperson && unreadCount > 0) markNotificationsRead();
                }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Settings */}
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-white text-xs" style={{ backgroundColor: "#5f0113" }}>
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
                      <p className="text-xs text-gray-400">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
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
