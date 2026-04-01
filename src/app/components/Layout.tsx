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
  GraduationCap,
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

const ALL_NAV = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: 'all' },
  { name: 'Children', href: '/children', icon: Users, roles: 'all' },
  { name: 'Members', href: '/members', icon: UserCog, roles: 'all' },
  { name: 'Weekly Programs', href: '/weekly-programs', icon: Calendar, roles: 'all' },
  { name: 'Events', href: '/events', icon: PartyPopper, roles: 'all' },
  { name: 'Member Activities', href: '/member-activities', icon: Briefcase, roles: 'all' },
  { name: 'Timhert Academic', href: '/timhert', icon: GraduationCap, roles: 'all' },
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

  const isKuttr = userRole === 'subdept-leader' && userSubDept === 'Kuttr';
  const isChairperson = userRole !== 'subdept-leader' && userRole !== 'member';

  const navigation = ALL_NAV.filter(item => {
    if (item.roles === 'all') return true;
    if (item.roles === 'kuttr-chairperson') return isKuttr || isChairperson;
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">HK</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">Hitsanat KFL</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
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
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Sub-departments — only visible to subdept-leaders */}
            {userRole === 'subdept-leader' && (
            <div className="mt-8">
              <h3 className="px-4 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sub-Departments
              </h3>
              <ul className="space-y-1" data-testid="subdept-nav">
                {subDepartments.filter(sd => sd.name === userSubDept).map((dept) => (
                  <li key={dept.id}>
                    <Link
                      to={`/subdepartment/${dept.id}`}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="text-sm">{getSubDeptDisplayName(dept.name)}</span>
                      <span className="ml-auto text-xs text-gray-500">{dept.memberCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
              <Avatar>
                <AvatarFallback className="bg-blue-600 text-white">
                  {userName.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
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
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
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
                      <p className="text-xs text-gray-500">{userEmail}</p>
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
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
