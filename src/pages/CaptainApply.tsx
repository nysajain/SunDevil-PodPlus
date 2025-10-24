import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { objectUrlForFile, isPdfFile } from '../lib/files';
import { setRole } from '../lib/roles';

export type CaptainApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CaptainApplication {
  id: string;
  name: string;
  email: string;
  zones: string[];
  availability: string[];
  about: string;
  resumeName: string;
  resumeUrl: string;
  createdAt: string;
  status: CaptainApplicationStatus;
}

const ZONES = ['Tempe', 'West', 'Poly', 'DTPHX'] as const;
const AVAILABILITY = ['Mornings', 'Afternoons', 'Evenings', 'Weekends', 'Virtual'] as const;
const APPLICATION_KEY = 'captainApplications';

const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const readApplications = (): CaptainApplication[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(APPLICATION_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed as CaptainApplication[];
  } catch (error) {
    console.error('Unable to read captain applications', error);
    return [];
  }
};

const persistApplications = (applications: CaptainApplication[]) => {
  try {
    localStorage.setItem(APPLICATION_KEY, JSON.stringify(applications));
  } catch (error) {
    console.error('Unable to persist captain applications', error);
  }
};

const CaptainApply: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [zones, setZones] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [about, setAbout] = useState('');
  const [acceptedCode, setAcceptedCode] = useState(false);
  const [resumePreview, setResumePreview] = useState<{ name: string; url: string } | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem('signupProfile');
      if (profileRaw) {
        const profile = JSON.parse(profileRaw) as { name?: string; email?: string };
        if (profile.name) setName(profile.name);
        if (profile.email) setEmail(profile.email);
      }
    } catch (profileError) {
      console.error('Unable to hydrate signup profile', profileError);
    }
  }, []);

  useEffect(() => () => {
    if (resumePreview) {
      URL.revokeObjectURL(resumePreview.url);
    }
  }, [resumePreview]);

  const toggleSelection = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const isValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      zones.length > 0 &&
      availability.length > 0 &&
      about.trim().length > 40 &&
      acceptedCode &&
      Boolean(resumePreview)
    );
  }, [name, email, zones, availability, about, acceptedCode, resumePreview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setResumePreview(null);
      setResumeFile(null);
      return;
    }
    if (!isPdfFile(file)) {
      setError('Please upload a PDF resume.');
      event.target.value = '';
      return;
    }
    if (resumePreview) {
      URL.revokeObjectURL(resumePreview.url);
    }
    const preview = objectUrlForFile(file);
    setResumePreview({ name: file.name, url: preview.url });
    setResumeFile(file);
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || !resumePreview) {
      setError('Please complete all required fields before submitting.');
      return;
    }

    const applications = readApplications();
    const existing = applications.find((app) => app.email.toLowerCase() === email.trim().toLowerCase());
    const storedUrl = resumeFile ? URL.createObjectURL(resumeFile) : resumePreview.url;
    const application: CaptainApplication = {
      id: existing?.id ?? uid(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      zones: [...zones],
      availability: [...availability],
      about: about.trim(),
      resumeName: resumePreview.name,
      resumeUrl: storedUrl,
      createdAt: new Date().toISOString(),
      status: existing?.status ?? 'pending',
    };

    const nextApplications = existing
      ? applications.map((entry) => (entry.id === application.id ? application : entry))
      : [...applications, application];

    persistApplications(nextApplications);
    setRole('captain-candidate');
    window.dispatchEvent(new Event('pods:session-updated'));
    navigate('/apply/success');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
        <header className="space-y-2 border-b border-white/60 pb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-asuMaroon/60">Peer Captain Application</p>
          <h1 className="text-3xl font-extrabold text-asuMaroon">Lead a SunDevil Pod</h1>
          <p className="text-sm text-gray-600">
            Share how you create belonging and where you can serve. Your application stays local for this demo and powers the Captain Console.
          </p>
        </header>

        <div className="mt-6 rounded-2xl border border-asuMaroon/20 bg-white/80 p-5 shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-asuMaroon via-asuMaroon to-asuGold px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            What you earn as a Peer Captain
          </div>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-asuMaroon" aria-hidden>
                ●
              </span>
              <div>
                <p className="font-semibold text-asuMaroon">Letter of Recommendation</p>
                <p className="text-xs text-gray-500">Awarded by program sponsors at the end of the semester.</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-asuMaroon" aria-hidden>
                ●
              </span>
              <div>
                <p className="font-semibold text-asuMaroon">Completion Certificate</p>
                <p className="text-xs text-gray-500">A verifiable digital credential you can share.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-asuMaroon">Full name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-asuGray/60 px-4 py-2 shadow-sm outline-none focus:border-asuMaroon"
              placeholder="Sparky SunDevil"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-asuMaroon">ASU email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-asuGray/60 px-4 py-2 shadow-sm outline-none focus:border-asuMaroon"
              placeholder="sparky@asu.edu"
              required
            />
          </label>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <fieldset className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-inner">
            <legend className="sr-only">Campuses / zones you can lead</legend>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-asuMaroon">Campuses / zones you can lead</p>
                <p className="text-xs text-gray-500">Select every zone you know well. Captains often cover two or more.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ZONES.map((zone) => (
                  <label key={zone} className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1 text-sm text-gray-700 transition hover:border-asuMaroon/30">
                    <input
                      type="checkbox"
                      checked={zones.includes(zone)}
                      onChange={() => toggleSelection(zone, zones, setZones)}
                      className="rounded border-asuMaroon text-asuMaroon focus:ring-asuMaroon"
                    />
                    {zone}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
          <fieldset className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-inner">
            <legend className="sr-only">Weekly availability</legend>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-asuMaroon">Weekly availability</p>
                <p className="text-xs text-gray-500">Tap each block you can host. We recommend setting at least three options.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY.map((slot) => {
                  const active = availability.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSelection(slot, availability, setAvailability)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-asuGold ${
                        active ? 'bg-asuMaroon text-white shadow-lg' : 'bg-asuGray text-gray-600 hover:bg-asuMaroon/20'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>
        </div>

        <label className="mt-6 flex flex-col gap-2 text-sm">
          <span className="font-semibold text-asuMaroon">Why are you ready to captain a pod?</span>
          <textarea
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            rows={5}
            className="rounded-2xl border border-asuGray/60 bg-white/70 px-4 py-3 text-sm shadow-inner outline-none focus:border-asuMaroon"
            placeholder="Share how you build community, mentor peers, or create welcoming spaces..."
            required
          />
          <span className="text-xs text-gray-500">Aim for at least 2-3 sentences ({Math.max(0, about.trim().length)} chars).</span>
        </label>

        <div className="mt-6 space-y-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-asuMaroon">Resume (PDF only)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="text-sm text-gray-600"
              required
            />
          </label>
          {resumePreview && (
            <div className="flex items-center justify-between rounded-xl border border-asuMaroon/40 bg-asuMaroon/5 px-4 py-2 text-sm">
              <div>
                <p className="font-semibold text-asuMaroon">{resumePreview.name}</p>
                <a href={resumePreview.url} target="_blank" rel="noreferrer" className="text-xs text-asuMaroon underline">
                  Preview resume
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(resumePreview.url);
                  setResumePreview(null);
                  setResumeFile(null);
                }}
                className="text-xs font-semibold text-asuMaroon hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={acceptedCode}
            onChange={(event) => setAcceptedCode(event.target.checked)}
            className="mt-1 rounded border-asuMaroon text-asuMaroon focus:ring-asuMaroon"
            required
          />
          <span>
            I agree to uphold ASU&apos;s code of conduct, create inclusive spaces, and escalate wellbeing concerns to professional staff.
          </span>
        </label>

        {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!isValid}
          className={`mt-6 rounded-full px-6 py-3 text-sm font-semibold transition ${
            isValid ? 'bg-asuMaroon text-white shadow-lg hover:bg-[#6f1833]' : 'bg-asuGray text-gray-500 cursor-not-allowed'
          }`}
        >
          Submit application
        </button>
      </section>
    </form>
  );
};

export default CaptainApply;
