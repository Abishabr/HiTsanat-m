import { useState, useRef } from 'react';
import { User, Phone, Mail, MessageCircle, Upload, BookOpen, MapPin, Shield } from 'lucide-react';
import { StepWizard, StepNav } from '../components/StepWizard';
import { useDataStore } from '../context/DataStore';
import { subDepartments, getSubDeptDisplayName } from '../data/mockData';
import { toast } from 'sonner';

const STEPS = [
  { label: 'Personal' },
  { label: 'Campus' },
  { label: 'Contact' },
  { label: 'Emergency' },
  { label: 'Kehnet' },
  { label: 'Photo' },
];

const CAMPUSES = ['Main', 'Gendeje', 'Station'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year'];
const KEHNET_ROLES = ['Deacon', 'Kes', 'Mergeta'];

const FIELD = 'flex flex-col gap-1';
const LABEL = 'text-sm font-medium text-[#2c2c2c]';
const INPUT = 'w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-[#5f0113] focus:ring-2 focus:ring-[#5f0113]/10 text-[#2c2c2c] bg-white transition-all';
const ICON_WRAP = 'relative';
const ICON = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400';
const INPUT_ICON = 'w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-[#5f0113] focus:ring-2 focus:ring-[#5f0113]/10 text-[#2c2c2c] bg-white transition-all';

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-2 border-b border-gray-100">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5f01130d' }}>
        <Icon className="w-4 h-4" style={{ color: '#5f0113' }} />
      </div>
      <h2 className="text-base font-semibold text-[#2c2c2c]">{title}</h2>
    </div>
  );
}

export default function MemberRegistrationForm() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addMember } = useDataStore();

  const [form, setForm] = useState({
    givenName: '', fatherName: '', grandfatherName: '', spiritualName: '',
    gender: '', dob: '',
    campus: '', yearOfStudy: '', department: '',
    phone: '', email: '', telegram: '',
    emergencyName: '', emergencyPhone: '',
    kehnetRoles: [] as string[],
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const toggleRole = (r: string) => setForm(p => ({
    ...p,
    kehnetRoles: p.kehnetRoles.includes(r) ? p.kehnetRoles.filter(x => x !== r) : [...p.kehnetRoles, r],
  }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) setPhoto(f);
  };

  const handleSubmit = () => {
    addMember({
      studentId: `STU-${Date.now()}`,
      name: `${form.givenName} ${form.fatherName}`,
      yearOfStudy: parseInt(form.yearOfStudy) || 1,
      phone: form.phone,
      email: form.email,
      subDepartments: [],
      families: [],
      joinDate: new Date().toISOString().split('T')[0],
    });
    toast.success('Member registered successfully!');
    setStep(0);
    setForm({ givenName: '', fatherName: '', grandfatherName: '', spiritualName: '', gender: '', dob: '', campus: '', yearOfStudy: '', department: '', phone: '', email: '', telegram: '', emergencyName: '', emergencyPhone: '', kehnetRoles: [] });
    setPhoto(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StepWizard steps={STEPS} current={step} title="Member Registration" />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

          {step === 0 && (
            <div className="space-y-4">
              <SectionTitle icon={User} title="Personal Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[['givenName','Given Name'],['fatherName',"Father's Name"],['grandfatherName',"Grandfather's Name"],['spiritualName','Spiritual Name']].map(([k,l]) => (
                  <div key={k} className={FIELD}>
                    <label className={LABEL}>{l}</label>
                    <div className={ICON_WRAP}>
                      <User className={ICON} />
                      <input className={INPUT_ICON} placeholder={l} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Gender</label>
                <div className="flex gap-6 mt-1">
                  {['Male','Female'].map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set('gender', g)}
                        className="w-4 h-4 accent-[#5f0113]" />
                      <span className="text-sm text-[#2c2c2c]">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Date of Birth</label>
                <input type="date" className={INPUT} value={form.dob} onChange={e => set('dob', e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle icon={BookOpen} title="Campus & Education" />
              <div className={FIELD}>
                <label className={LABEL}>Campus</label>
                <select className={INPUT} value={form.campus} onChange={e => set('campus', e.target.value)}>
                  <option value="">Select campus</option>
                  {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Year of Study</label>
                <select className={INPUT} value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                  <option value="">Select year</option>
                  {YEARS.map((y, i) => <option key={y} value={String(i+1)}>{y}</option>)}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Department</label>
                <input className={INPUT} placeholder="e.g. Computer Science" value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon={Phone} title="Contact Information" />
              {[
                { k: 'phone', l: 'Phone Number', icon: Phone, type: 'tel', ph: '+251 911 ...' },
                { k: 'email', l: 'Email Address', icon: Mail, type: 'email', ph: 'you@email.com' },
                { k: 'telegram', l: 'Telegram Username', icon: MessageCircle, type: 'text', ph: '@username' },
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
              <SectionTitle icon={Phone} title="Emergency Contact" />
              <div className={FIELD}>
                <label className={LABEL}>Contact Name</label>
                <div className={ICON_WRAP}>
                  <User className={ICON} />
                  <input className={INPUT_ICON} placeholder="Full name" value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} />
                </div>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Phone Number</label>
                <div className={ICON_WRAP}>
                  <Phone className={ICON} />
                  <input type="tel" className={INPUT_ICON} placeholder="+251 911 ..." value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <SectionTitle icon={Shield} title="Kehnet Role" />
              <p className="text-sm text-gray-500 -mt-2">Select all that apply</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {KEHNET_ROLES.map(role => {
                  const checked = form.kehnetRoles.includes(role);
                  return (
                    <label key={role} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-[#5f0113] bg-[#5f01130d]' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleRole(role)} className="w-4 h-4 accent-[#5f0113]" />
                      <span className={`font-medium text-sm ${checked ? 'text-[#5f0113]' : 'text-[#2c2c2c]'}`}>{role}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <SectionTitle icon={Upload} title="Photo Upload" />
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-[#5f0113] bg-[#5f01130d]' : 'border-gray-300 hover:border-[#5f0113] hover:bg-gray-50'}`}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
                {photo ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={URL.createObjectURL(photo)} alt="preview" className="w-24 h-24 rounded-full object-cover border-4 border-[#5f0113]" />
                    <p className="text-sm text-[#5f0113] font-medium">{photo.name}</p>
                    <p className="text-xs text-gray-400">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-[#2c2c2c]">Drag & drop your photo here</p>
                    <p className="text-xs text-gray-400">or click to browse — JPG, PNG up to 5MB</p>
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
