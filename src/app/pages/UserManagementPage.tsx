/**
 * UserManagementPage.tsx
 *
 * Admin page for managing Supabase Auth accounts for ministry members.
 * Displays two tabs:
 *   - Unlinked Members: members with auth_user_id IS NULL
 *   - Linked Members:   members with auth_user_id IS NOT NULL
 *
 * Access is restricted to chairperson, vice-chairperson, and secretary.
 * "Create Account" is restricted to chairperson only.
 *
 * Feature: supabase-auth-user-creation
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Search, Loader2, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessUserManagement, canCreateAuthAccounts } from '../lib/permissions';
import { supabase } from '../../lib/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CreateAccountDialog } from '../components/CreateAccountDialog';
import { ResetPasswordDialog } from '../components/ResetPasswordDialog';
import { RoleAssignmentDialog } from '../components/RoleAssignmentDialog';

// ── Types ──────────────────────────────────────────────────────────────────

interface PageMember {
  member_id: string;
  full_name: string;
  email: string;
  auth_user_id: string | null;
  roles: Array<{
    id: string;
    is_active: boolean;
    role_name: string;
    hierarchy_level: number;
    sub_department_name: string;
  }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRoleBadgeColor(hierarchyLevel: number): string {
  if (hierarchyLevel === 1) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (hierarchyLevel === 2) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (hierarchyLevel === 3) return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * Normalise the raw Supabase join result into PageMember[].
 * The nested select returns member_sub_departments as an array of objects
 * with leadership_roles and sub_departments as nested objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMembers(rows: any[]): PageMember[] {
  return rows.map(row => {
    const msd: Array<{
      id: string;
      is_active: boolean;
      leadership_roles: { name: string; hierarchy_level: number } | null;
      sub_departments: { name: string } | null;
    }> = row.member_sub_departments ?? [];

    const roles = msd
      .filter(r => r.leadership_roles && r.sub_departments)
      .map(r => ({
        id: r.id,
        is_active: r.is_active,
        role_name: r.leadership_roles!.name,
        hierarchy_level: r.leadership_roles!.hierarchy_level,
        sub_department_name: r.sub_departments!.name,
      }));

    return {
      member_id: row.id,
      full_name: row.full_name,
      email: row.email ?? '',
      auth_user_id: row.auth_user_id ?? null,
      roles,
    };
  });
}

/**
 * Case-insensitive filter on full_name or email.
 * Property 10: search filter is exact.
 */
