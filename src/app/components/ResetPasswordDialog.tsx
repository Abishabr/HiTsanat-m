/**
 * ResetPasswordDialog.tsx
 *
 * Modal dialog for resetting the password of an existing Supabase Auth user.
 * Accepts newPassword and confirmPassword fields, validates complexity and
 * match, then calls the admin Edge Function.
 *
 * Feature: supabase-auth-user-creation
 */

import { useState, useEffect } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { callAdminFunction } from '../lib/adminApi';
import { validatePassword, getPasswordErrors } from '../lib/validation';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUserId: string;
  memberName: string;
}

interface FormState {
  newPassword: string;
  confirmPassword: string;
}

interface FieldErrors {
  newPassword?: string[];
  confirmPassword?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ResetPasswordDialog({
  open,
  onOpenChange,
  authUserId,
  memberName,
}: ResetPasswordDialogProps) {
  const [form, setForm] = useState<FormState>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset form state when dialog closes
  useEffect(() => {
    if (!open) {
      setForm({ newPassword: '', confirmPassword: '' });
      setErrors({});
      setIsLoading(false);
    }
  }, [open]);

  // ── Validation ────────────────────────────────────────────────────────

  function validateForm(): boolean {
    const newErrors: FieldErrors = {};

    // Password complexity
    const pwdErrors = getPasswordErrors(form.newPassword);
    if (pwdErrors.length > 0) {
      newErrors.newPassword = pwdErrors;
    }

    // Passwords match
    if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit handler ────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await callAdminFunction('update_password', {
        auth_user_id: authUserId,
        new_password: form.newPassword,
      });

      if (error) {
        toast.error(error);
        // Keep form values populated (do not reset)
        return;
      }

      toast.success(`Password reset successfully for ${memberName}`);
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
            <KeyRound className="w-5 h-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for{' '}
            <span className="font-medium text-foreground">{memberName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={e => {
                setForm(prev => ({ ...prev, newPassword: e.target.value }));
                if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: undefined }));
              }}
              disabled={isLoading}
              aria-invalid={!!errors.newPassword}
              aria-describedby={errors.newPassword ? 'new-password-errors' : undefined}
            />
            {errors.newPassword && errors.newPassword.length > 0 && (
              <ul
                id="new-password-errors"
                className="space-y-0.5"
                aria-label="Password requirements"
              >
                {errors.newPassword.map(err => (
                  <li key={err} className="text-sm text-destructive">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={e => {
                setForm(prev => ({ ...prev, confirmPassword: e.target.value }));
                if (errors.confirmPassword)
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
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
              {isLoading ? 'Resetting…' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
