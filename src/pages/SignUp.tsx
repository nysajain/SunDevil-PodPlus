import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setRole, setCurrentUserId } from '../lib/roles';
import { TAG_OPTIONS } from '../lib/tagOptions';

const ZONES = ['Tempe', 'West', 'Poly', 'DTPHX'] as const;
const TIMESLOTS = [
  'Mon 10:00',
  'Mon 14:00',
  'Tue 11:30',
  'Tue 14:00',
  'Tue 15:00',
  'Wed 12:30',
  'Wed 16:00',
  'Thu 17:00',
  'Fri 15:00',
  'Sat 13:00',
  'Sun 10:00',
] as const;

type InterestData = {
  id: string;
  name: string;
};

type KnownUser = {
  id: string;
  name: string;
  email: string;
};

type SignupPayload = {
  zone: string;
  times: string[];
  interests: string[];
  tags: string[];
};

const defaultPayload: SignupPayload = {
  zone: 'Tempe',
  times: [],
  interests: [],
  tags: [],
};

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [interestOptions, setInterestOptions] = useState<InterestData[]>([]);
  const [interestInput, setInterestInput] = useState<string>('');
  const [times, setTimes] = useState<string[]>(defaultPayload.times);
  const [zone, setZone] = useState<string>(defaultPayload.zone);
  const [tags, setTags] = useState<string[]>(defaultPayload.tags);
  const [otherTag, setOtherTag] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetch('/data/interests.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load interests: ${res.status}`);
        }
        return res.json();
      })
      .then((data: unknown) => {
        const opts = (Array.isArray(data) ? data : []).map((raw, idx) => ({
          id: `interest-${idx}`,
          name: String(raw),
        }));
        setInterestOptions(opts);
      })
      .catch((error) => {
        console.error('Unable to load interests.json', error);
        setInterestOptions(
          ['study sprint', 'soccer', 'coffee', 'anime', 'hiking', 'music'].map((label, idx) => ({
            id: `interest-${idx}`,
            name: label,
          }))
        );
      });
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const [usersRes] = await Promise.all([fetch('/data/users.json')]);
        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          if (Array.isArray(usersJson)) {
            setKnownUsers(
              usersJson.map((user: any) => ({
                id: String(user.id),
                name: String(user.name),
                email: String(user.email || '').toLowerCase(),
              }))
            );
          }
        }
      } catch (error) {
        console.error('Unable to load roster data', error);
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('signupProfile');
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as { name?: string; email?: string };
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
      }
      const storedSignup = localStorage.getItem('signupData');
      if (storedSignup) {
        const parsed = JSON.parse(storedSignup) as Partial<SignupPayload>;
        if (parsed.zone) setZone(parsed.zone);
        if (Array.isArray(parsed.times)) setTimes(parsed.times.map(String));
        if (Array.isArray(parsed.interests)) {
          const restoredInterests = parsed.interests.map(String);
          setInterestInput(restoredInterests.join('; '));
        }
        if (Array.isArray(parsed.tags)) {
          const restoredTags = parsed.tags.map(String);
          const otherEntry = restoredTags.find((value) => value.startsWith('other:'));
          const baseTags = restoredTags.filter((value) => !value.startsWith('other:'));
          setTags(baseTags);
          if (otherEntry) {
            setOtherTag(otherEntry.slice('other:'.length));
          }
        }
      }
    } catch (error) {
      console.error('Unable to restore signup data', error);
    }
  }, []);

  const parseDelimitedInput = (value: string): string[] =>
    value
      .split(/[,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const toggleArrayValue = (value: string, arr: string[], setter: (values: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value]);
  };

  const interestPlaceholder = useMemo(() => {
    if (interestOptions.length === 0) {
      return 'e.g., study sprint; anime; soccer; weekend hikes';
    }
    const suggestions = interestOptions.slice(0, 4).map((item) => item.name.toLowerCase());
    return `e.g., ${suggestions.join('; ')}`;
  }, [interestOptions]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const parsedInterests = parseDelimitedInput(interestInput);
    const normalizedTags = [...tags];
    const customTag = otherTag.trim();
    if (customTag) {
      normalizedTags.push(`other:${customTag}`);
    }

    const payload: SignupPayload = { zone, times, interests: parsedInterests, tags: normalizedTags };
    try {
      localStorage.setItem('signupData', JSON.stringify(payload));
      localStorage.setItem('signupProfile', JSON.stringify({ name, email }));
    } catch (error) {
      console.error('Unable to persist signup payload', error);
    }

    let resolvedUserId = 'me';
    let resolvedName = name?.trim() || 'Guest';
    if (email.trim()) {
      const match = knownUsers.find((user) => user.email === email.trim().toLowerCase());
      if (match) {
        resolvedUserId = match.id;
        resolvedName = match.name;
      }
    }

    try {
      setCurrentUserId(resolvedUserId);
      localStorage.setItem('currentUserName', resolvedName);
      if (email) {
        localStorage.setItem('currentUserEmail', email);
      }
      setRole('student');
      window.dispatchEvent(new Event('pods:session-updated'));
    } catch (error) {
      console.error('Unable to persist session metadata', error);
    }

    setStatusMessage('Awesome! We are matching you with your pod…');
    navigate('/dashboard', { replace: true });
    setTimeout(() => setIsSubmitting(false), 250);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold text-asuMaroon">Join the SunDevil Pods+</h1>
        <p className="max-w-2xl mx-auto text-base text-gray-700">
          Tell us a little about yourself so we can place you with a pod that shares your energy, schedule, and goals.
        </p>
      </div>
      {statusMessage && (
        <div className="max-w-3xl mx-auto bg-asuGold/20 border border-asuGold/60 text-asuMaroon text-sm font-semibold rounded-xl px-4 py-3">
          {statusMessage}
        </div>
      )}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-xl p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide">Preferred Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jordan"
                className="w-full rounded-xl border border-asuGray bg-white/70 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-asuMaroon/50"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide">ASU Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="sunnydevil@asu.edu"
                className="w-full rounded-xl border border-asuGray bg-white/70 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-asuGold/60"
              />
              <p className="text-xs text-gray-500">Optional, but lets us surface your existing pod data if you&apos;re already in the system.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Interests</label>
            <textarea
              value={interestInput}
              onChange={(event) => {
                const value = event.target.value;
                setInterestInput(value);
              }}
              rows={4}
              placeholder={interestPlaceholder}
              className="w-full rounded-2xl border border-asuGray bg-white/70 px-4 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-asuMaroon/40"
            />
            <p className="mt-2 text-xs text-gray-500">
              Separate interests with commas or semicolons. We&apos;ll display them exactly as written on your dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Available 45-minute time slots</label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TIMESLOTS.map((slot) => {
                const selected = times.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleArrayValue(slot, times, setTimes)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-2 text-sm transition ${
                      selected
                        ? 'border-asuMaroon bg-asuMaroon/10 text-asuMaroon shadow-sm'
                        : 'border-asuGray bg-white/70 text-gray-700 hover:border-asuMaroon/50'
                    }`}
                  >
                    <span>{slot}</span>
                    <span className="text-xs uppercase tracking-wide">{selected ? 'Selected' : 'Select'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Campus Zone</label>
            <select
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className="w-full border border-asuGray rounded-xl px-4 py-2 bg-white/70 focus:outline-none focus:ring-2 focus:ring-asuGold/60"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-3">
            <legend className="block text-sm font-semibold text-asuMaroon uppercase tracking-wide">Optional tags</legend>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((option) => {
                const selected = tags.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? 'border-asuMaroon bg-asuMaroon text-white shadow'
                        : 'border-asuGray bg-white/70 text-asuMaroon hover:border-asuMaroon/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => toggleArrayValue(option.value, tags, setTags)}
                    />
                    <span>{option.label}</span>
                    <span className="sr-only">{selected ? 'Selected' : 'Not selected'}</span>
                  </label>
                );
              })}
            </div>
            <label className="block text-xs text-gray-600">
              <span className="font-semibold text-asuMaroon block mb-1">Other (optional)</span>
              <input
                type="text"
                value={otherTag}
                onChange={(event) => setOtherTag(event.target.value)}
                placeholder="Add another identity or support need"
                className="w-full rounded-xl border border-asuGray bg-white/70 px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-asuGold/50"
              />
            </label>
            <p className="text-xs text-gray-500">
              We&apos;ll include any custom entry along with the selected support tags.
            </p>
          </fieldset>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-500">
              We&apos;ll use this info to match you with a pod and store a lightweight profile locally for the demo.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-asuMaroon text-white rounded-full px-6 py-3 text-base font-semibold shadow-lg hover:bg-[#6f1833] transition disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Continue to Your Pod'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