export function filterMembers(members: PageMember[], searchTerm: string): PageMember[] {
  if (!searchTerm.trim()) return members;
  const lower = searchTerm.toLowerCase();
  return members.filter(
    m =>
      m.full_name.toLowerCase().includes(lower) ||
      m.email.toLowerCase().includes(lower),
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── 8.1 Access guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !canAccessUserManagement(user.role)) {
      navigate('/');
    }
  }, [user, navigate]);

  // ── Data state ──────────────────────────────────────────────────────────
  const [unlinkedMembers, setUnlinkedMembers] = useState<PageMember[]>([]);
  const [linkedMembers, setLinkedMembers] = useState<PageMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── 8.3 Search state ────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');

  // ── Dialog state ────────────────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState<PageMember | null>(null);

  // ── 8.8 Role-assignment skip warning state ──────────────────────────────
  const [lastCreatedMemberId, setLastCreatedMemberId] = useState<string | null>(null);
  const [roleAssignmentSkipped, setRoleAssignmentSkipped] = useState(false);
  // Track whether onRoleChanged was called during the current RoleAssignmentDialog session
  const [roleWasAssigned, setRoleWasAssigned] = useState(false);

  // ── 8.2 Data loading ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const MEMBER_SELECT = `
      id,
      full_name,
      email,
      auth_user_id,
      member_sub_departments!left (
        id,
        is_active,
        leadership_roles ( name, hierarchy_level ),
        sub_departments ( name )
      )
    `;

    const [unlinkedResult, linkedResult] = await Promise.all([
      supabase
        .from('members')
        .select(MEMBER_SELECT)
        .is('auth_user_id', null)
        .order('full_name'),
      supabase
        .from('members')
        .select(MEMBER_SELECT)
        .not('auth_user_id', 'is', null)
        .order('full_name'),
    ]);

    if (unlinkedResult.error || linkedResult.error) {
      const msg =
        unlinkedResult.error?.message ??
        linkedResult.error?.message ??
        'Failed to load members';
      setLoadError(msg);
      setIsLoading(false);
      return;
    }

    setUnlinkedMembers(normaliseMembers(unlinkedResult.data ?? []));
    setLinkedMembers(normaliseMembers(linkedResult.data ?? []));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── 8.3 Filtered lists (client-side) ────────────────────────────────────
  const filteredUnlinked = filterMembers(unlinkedMembers, searchTerm);
  const filteredLinked = filterMembers(linkedMembers, searchTerm);

  // ── Dialog handlers ──────────────────────────────────────────────────────

  function handleCreateAccountClick(member: PageMember) {
    setSelectedMember(member);
    setCreateDialogOpen(true);
  }

  function handleResetPasswordClick(member: PageMember) {
    setSelectedMember(member);
    setResetDialogOpen(true);
  }

  // ── 8.7 CreateAccountDialog → onSuccess → open RoleAssignmentDialog ─────
  function handleCreateSuccess(memberId: string) {
    setLastCreatedMemberId(memberId);
    setRoleAssignmentSkipped(false);
    setRoleWasAssigned(false);
    setRoleDialogOpen(true);
    // 8.10 Refresh lists after successful creation
    loadData();
  }

  // ── 8.8 RoleAssignmentDialog close handler ───────────────────────────────
  function handleRoleDialogOpenChange(open: boolean) {
    if (!open) {
      // Dialog is closing — check if a role was assigned
      if (!roleWasAssigned) {
        setRoleAssignmentSkipped(true);
      }
      setLastCreatedMemberId(null);
    }
    setRoleDialogOpen(open);
  }

  function handleRoleChanged() {
    setRoleWasAssigned(true);
    setRoleAssignmentSkipped(false);
    // 8.10 Refresh lists after role assignment
    loadData();
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  const canCreate = user ? canCreateAuthAccounts(user.role) : false;

  function renderRoleBadges(roles: PageMember['roles']) {
    const activeRoles = roles.filter(r => r.is_active);
    if (activeRoles.length === 0) {
      return <span className="text-xs text-muted-foreground">No roles</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {activeRoles.map((r, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className={`text-xs ${getRoleBadgeColor(r.hierarchy_level)}`}
          >
            {r.sub_department_name} — {r.role_name}
          </Badge>
        ))}
      </div>
    );
  }

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Failed to load member data: {loadError}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage Supabase Auth accounts for ministry members
        </p>
      </div>

      {/* 8.8 Role-assignment skip warning */}
      {roleAssignmentSkipped && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            This user will not be able to log in until a leadership role is assigned.
          </AlertDescription>
        </Alert>
      )}

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="unlinked">
        <TabsList>
          <TabsTrigger value="unlinked" className="gap-2">
            <UserX className="w-4 h-4" />
            Unlinked Members
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredUnlinked.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="linked" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Linked Members
            <Badge variant="secondary" className="ml-1 text-xs">
              {filteredLinked.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── 8.4 Unlinked Members tab ── */}
        <TabsContent value="unlinked" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Members without login accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 8.6 Empty state */}
              {filteredUnlinked.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">All members have login accounts</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">No unlinked members match your search.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredUnlinked.map(member => (
                    <div
                      key={member.member_id}
                      className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium text-foreground truncate">
                          {member.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email || '—'}
                        </p>
                        {renderRoleBadges(member.roles)}
                      </div>
                      {/* 8.4 Show "Create Account" only if canCreateAuthAccounts */}
                      {canCreate && (
                        <Button
                          size="sm"
                          onClick={() => handleCreateAccountClick(member)}
                          className="shrink-0"
                        >
                          Create Account
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 8.5 Linked Members tab ── */}
        <TabsContent value="linked" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Members with login accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLinked.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <UserX className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No linked members found</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">No linked members match your search.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredLinked.map(member => (
                    <div
                      key={member.member_id}
                      className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium text-foreground truncate">
                          {member.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email || '—'}
                        </p>
                        {/* 8.5 Truncated auth_user_id */}
                        {member.auth_user_id && (
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {member.auth_user_id.slice(0, 8)}…
                          </p>
                        )}
                        {renderRoleBadges(member.roles)}
                      </div>
                      {/* 8.5 "Reset Password" visible to all admin roles */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPasswordClick(member)}
                        className="shrink-0"
                      >
                        Reset Password
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── 8.7 CreateAccountDialog ── */}
      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        selectedMember={
          selectedMember
            ? {
                id: selectedMember.member_id,
                email: selectedMember.email,
                full_name: selectedMember.full_name,
              }
            : null
        }
        onSuccess={handleCreateSuccess}
      />

      {/* ── 8.7 RoleAssignmentDialog (opened after successful account creation) ── */}
      <RoleAssignmentDialog
        memberId={lastCreatedMemberId}
        memberName={
          // Try to find the member name from either list
          (lastCreatedMemberId
            ? [...unlinkedMembers, ...linkedMembers].find(
                m => m.member_id === lastCreatedMemberId,
              )?.full_name
            : undefined) ?? ''
        }
        open={roleDialogOpen}
        onOpenChange={handleRoleDialogOpenChange}
        onRoleChanged={handleRoleChanged}
      />

      {/* ── 8.9 ResetPasswordDialog ── */}
      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        authUserId={selectedMember?.auth_user_id ?? ''}
        memberName={selectedMember?.full_name ?? ''}
      />
    </div>
  );
}
