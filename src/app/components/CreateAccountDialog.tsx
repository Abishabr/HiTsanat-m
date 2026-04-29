/**
 * CreateAccountDialog.tsx
 *
 * Modal dialog for creating a Supabase Auth account for a ministry member.
 * Supports two modes:
 *   - "Link Existing Member": pre-fills email from the selected member, accepts password only.
 *   - "Create New Member": accepts full_name, email, and password.
 *
 * Feature: supabase-auth-user-creation
 */

import { useState, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { callAdminFunction } from '../lib/adminApi';
import { validateEmail, validatePassword, getPasswordErrors } from '../lib/validation';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMember: { id: string; email: string; full_name: string } | null;
  onSuccess: (memberId: string) => void;
}

type TabMode = 'link' | 'create';

interface LinkFormState {
  email: string;
  password: string;
}

interface CreateFormState {
  full_name: string;
  email: string;
  password: string;
}

interface FieldErrors {
  email?: string;
  password?: string[];
  full_name?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if the error string indicates a duplicate / already-registered email.
 * Covers Supabase error messages and common variants.
 */
function isEmailAlreadyRegisteredError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already registered') ||
    lower.includes('email address is already') ||
    lower.includes('duplicate') ||
    lower.includes('unique constraint')
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function CreateAccountDialog({
  open,
  onOpenChange,
  selectedMember,
  onSuccess,
}: CreateAccountDialogProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('link');
  const [isLoading, setIsLoading] = useState(false);

  // Link mode form state
  const [linkForm, setLinkForm] = useState<LinkFormState>({ email: '', password: '' });
  const [linkErrors, setLinkErrors] = useState<FieldErrors>({});

  // Create mode form state
  const [createForm, setCreateForm] = useState<CreateFormState>({
    full_name: '',
    email: '',
    password: '',
  });
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});

  // Pre-fill email from selected member when dialog opens or member changes
  useEffect(() => {
    if (open && selectedMember) {
      setLinkForm(prev => ({ ...prev, email: selectedMember.email }));
    }
  }, [open, selectedMember]);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveTab('link');
      setLinkForm({ email: '', password: '' });
      setLinkErrors({});
      setCreateForm({ full_name: '', email: '', password: '' });
      setCreateErrors({});
      setIsLoading(false);
    }
  }, [open]);

  // ── Validation ────────────────────────────────────────────────────────

  function validateLinkForm(): boolean {
    const errors: FieldErrors = {};

    if (!linkForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(linkForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    const pwdErrors = getPasswordErrors(linkForm.password);
    if (pwdErrors.length > 0) {
      errors.password = pwdErrors;
    }

    setLinkErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateCreateForm(): boolean {
    const errors: FieldErrors = {};

    if (!createForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!createForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(createForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    const pwdErrors = getPasswordErrors(createForm.password);
    if (pwdErrors.length > 0) {
      errors.password = pwdErrors;
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit handlers ───────────────────────────────────────────────────

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateLinkForm()) return;
    if (!selectedMember) return;

    setIsLoading(true);
    try {
      const { error } = await callAdminFunction('create_user', {
        email: linkForm.email.trim(),
        password: linkForm.password,
      });

      if (error) {
        if (isEmailAlreadyRegisteredError(error)) {
          toast.error(
            'This email is already registered. Use a different email or link the existing account.',
          );
        } else {
          toast.error(error);
        }
        // Keep form values populated (do not reset)
        return;
      }

      toast.success('Account created and linked successfully');
      onSuccess(selectedMember.id);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await callAdminFunction<{ auth_user_id: string }>('create_user', {
        email: createForm.email.trim(),
        password: createForm.password,
        full_name: createForm.full_name.trim(),
      });

      if (error) {
        if (isEmailAlreadyRegisteredError(error)) {
          toast.error('This email is already registered.');
        } else {
          toast.error(error);
        }
        // Keep form values populated (do not reset)
        return;
      }

      if (!data?.auth_user_id) {
        toast.error('Account created but could not retrieve user ID. Please refresh.');
        onOpenChange(false);
        return;
      }

      // Query members table to get the new member's id (trigger creates the row)
      const { data: memberRows, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('auth_user_id', data.auth_user_id)
        .limit(1);

      if (memberError || !memberRows || memberRows.length === 0) {
        toast.error('Account created but could not find the new member record. Please refresh.');
        onOpenChange(false);
        return;
      }

      toast.success(`Account created for ${createForm.full_name.trim()}`);
      onSuccess(memberRows[0].id as string);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Create Account
          </DialogTitle>
          <DialogDescription>
            Create a Supabase Auth login account for a ministry member.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1">
              Link Existing Member
            </TabsTrigger>
            <TabsTrigger value="create" className="flex-1">
              Create New Member
            </TabsTrigger>
          </TabsList>

          {/* ── Link Existing Member tab ── */}
          <TabsContent value="link">
            <form onSubmit={handleLinkSubmit} noValidate className="space-y-4 pt-2">
              {selectedMember && (
                <p className="text-sm text-muted-foreground">
                  Creating account for{' '}
                  <span className="font-medium text-foreground">{selectedMember.full_name}</span>
                </p>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="link-email">Email</Label>
                <Input
                  id="link-email"
                  type="email"
                  autoComplete="email"
                  value={linkForm.email}
                  onChange={e => {
                    setLinkForm(prev => ({ ...prev, email: e.target.value }));
                    if (linkErrors.email) setLinkErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!linkErrors.email}
                  aria-describedby={linkErrors.email ? 'link-email-error' : undefined}
                />
                {linkErrors.email && (
                  <p id="link-email-error" className="text-sm text-destructive">
                    {linkErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="link-password">Password</Label>
                <Input
                  id="link-password"
                  type="password"
                  autoComplete="new-password"
                  value={linkForm.password}
                  onChange={e => {
                    setLinkForm(prev => ({ ...prev, password: e.target.value }));
                    if (linkErrors.password)
                      setLinkErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!linkErrors.password}
                  aria-describedby={linkErrors.password ? 'link-password-errors' : undefined}
                />
                {linkErrors.password && linkErrors.password.length > 0 && (
                  <ul
                    id="link-password-errors"
                    className="space-y-0.5"
                    aria-label="Password requirements"
                  >
                    {linkErrors.password.map(err => (
                      <li key={err} className="text-sm text-destructive">
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Creating…' : 'Create Account'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ── Create New Member tab ── */}
          <TabsContent value="create">
            <form onSubmit={handleCreateSubmit} noValidate className="space-y-4 pt-2">
              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="create-full-name">Full Name</Label>
                <Input
                  id="create-full-name"
                  type="text"
                  autoComplete="name"
                  value={createForm.full_name}
                  onChange={e => {
                    setCreateForm(prev => ({ ...prev, full_name: e.target.value }));
                    if (createErrors.full_name)
                      setCreateErrors(prev => ({ ...prev, full_name: undefined }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!createErrors.full_name}
                  aria-describedby={createErrors.full_name ? 'create-full-name-error' : undefined}
                />
                {createErrors.full_name && (
                  <p id="create-full-name-error" className="text-sm text-destructive">
                    {createErrors.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  autoComplete="email"
                  value={createForm.email}
                  onChange={e => {
                    setCreateForm(prev => ({ ...prev, email: e.target.value }));
                    if (createErrors.email)
                      setCreateErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!createErrors.email}
                  aria-describedby={createErrors.email ? 'create-email-error' : undefined}
                />
                {createErrors.email && (
                  <p id="create-email-error" className="text-sm text-destructive">
                    {createErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  autoComplete="new-password"
                  value={createForm.password}
                  onChange={e => {
                    setCreateForm(prev => ({ ...prev, password: e.target.value }));
                    if (createErrors.password)
                      setCreateErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  disabled={isLoading}
                  aria-invalid={!!createErrors.password}
                  aria-describedby={createErrors.password ? 'create-password-errors' : undefined}
                />
                {createErrors.password && createErrors.password.length > 0 && (
                  <ul
                    id="create-password-errors"
                    className="space-y-0.5"
                    aria-label="Password requirements"
                  >
                    {createErrors.password.map(err => (
                      <li key={err} className="text-sm text-destructive">
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="gap-2">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Creating…' : 'Create Account'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
