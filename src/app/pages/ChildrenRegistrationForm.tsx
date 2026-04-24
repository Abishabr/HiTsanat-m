import { useState, useRef, useEffect } from 'react';
import { User, Phone, MapPin, Users, Upload, BookOpen } from 'lucide-react';
import { StepWizard, StepNav } from '../components/StepWizard';
import { useChildren, KutrLevel, ConfessionFather } from '../hooks/useChildren';
import { useLanguage } from '../context/LanguageContext';
import { EthiopianDatePicker } from '../components/EthiopianDatePicker';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

const FIELD     = 'flex flex-col gap-1';
const LABEL     = 'text-sm font-medium text-foreground';
const INPUT     = 'w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all';
const ICON_WRAP = 'relative';
const ICON      = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground';
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

export default function ChildrenRegistrationForm() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { registerChild, getKutrLevels, getConfessionFathers } = useChildren();

  const STEPS = [
    { label: t('childrenRegistration.steps.childInfo') },
    { label: t('childrenRegistration.steps.address') },
    { label: t('childrenRegistration.steps.family') },
    { label: t('childrenRegistration.steps.contact') },
    { label: t('childrenRegistration.steps.photo') },
  ];

  const [step, setStep]           = useState(0);
  const [photo, setPhoto]         = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [kutrLevels, setKutrLevels]           = useState<KutrLevel[]>([]);
  const [confessionFathers, setConfessionFathers] = useState<ConfessionFather[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getKutrLevels().then(setKutrLevels);
    getConfessionFathers().then(setConfessionFathers);
  }, [getKutrLevels, getConfessionFathers]);

  const [form, setForm] = useState({
    givenName: '', fatherName: '', grandfatherName: '', spiritualName: '',
    gender: '', dob: '',
    address: '', subCity: '', woreda: '',
    fatherFullName: '', motherFullName: '',
    fatherPhone: '', motherPhone: '',
    grade: '', level: '',
    kutrLevelId: '',
    confessionFatherId: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) setPhoto(f);
  };

  const handleSubmit = async () => {
    if (!form.givenName.trim() || !form.fatherName.trim()) {
      toast.error(t('childrenRegistration.messages.errorNameRequired') || 'First and father name are required');
      return;
    }

    setSubmitting(true);
    try {
      const addressParts = [form.address, form.subCity, form.woreda].filter(Boolean).join(', ');

      const childId = await registerChild({
        first_name:           form.givenName.trim(),
        last_name:            form.fatherName.trim(),
        baptismal_name:       form.spiritualName || null,
        gender:               form.gender || null,
        date_of_birth:        form.dob || null,
        address:              addressParts || null,
        grade:                form.grade || null,
        level:                form.level || null,
        kutr_level_id:        form.kutrLevelId || null,
        confession_father_id: form.confessionFatherId || null,
        father_name:          form.fatherFullName || null,
        father_phone:         form.fatherPhone || null,
        mother_name:          form.motherFullName || null,
        mother_phone:         form.motherPhone || null,
      });

      if (childId) {
        toast.success(t('childrenRegistration.messages.success') || 'Child registered successfully');
        setStep(0);
        setForm({
          givenName: '', fatherName: '', grandfatherName: '', spiritualName: '',
          gender: '', dob: '',
          address: '', subCity: '', woreda: '',
          fatherFullName: '', motherFullName: '',
          fatherPhone: '', motherPhone: '',
          grade: '', level: '',
          kutrLevelId: '',
          confessionFatherId: '',
        });
        setPhoto(null);
        navigate('/children');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StepWizard steps={STEPS} current={step} title={t('childrenRegistration.title')} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">

          {/* Step 0: Child Info */}
          {step === 0 && (
            <div className="space-y-4">
              <SectionTitle icon={User} title={t('childrenRegistration.sections.childInfo')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['givenName',      t('childrenRegistration.fields.givenName.label'),      t('childrenRegistration.fields.givenName.placeholder')],
                  ['fatherName',     t('childrenRegistration.fields.fatherName.label'),     t('childrenRegistration.fields.fatherName.placeholder')],
                  ['grandfatherName',t('childrenRegistration.fields.grandfatherName.label'),t('childrenRegistration.fields.grandfatherName.placeholder')],
                  ['spiritualName',  t('childrenRegistration.fields.spiritualName.label'),  t('childrenRegistration.fields.spiritualName.placeholder')],
                ] as [string, string, string][]).map(([k, l, p]) => (
                  <div key={k} className={FIELD}>
                    <label className={LABEL}>{l}</label>
                    <div className={ICON_WRAP}>
                      <User className={ICON} />
                      <input className={INPUT_ICON} placeholder={p} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              <div className={FIELD}>
                <label className={LABEL}>{t('childrenRegistration.fields.gender.label')}</label>
                <div className="flex gap-6 mt-1">
                  {([['Male', t('common.male')], ['Female', t('common.female')]] as [string, string][]).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="child-gender" value={value} checked={form.gender === value}
                        onChange={() => set('gender', value)} className="w-4 h-4 accent-primary" />
                      <span className="text-sm text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={FIELD}>
                <label className={LABEL}>{t('childrenRegistration.fields.dob.label')}</label>
                <EthiopianDatePicker value={form.dob} onChange={v => set('dob', v)}
                  label={t('childrenRegistration.fields.dob.label')} lang={language} />
              </div>

              {/* Kutr Level */}
              <div className={FIELD}>
                <label className={LABEL}>{t('childrenRegistration.fields.kutrLevel.label')}</label>
                <select className={INPUT} value={form.kutrLevelId} onChange={e => set('kutrLevelId', e.target.value)}>
                  <option value="">Auto-assign from date of birth</option>
                  {kutrLevels.map(kl => (
                    <option key={kl.id} value={kl.id}>{kl.name} ({kl.min_age}–{kl.max_age} yrs)</option>
                  ))}
                </select>
              </div>

              {/* Grade & Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className={FIELD}>
                  <label className={LABEL}>Grade</label>
                  <input className={INPUT} placeholder="e.g. Grade 3" value={form.grade} onChange={e => set('grade', e.target.value)} />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Level</label>
                  <input className={INPUT} placeholder="Academic/spiritual level" value={form.level} onChange={e => set('level', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Address */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle icon={MapPin} title={t('childrenRegistration.sections.address')} />
              <div className={FIELD}>
                <label className={LABEL}>{t('childrenRegistration.fields.homeAddress.label')}</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-foreground bg-background transition-all resize-none"
                  rows={3}
                  placeholder={t('childrenRegistration.fields.homeAddress.placeholder')}
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={FIELD}>
                  <label className={LABEL}>Sub-City</label>
                  <input className={INPUT} placeholder="Sub-city" value={form.subCity} onChange={e => set('subCity', e.target.value)} />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Woreda</label>
                  <input className={INPUT} placeholder="Woreda" value={form.woreda} onChange={e => set('woreda', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Family Info */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon={Users} title={t('childrenRegistration.sections.familyInfo')} />
              {([
                { k: 'fatherFullName', l: t('childrenRegistration.fields.fatherFullName.label'), p: t('childrenRegistration.fields.fatherFullName.placeholder') },
                { k: 'motherFullName', l: t('childrenRegistration.fields.motherFullName.label'), p: t('childrenRegistration.fields.motherFullName.placeholder') },
              ] as { k: string; l: string; p: string }[]).map(({ k, l, p }) => (
                <div key={k} className={FIELD}>
                  <label className={LABEL}>{l}</label>
                  <div className={ICON_WRAP}>
                    <User className={ICON} />
                    <input className={INPUT_ICON} placeholder={p} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                </div>
              ))}

              {/* Confession Father */}
              <div className={FIELD}>
                <label className={LABEL}>Yebetesubu Nseha Abat (Confession Father)</label>
                <select className={INPUT} value={form.confessionFatherId} onChange={e => set('confessionFatherId', e.target.value)}>
                  <option value="">Select confession father (optional)</option>
                  {confessionFathers.map(cf => (
                    <option key={cf.id} value={cf.id}>
                      {cf.title ? `${cf.title} ` : ''}{cf.full_name}{cf.church ? ` — ${cf.church}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle icon={Phone} title={t('childrenRegistration.sections.contactInfo')} />
              {([
                { k: 'fatherPhone', l: t('childrenRegistration.fields.fatherPhone.label') },
                { k: 'motherPhone', l: t('childrenRegistration.fields.motherPhone.label') },
              ] as { k: string; l: string }[]).map(({ k, l }) => (
                <div key={k} className={FIELD}>
                  <label className={LABEL}>{l}</label>
                  <div className={ICON_WRAP}>
                    <Phone className={ICON} />
                    <input type="tel" className={INPUT_ICON} placeholder="+251 911 ..."
                      value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Photo */}
          {step === 4 && (
            <div className="space-y-4">
              <SectionTitle icon={Upload} title={t('childrenRegistration.sections.photoUpload')} />
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary hover:bg-muted/30'
                }`}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
                {photo ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={URL.createObjectURL(photo)} alt="preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary" />
                    <p className="text-sm text-primary font-medium">{photo.name}</p>
                    <p className="text-xs text-muted-foreground">{t('photoUpload.clickToChange')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{t('photoUpload.dragDropChild')}</p>
                    <p className="text-xs text-muted-foreground">{t('photoUpload.clickBrowse')}</p>
                  </div>
                )}
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
