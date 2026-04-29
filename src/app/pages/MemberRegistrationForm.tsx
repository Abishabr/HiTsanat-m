import { useState, useEffect } from 'react';
import { User, Phone, Mail, MessageCircle, BookOpen, Shield, Home, FileText } from 'lucide-react';
import { StepWizard, StepNav } from '../components/StepWizard';
import { getSubDeptDisplayName } from '../lib/subDeptUtils';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

const FIELD      = 'flex flex-col gap-1';
const LABEL      = 'text-sm font-medium text-foreground';
const INPUT      = 'w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all';
const ICON_WRAP  = 'relative';
const ICON       = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground';
const INPUT_ICON = 'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all';
const TEXTAREA   = 'w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all resize-none';

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-2 border-b border-border">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

// Column → step mapping (auto-set columns excluded: id, created_at, updated_at, status, join_date, auth_user_id, profile_photo_url)
// Step 0 — Personal:   full_name*, baptismal_name, gender, date_of_birth
// Step 1 — Education:  campus, university_year, university_department, building_name, dorm_name
// Step 2 — Contact:    phone, email*, telegram_username
// Step 3 — Sub-dept:   sub-department assignment (member_sub_departments)
// Step 4 — Notes:      notes, medical_notes

export default function MemberRegistrationForm() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const CAMPUSES = [
    { value: 'Main',    label: t('memberRegistration.options.campuses.main') },
    { value: 'Gendeje', label: t('memberRegistration.options.campuses.gendeje') },
    { value: 'Station', label: t('memberRegistration.options.campuses.station') },
  ];

  const getTranslatedSubDeptName = (name: string): string => {
    const key = name.toLowerCase().replace(/[^a-z]/g, '');
    const map: Record<string, string> = {
      mezmur:    t('memberRegistration.options.subDepts.mezmur'),
      kinetibeb: t('memberRegistration.options.subDepts.kinetibeb'),
      kuttr:     t('memberRegistration.options.subDepts.kuttr'),
      timhert:   t('memberRegistration.options.subDepts.timhert'),
    };
    return map[key] ?? getSubDeptDisplayName(name);
  };

  const YEARS = translations[language].memberRegistration.options.years;

  const STEPS = [
    { label: t('memberRegistration.steps.personal') },
    { label: t('memberRegistration.steps.campus') },
    { label: t('memberRegistration.steps.contact') },
    { label: t('memberRegistration.steps.kehnet') },
    { label: 'Notes' },
  ];

  const [step, setStep]         = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [subDepts, setSubDepts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from('sub_departments')
      .select('id, name')
      .neq('name', 'Department')
      .order('name')
      .then(({ data }) => setSubDepts(data ?? []));
  }, []);

  const emptyForm = {
    // Step 0 — Personal
    givenName: '',      // → full_name (combined with fatherName)
    fatherName: '',     // → full_name
    spiritualName: '',  // → baptismal_name
    gender: '',         // → gender
    dob: '',            // → date_of_birth
    // Step 1 — Education
    campus: '',                 // → campus
    yearOfStudy: '',            // → university_year
    department: '',             // → university_department
    buildingName: '',           // → building_name
    dormName: '',               // → dorm_name
    // Step 2 — Contact
    phone: '',                  // → phone
    email: '',                  // → email (NOT NULL)
    telegram: '',               // → telegram_username
    // Step 3 — Sub-dept
    subDepts: [] as string[],
    // Step 4 — Notes
    notes: '',                  // → notes
    medicalNotes: '',           // → medical_notes
  };

  const [form, setForm] = useState(emptyForm);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const toggleSubDept = (name: string) => setForm(p => ({
    ...p,
    subDepts: p.subDepts.includes(name)
      ? p.subDepts.filter(x => x !== name)
      : [...p.subDepts, name],
  }));

  const handleSubmit = async () => {
    if (!form.givenName.trim() || !form.fatherName.trim()) {
      toast.error(t('memberRegistration.messages.errorNameRequired'));
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!form.gender) {
      toast.error(t('memberRegistration.messages.errorGenderRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const fullName = [form.givenName.trim(), form.fatherName.trim()].join(' ');

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          full_name:             fullName,
          baptismal_name:        form.spiritualName  || null,
          gender:                form.gender         || null,
          date_of_birth:         form.dob            || null,
          campus:                form.campus         || null,
          university_year:       form.yearOfStudy    || null,
          university_department: form.department     || null,
          building_name:         form.buildingName   || null,
          dorm_name:             form.dormName       || null,
          phone:                 form.phone          || null,
          email:                 form.email.trim(),
          telegram_username:     form.telegram       || null,
          notes:                 form.notes          || null,
          medical_notes:         form.medicalNotes   || null,
          status:                'active',
          join_date:             new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (memberError) {
        console.error('[MemberRegistrationForm:insert]', memberError);
        toast.error(`Registration failed: ${memberError.message}`);
        return;
      }

      const memberId = memberData.id;

      if (form.subDepts.length > 0) {
        const { data: memberRole } = await supabase
          .from('leadership_roles')
          .select('id')
          .eq('name', 'Member')
          .single();

        if (memberRole) {
          const { data: subDeptData } = await supabase
            .from('sub_departments')
            .select('id, name')
            .in('name', form.subDepts);

          if (subDeptData?.length) {
            await supabase.from('member_sub_departments').insert(
              subDeptData.map(sd => ({
                member_id:         memberId,
                sub_department_id: sd.id,
                role_id:           memberRole.id,
                is_active:         true,
              }))
            );
          }
        }
      }

      toast.success(t('memberRegistration.messages.success'));
      setStep(0);
      setForm(emptyForm);
      navigate('/members');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Registration failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepWizard steps={STEPS} current={step} title={t('memberRegistration.title')} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">

          {/* ── Step 0: Personal ── */}
          {step === 0 && (
            <div className="space-y-4">
              <SectionTitle icon={User} title={t('memberRegistration.sections.personalInfo')} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['givenName',    t('memberRegistration.fields.givenName.label'),    t('memberRegistration.fields.givenName.placeholder')],
                  ['fatherName',   t('memberRegistration.fields.fatherName.label'),   t('memberRegistration.fields.fatherName.placeholder')],
                  ['spiritualName',t('memberRegistration.fields.spiritualName.label'),t('memberRegistration.fields.spiritualName.placeholder')],
                ] as [string, string, string][]).map(([k, l, ph]) => (
                  <div key={k} className={FIELD}>
                    <label className={LABEL}>{l}</label>
                    <div className={ICON_WRAP}>
                      <User className={ICON} />
                      <input
                        className={INPUT_ICON}
                        placeholder={ph}
                        value={(form as Record<string, string>)[k]}
                        onChange={e => set(k, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.gender.label')}</label>
                <div className="flex gap-6 mt-1">
                  {(['Male', 'Female'] as const).map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio" name="gender" value={g}
                        checked={form.gender === g}
                        onChange={() => set('gender', g)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        {g === 'Male' ? t('common.male') : t('common.female')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.dob.label')}</label>
                <EthiopianDatePicker
                  value={form.dob}
                  onChange={v => set('dob', v)}
                  label={t('memberRegistration.fields.dob.label')}
                  lang={language}
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Education ── */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle icon={BookOpen} title={t('memberRegistration.sections.campusEducation')} />

              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.campus.label')}</label>
                <select className={INPUT} value={form.campus} onChange={e => set('campus', e.target.value)}>
                  <option value="">{t('memberRegistration.fields.campus.selectPlaceholder')}</option>
                  {CAMPUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.yearOfStudy.label')}</label>
                <select className={INPUT} value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                  <option value="">{t('memberRegistration.fields.yearOfStudy.selectPlaceholder')}</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.department.label')}</label>
                <input
                  className={INPUT}
                  placeholder={t('memberRegistration.fields.department.placeholder')}
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={FIELD}>
                  <label className={LABEL}>Building Name</label>
                  <div className={ICON_WRAP}>
                    <Home className={ICON} />
                    <input
                      className={INPUT_ICON}
                      placeholder="e.g. Block A"
                      value={form.buildingName}
                      onChange={e => set('buildingName', e.target.value)}
                    />
                  </div>
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Dorm / Room</label>
                  <div className={ICON_WRAP}>
                    <Home className={ICON} />
                    <input
                      className={INPUT_ICON}
                      placeholder="e.g. Room 204"
                      value={form.dormName}
                      onChange={e => set('dormName', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Contact ── */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon={Phone} title={t('memberRegistration.sections.contactInfo')} />
              {[
                { k: 'phone',    l: t('memberRegistration.fields.phone.label'),    Icon: Phone,         type: 'tel',   ph: t('memberRegistration.fields.phone.placeholder'),    req: false },
                { k: 'email',    l: t('memberRegistration.fields.email.label'),    Icon: Mail,          type: 'email', ph: t('memberRegistration.fields.email.placeholder'),    req: true  },
                { k: 'telegram', l: t('memberRegistration.fields.telegram.label'), Icon: MessageCircle, type: 'text',  ph: t('memberRegistration.fields.telegram.placeholder'), req: false },
              ].map(({ k, l, Icon, type, ph, req }) => (
                <div key={k} className={FIELD}>
                  <label className={LABEL}>
                    {l}{req && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <div className={ICON_WRAP}>
                    <Icon className={ICON} />
                    <input
                      type={type}
                      className={INPUT_ICON}
                      placeholder={ph}
                      value={(form as Record<string, string>)[k]}
                      onChange={e => set(k, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 3: Sub-department ── */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle icon={Shield} title={t('memberRegistration.sections.kehnetRole')} />

              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.subDepartments.label')}</label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('memberRegistration.fields.subDepartments.helper')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {subDepts.map(sd => {
                    const checked = form.subDepts.includes(sd.name);
                    return (
                      <label
                        key={sd.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          checked ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSubDept(sd.name)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className={`text-sm font-medium ${checked ? 'text-primary' : 'text-foreground'}`}>
                          {getTranslatedSubDeptName(sd.name)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Notes ── */}
          {step === 4 && (
            <div className="space-y-4">
              <SectionTitle icon={FileText} title="Notes" />

              <div className={FIELD}>
                <label className={LABEL}>General Notes</label>
                <textarea
                  className={TEXTAREA}
                  rows={3}
                  placeholder="Any additional notes about this member…"
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>

              <div className={FIELD}>
                <label className={LABEL}>Medical Notes</label>
                <textarea
                  className={TEXTAREA}
                  rows={3}
                  placeholder="Allergies, conditions, or other medical information…"
                  value={form.medicalNotes}
                  onChange={e => set('medicalNotes', e.target.value)}
                />
              </div>
            </div>
          )}

          <StepNav
            step={step}
            total={STEPS.length}
            onBack={() => setStep(s => s - 1)}
            onNext={() => setStep(s => s + 1)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
