import { useState, useRef } from 'react';
import { User, Phone, Mail, MessageCircle, Upload, BookOpen, MapPin, Shield } from 'lucide-react';
import { StepWizard, StepNav } from '../components/StepWizard';
import { useDataStore } from '../context/DataStore';
import { getSubDeptDisplayName } from '../data/mockData';
import { useSchedule } from '../context/ScheduleStore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../lib/translations';
import { toast } from 'sonner';



const FIELD = 'flex flex-col gap-1';
const LABEL = 'text-sm font-medium text-foreground';
const INPUT = 'w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all';
const ICON_WRAP = 'relative';
const ICON = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground';
const INPUT_ICON = 'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all';

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-2 border-b border-border">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export default function MemberRegistrationForm() {
  const { t, language } = useLanguage();

  const CAMPUSES = [
    { value: 'Main', label: t('memberRegistration.options.campuses.main') },
    { value: 'Gendeje', label: t('memberRegistration.options.campuses.gendeje') },
    { value: 'Station', label: t('memberRegistration.options.campuses.station') },
  ];

  const KEHNET_ROLES = [
    { value: 'Deacon', label: t('memberRegistration.options.kehnetRoles.deacon') },
    { value: 'Kes', label: t('memberRegistration.options.kehnetRoles.kes') },
    { value: 'Mergeta', label: t('memberRegistration.options.kehnetRoles.mergeta') },
  ];

  const getTranslatedSubDeptName = (name: string): string => {
    const key = name.toLowerCase().replace(/[^a-z]/g, '');
    const subDeptMap: Record<string, string> = {
      mezmur: t('memberRegistration.options.subDepts.mezmur'),
      kinetibeb: t('memberRegistration.options.subDepts.kinetibeb'),
      kuttr: t('memberRegistration.options.subDepts.kuttr'),
      timhert: t('memberRegistration.options.subDepts.timhert'),
    };
    return subDeptMap[key] ?? getSubDeptDisplayName(name);
  };

  const YEARS = translations[language].memberRegistration.options.years;

  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addMember } = useDataStore();
  const { subDepts } = useSchedule();

  const STEPS = [
    { label: t('memberRegistration.steps.personal') },
    { label: t('memberRegistration.steps.campus') },
    { label: t('memberRegistration.steps.contact') },
    { label: t('memberRegistration.steps.kehnet') },
    { label: t('memberRegistration.steps.photo') },
  ];

  const [form, setForm] = useState({
    givenName: '', fatherName: '', grandfatherName: '', spiritualName: '',
    gender: '', dob: '',
    campus: '', yearOfStudy: '', department: '',
    phone: '', email: '', telegram: '',
    kehnetRoles: [] as string[],
    subDepts: [] as string[],
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const toggleRole = (r: string) => setForm(p => ({
    ...p,
    kehnetRoles: p.kehnetRoles.includes(r) ? p.kehnetRoles.filter(x => x !== r) : [...p.kehnetRoles, r],
  }));
  const toggleSubDept = (name: string) => setForm(p => ({
    ...p,
    subDepts: p.subDepts.includes(name) ? p.subDepts.filter(x => x !== name) : [...p.subDepts, name],
  }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) setPhoto(f);
  };

  const handleSubmit = () => {
    if (!form.givenName.trim() || !form.fatherName.trim()) {
      toast.error(t('memberRegistration.messages.errorNameRequired'));
      return;
    }
    if (!form.phone.trim()) {
      toast.error(t('memberRegistration.messages.errorPhoneRequired'));
      return;
    }
    if (!form.gender) {
      toast.error(t('memberRegistration.messages.errorGenderRequired'));
      return;
    }
    addMember({
      studentId: `STU-${Date.now()}`,
      name: `${form.givenName} ${form.fatherName}`.trim(),
      givenName: form.givenName,
      fatherName: form.fatherName,
      grandfatherName: form.grandfatherName,
      spiritualName: form.spiritualName,
      gender: form.gender as 'Male' | 'Female',
      dateOfBirth: form.dob || undefined,
      campus: form.campus || undefined,
      yearOfStudy: parseInt(form.yearOfStudy) || 1,
      academicDepartment: form.department || undefined,
      phone: form.phone,
      email: form.email,
      telegram: form.telegram || undefined,
      kehnetRoles: form.kehnetRoles,
      subDepartments: form.subDepts,
      families: [],
      joinDate: new Date().toISOString().split('T')[0],
    }).then(() => {
      toast.success(t('memberRegistration.messages.success'));
      setStep(0);
      setForm({ givenName: '', fatherName: '', grandfatherName: '', spiritualName: '', gender: '', dob: '', campus: '', yearOfStudy: '', department: '', phone: '', email: '', telegram: '', kehnetRoles: [], subDepts: [] });
      setPhoto(null);
    }).catch((err: Error) => {
      toast.error(`Registration failed: ${err.message}`);
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepWizard steps={STEPS} current={step} title={t('memberRegistration.title')} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">

          {step === 0 && (
            <div className="space-y-4">
              <SectionTitle icon={User} title={t('memberRegistration.sections.personalInfo')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['givenName', t('memberRegistration.fields.givenName.label'), t('memberRegistration.fields.givenName.placeholder')],
                  ['fatherName', t('memberRegistration.fields.fatherName.label'), t('memberRegistration.fields.fatherName.placeholder')],
                  ['grandfatherName', t('memberRegistration.fields.grandfatherName.label'), t('memberRegistration.fields.grandfatherName.placeholder')],
                  ['spiritualName', t('memberRegistration.fields.spiritualName.label'), t('memberRegistration.fields.spiritualName.placeholder')],
                ] as [string, string, string][]).map(([k, l, ph]) => (
                  <div key={k} className={FIELD}>
                    <label className={LABEL}>{l}</label>
                    <div className={ICON_WRAP}>
                      <User className={ICON} />
                      <input className={INPUT_ICON} placeholder={ph} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.gender.label')}</label>
                <div className="flex gap-6 mt-1">
                  {(['Male', 'Female'] as const).map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set('gender', g)}
                        className="w-4 h-4 accent-primary" />
                      <span className="text-sm text-foreground">{g === 'Male' ? t('common.male') : t('common.female')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.dob.label')}</label>
                <input type="date" className={INPUT} value={form.dob} onChange={e => set('dob', e.target.value)} />
              </div>
            </div>
          )}

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
                  {YEARS.map((y, i) => <option key={y} value={String(i+1)}>{y}</option>)}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.department.label')}</label>
                <input className={INPUT} placeholder={t('memberRegistration.fields.department.placeholder')} value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon={Phone} title={t('memberRegistration.sections.contactInfo')} />
              {[
                { k: 'phone', l: t('memberRegistration.fields.phone.label'), icon: Phone, type: 'tel', ph: t('memberRegistration.fields.phone.placeholder') },
                { k: 'email', l: t('memberRegistration.fields.email.label'), icon: Mail, type: 'email', ph: t('memberRegistration.fields.email.placeholder') },
                { k: 'telegram', l: t('memberRegistration.fields.telegram.label'), icon: MessageCircle, type: 'text', ph: t('memberRegistration.fields.telegram.placeholder') },
              ].map(({ k, l, icon: Icon, type, ph }) => (
                <div key={k} className={FIELD}>
                  <label className={LABEL}>{l}</label>
                  <div className={ICON_WRAP}>
                    <Icon className={ICON} />
                    <input type={type} className={INPUT_ICON} placeholder={ph} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle icon={Shield} title={t('memberRegistration.sections.kehnetRole')} />
              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.subDepartments.label')}</label>
                <p className="text-xs text-muted-foreground mb-2">{t('memberRegistration.fields.subDepartments.helper')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {subDepts.map(sd => {
                    const checked = form.subDepts.includes(sd.name);
                    return (
                      <label key={sd.id} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${checked ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSubDept(sd.name)} className="w-4 h-4 accent-primary" />
                        <span className={`text-sm font-medium ${checked ? 'text-primary' : 'text-foreground'}`}>{getTranslatedSubDeptName(sd.name)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>{t('memberRegistration.fields.kehnetRole.label')}</label>
                <p className="text-xs text-muted-foreground mb-2">{t('memberRegistration.fields.kehnetRole.helper')}</p>
                <div className="grid grid-cols-3 gap-3">
                  {KEHNET_ROLES.map(role => {
                    const checked = form.kehnetRoles.includes(role.value);
                    return (
                      <label key={role.value} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleRole(role.value)} className="w-4 h-4 accent-primary" />
                        <span className={`font-medium text-sm ${checked ? 'text-primary' : 'text-foreground'}`}>{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <SectionTitle icon={Upload} title={t('memberRegistration.sections.photoUpload')} />
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary hover:bg-muted/30'}`}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
                {photo ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={URL.createObjectURL(photo)} alt="preview" className="w-24 h-24 rounded-full object-cover border-4 border-primary" />
                    <p className="text-sm text-primary font-medium">{photo.name}</p>
                    <p className="text-xs text-muted-foreground">{t('photoUpload.clickToChange')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{t('photoUpload.dragDropMember')}</p>
                    <p className="text-xs text-muted-foreground">{t('photoUpload.clickBrowse')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <StepNav step={step} total={STEPS.length} onBack={() => setStep(s => s - 1)} onNext={() => setStep(s => s + 1)} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
