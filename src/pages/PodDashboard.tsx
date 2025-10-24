import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SpacePicker, { Space } from '../components/SpacePicker';
import BelongingPulse from '../components/BelongingPulse';
import { formatTagLabel } from '../lib/tagOptions';
import { getRole, Role } from '../lib/roles';
import { adjustPoints, getPoints } from '../lib/points';
import { clampWeek, getRealWeek, persistWeek, readStoredWeek } from '../lib/weeks';

type User = {
  id: string;
  name: string;
  email: string;
  zone: string;
  interests: string[];
  times: string[];
  tags: string[];
};

type Pod = {
  id: string;
  zone: string;
  timeslot: string;
  interests: string[];
  tags: string[];
  memberIds: string[];
  captainId?: string | null;
  points: number;
  level: number;
  vibe: number;
};

type Quest = {
  id: string;
  week: number;
  title: string;
  description: string;
  badges: string[];
  points: { base: number; coop4: number; coop6: number };
};

type Badge = {
  id: string;
  name: string;
  icon: string;
  criteria: string;
};

type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

type SignupPreferences = {
  zone: string;
  times: string[];
  interests: string[];
  tags: string[];
};

type DataBundle = {
  users: User[];
  pods: Pod[];
  quests: Quest[];
  badges: Badge[];
  spaces: Space[];
  rewards: Reward[];
};

const defaultBundle: DataBundle = {
  users: [],
  pods: [],
  quests: [],
  badges: [],
  spaces: [],
  rewards: [],
};

const loadJson = async <T,>(path: string): Promise<T | null> => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Unable to load ${path}`, error);
    return null;
  }
};

const getEffectiveAvailability = (space: Space, overrides: Record<string, boolean>): boolean => {
  if (space.id in overrides) {
    return overrides[space.id];
  }
  return typeof space.available === 'boolean' ? space.available : true;
};

const PodDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<DataBundle>(defaultBundle);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [signupPrefs, setSignupPrefs] = useState<SignupPreferences | null>(null);
  const [pod, setPod] = useState<Pod | null>(null);
  const [podMembers, setPodMembers] = useState<User[]>([]);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(() => readStoredWeek());
  const [realWeek, setRealWeek] = useState<number>(() => getRealWeek());
  const [role, setRoleState] = useState<Role>(() => (typeof window === 'undefined' ? 'student' : getRole()));
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('currentUserId');
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Friend';
    return localStorage.getItem('currentUserName') || 'Friend';
  });
  const [points, setPointsState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const uid = localStorage.getItem('currentUserId');
    return getPoints(uid);
  });
  const pointsAnimationStart = useRef(points);
  const [displayedPoints, setDisplayedPoints] = useState<number>(points);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [questCompleted, setQuestCompleted] = useState<boolean>(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [showSpacePicker, setShowSpacePicker] = useState<boolean>(false);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const overrides: Record<string, boolean> = {};
    try {
      const possibleKeys = Object.keys(localStorage).filter((key) => key.startsWith('spaceAvail:'));
      possibleKeys.forEach((key) => {
        const spaceId = key.split(':')[1];
        overrides[spaceId] = localStorage.getItem(key) === '1';
      });
    } catch (error) {
      console.error('Unable to hydrate space availability overrides', error);
    }
    return overrides;
  });
  const [showPulseModal, setShowPulseModal] = useState<boolean>(false);
  const [lastBelongingScore, setLastBelongingScore] = useState<number | null>(null);
  const [belongingDelta, setBelongingDelta] = useState<number | null>(null);
  const [isCheckedInThisWeek, setIsCheckedInThisWeek] = useState<boolean>(false);
  const [vibeAverage, setVibeAverage] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setRealWeek(getRealWeek());
    refresh();
    const interval = window.setInterval(refresh, 1000 * 60 * 60);
    window.addEventListener('pods:week-refresh', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pods:week-refresh', refresh);
    };
  }, []);

  const loadVibeAverage = useCallback(() => {
    if (typeof window === 'undefined' || !pod) {
      setVibeAverage(null);
      return;
    }
    try {
      const direct = localStorage.getItem(`vibeRatings:${pod.id}`);
      const aggregateRaw = direct ?? localStorage.getItem('vibeRatings');
      if (!aggregateRaw) {
        setVibeAverage(null);
        return;
      }
      const parsed = JSON.parse(aggregateRaw);
      const values: unknown = direct ? parsed : parsed?.[pod.id];
      if (!Array.isArray(values)) {
        setVibeAverage(null);
        return;
      }
      const numeric = values
        .map((entry) => Number(entry))
        .filter((value) => Number.isFinite(value) && value > 0) as number[];
      if (numeric.length === 0) {
        if (pod.vibe && pod.vibe > 0) {
          setVibeAverage(Math.round(pod.vibe * 10) / 10);
        } else {
          setVibeAverage(null);
        }
        return;
      }
      const average = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
      setVibeAverage(Math.round(average * 10) / 10);
    } catch (error) {
      console.error('Unable to parse vibe ratings', error);
      setVibeAverage(null);
    }
  }, [pod]);

  useEffect(() => {
    loadVibeAverage();
  }, [loadVibeAverage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (!pod) return;
      if (!event.key || event.key === `vibeRatings:${pod.id}` || event.key === 'vibeRatings') {
        loadVibeAverage();
      }
    };
    const handleCustom = () => loadVibeAverage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('pods:vibe-updated', handleCustom as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pods:vibe-updated', handleCustom as EventListener);
    };
  }, [loadVibeAverage, pod]);

  const isCaptain = role === 'captain';
  const isCaptainCandidate = role === 'captain-candidate';
  const currentUserKey = currentUserId || 'guest';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const resolvedWeek = readStoredWeek();
      setCurrentWeek(resolvedWeek);
      const userId = localStorage.getItem('currentUserId');
      const userName = localStorage.getItem('currentUserName');
      setCurrentUserId(userId);
      setCurrentUserName(userName || 'Friend');
      setRoleState(getRole());
      const storedSignup = localStorage.getItem('signupData');
      if (!storedSignup) {
        navigate('/', { replace: true });
        return;
      }
      const parsedSignup = JSON.parse(storedSignup) as Partial<SignupPreferences>;
      if (!parsedSignup.zone) {
        throw new Error('Signup zone missing');
      }
      setSignupPrefs({
        zone: parsedSignup.zone,
        times: Array.isArray(parsedSignup.times) ? parsedSignup.times.map(String) : [],
        interests: Array.isArray(parsedSignup.interests) ? parsedSignup.interests.map(String) : [],
        tags: Array.isArray(parsedSignup.tags) ? parsedSignup.tags.map(String) : [],
      });
    } catch (error) {
      console.error('Unable to restore signup session', error);
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      const [users, pods, quests, badges, spaces, rewards] = await Promise.all([
        loadJson<User[]>('/data/users.json'),
        loadJson<Pod[]>('/data/pods.json'),
        loadJson<Quest[]>('/data/quests.json'),
        loadJson<Badge[]>('/data/badges.json'),
        loadJson<Space[]>('/data/spaces.json'),
        loadJson<Reward[]>('/data/rewards.json'),
      ]);
      setBundle({
        users: users ?? [],
        pods: pods ?? [],
        quests: quests ?? [],
        badges: badges ?? [],
        spaces: spaces ?? [],
        rewards: rewards ?? [],
      });
      setIsLoadingData(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleRole = () => setRoleState(getRole());
    const syncSession = () => {
      const uid = localStorage.getItem('currentUserId');
      const displayName = localStorage.getItem('currentUserName');
      setCurrentUserId(uid);
      setCurrentUserName(displayName || 'Friend');
      setPointsState(getPoints(uid));
    };
    const handlePoints = (event: Event) => {
      const detail = (event as CustomEvent<number | undefined>).detail;
      if (typeof detail === 'number') {
        setPointsState(detail);
      } else {
        const uid = localStorage.getItem('currentUserId');
        setPointsState(getPoints(uid));
      }
    };

    window.addEventListener('pods:role-updated', handleRole);
    window.addEventListener('pods:session-updated', syncSession);
    window.addEventListener('pods:points-updated', handlePoints as EventListener);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('pods:role-updated', handleRole);
      window.removeEventListener('pods:session-updated', syncSession);
      window.removeEventListener('pods:points-updated', handlePoints as EventListener);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  useEffect(() => {
    setPointsState(getPoints(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    const initial = pointsAnimationStart.current;
    const target = points;
    if (initial === target) {
      setDisplayedPoints(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const duration = 450;
    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const value = Math.round(initial + (target - initial) * progress);
      setDisplayedPoints(value);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    pointsAnimationStart.current = target;
    return () => cancelAnimationFrame(raf);
  }, [points]);

  useEffect(() => {
    if (bundle.badges.length === 0) return;
    try {
      const stored = localStorage.getItem('unlockedBadges');
      if (!stored) {
        setUnlockedBadges([]);
        return;
      }
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        const badges = bundle.badges.filter((badge) => parsed.includes(badge.id));
        setUnlockedBadges(badges);
      }
    } catch (error) {
      console.error('Unable to restore badges', error);
    }
  }, [bundle.badges]);

  useEffect(() => {
    if (!signupPrefs || bundle.pods.length === 0) return;
    const { zone, times, interests } = signupPrefs;
    const timeSet = new Set(times);
    const interestSet = new Set(interests);
    const matchesAll = (candidate: Pod) =>
      candidate.zone === zone &&
      timeSet.has(candidate.timeslot) &&
      candidate.interests.some((value) => interestSet.has(value));
    const matchesZoneTime = (candidate: Pod) => candidate.zone === zone && timeSet.has(candidate.timeslot);
    const matchesZoneInterest = (candidate: Pod) =>
      candidate.zone === zone && candidate.interests.some((value) => interestSet.has(value));

    const chosen =
      bundle.pods.find(matchesAll) ||
      bundle.pods.find(matchesZoneTime) ||
      bundle.pods.find(matchesZoneInterest) ||
      bundle.pods.find((candidate) => candidate.zone === zone) ||
      bundle.pods[0] ||
      null;
    setPod(chosen);
  }, [bundle.pods, signupPrefs]);

  useEffect(() => {
    if (!pod) {
      setPodMembers([]);
      return;
    }
    const members = pod.memberIds
      .map((id) => bundle.users.find((user) => user.id === id))
      .filter((user): user is User => Boolean(user));
    setPodMembers(members);
  }, [pod, bundle.users]);

  useEffect(() => {
    if (bundle.quests.length === 0) {
      setQuest(null);
      return;
    }
    const activeQuest = bundle.quests.find((item) => item.week === currentWeek) || null;
    setQuest(activeQuest);
  }, [bundle.quests, currentWeek]);

  const checkinKey = useMemo(() => (pod ? `checkin:${pod.id}:${currentWeek}:${currentUserKey}` : null), [pod, currentWeek, currentUserKey]);
  const questCompletionKey = useMemo(
    () => (pod ? `quest:${pod.id}:${currentWeek}:${currentUserKey}` : null),
    [pod, currentWeek, currentUserKey]
  );

  useEffect(() => {
    if (!checkinKey) {
      setIsCheckedInThisWeek(false);
      return;
    }
    setIsCheckedInThisWeek(Boolean(localStorage.getItem(checkinKey)));
  }, [checkinKey]);

  useEffect(() => {
    if (!questCompletionKey) {
      setQuestCompleted(false);
      return;
    }
    setQuestCompleted(Boolean(localStorage.getItem(questCompletionKey)));
  }, [questCompletionKey]);

  useEffect(() => {
    if (bundle.spaces.length === 0 || !pod || !pod.zone) return;
    const overrides: Record<string, boolean> = {};
    bundle.spaces.forEach((space) => {
      const override = localStorage.getItem(`spaceAvail:${space.id}`);
      if (override === '0') overrides[space.id] = false;
      if (override === '1') overrides[space.id] = true;
    });
    setAvailabilityOverrides((prev) => ({ ...overrides, ...prev }));

    const persistedSelection = localStorage.getItem(`selectedSpace:${pod.id}`);
    const candidate = persistedSelection
      ? bundle.spaces.find((space) => space.id === persistedSelection)
      : bundle.spaces.find((space) => space.zone === pod.zone && getEffectiveAvailability(space, overrides));
    if (candidate) {
      setSelectedSpace(candidate);
    }
  }, [bundle.spaces, pod]);

  useEffect(() => {
    try {
      const history: { date: string; scores: number[] }[] = JSON.parse(localStorage.getItem('belongingPulse') || '[]');
      if (history.length > 0) {
        const last = history[history.length - 1];
        const lastAvg = last.scores.reduce((sum, value) => sum + value, 0) / last.scores.length;
        setLastBelongingScore(lastAvg);
        if (history.length > 1) {
          const prev = history[history.length - 2];
          const prevAvg = prev.scores.reduce((sum, value) => sum + value, 0) / prev.scores.length;
          setBelongingDelta(lastAvg - prevAvg);
        }
      }
    } catch (error) {
      console.error('Unable to restore belonging pulse history', error);
    }
  }, []);

  const awardBadge = (badgeId: string) => {
    const badge = bundle.badges.find((item) => item.id === badgeId);
    if (!badge) return;
    setUnlockedBadges((prev) => {
      if (prev.some((item) => item.id === badge.id)) {
        return prev;
      }
      const updated = [...prev, badge];
      try {
        localStorage.setItem('unlockedBadges', JSON.stringify(updated.map((item) => item.id)));
      } catch (error) {
        console.error('Unable to persist badge unlock', error);
      }
      return updated;
    });
  };

  const updateWeek = (nextWeek: number) => {
    const safeWeek = clampWeek(nextWeek);
    setCurrentWeek(safeWeek);
    persistWeek(safeWeek);
  };

  const handleCheckIn = () => {
    if (!pod || !checkinKey || isCheckedInThisWeek) return;
    const next = adjustPoints(currentUserKey, 10);
    setPointsState(next);
    localStorage.setItem(checkinKey, '1');
    setIsCheckedInThisWeek(true);
  };

  const handleCompleteQuest = () => {
    if (!pod || !quest || !questCompletionKey || questCompleted) return;
    const next = adjustPoints(currentUserKey, quest.points.base);
    setPointsState(next);
    localStorage.setItem(questCompletionKey, '1');
    setQuestCompleted(true);
    awardBadge(quest.badges[0]);
  };

  const updateSelectedSpace = (space: Space) => {
    setSelectedSpace(space);
    if (pod) {
      try {
        localStorage.setItem(`selectedSpace:${pod.id}`, space.id);
      } catch (error) {
        console.error('Unable to persist selected space', error);
      }
    }
  };

  const toggleAvailability = (spaceId: string) => {
    const source = bundle.spaces.find((space) => space.id === spaceId);
    if (!source) return;
    setAvailabilityOverrides((prev) => {
      const current = getEffectiveAvailability(source, prev);
      const next = !current;
      const updated = { ...prev, [spaceId]: next };
      try {
        localStorage.setItem(`spaceAvail:${spaceId}`, next ? '1' : '0');
      } catch (error) {
        console.error('Unable to persist space availability', error);
      }
      return updated;
    });
  };

  const handleSavePulse = (scores: number[]) => {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (lastBelongingScore !== null) {
      setBelongingDelta(average - lastBelongingScore);
    }
    setLastBelongingScore(average);
  };

  const sortedRewards = useMemo(() => [...bundle.rewards].sort((a, b) => a.cost - b.cost), [bundle.rewards]);
  const nextReward = sortedRewards.find((reward) => reward.cost > points) ?? sortedRewards[sortedRewards.length - 1];
  const progressToNextReward = nextReward ? Math.min(1, points / nextReward.cost) : 0;
  const captainDisplayName = useMemo(() => {
    if (isCaptain) {
      return currentUserName;
    }
    if (pod?.captainId) {
      const match = bundle.users.find((user) => user.id === pod.captainId);
      return match?.name || 'Captain TBD';
    }
    return 'Captain TBD';
  }, [isCaptain, currentUserName, pod?.captainId, bundle.users]);

  const dashboardInterests = ((signupPrefs?.interests?.length ? signupPrefs.interests : pod?.interests) ?? []).filter(
    (interest) => interest && interest.trim().length > 0
  );
  const dashboardTags = (signupPrefs?.tags ?? []).filter((tag) => tag && tag.trim().length > 0);
  const viewingCurrentWeek = currentWeek === realWeek;
  const checkInDisabled = isCheckedInThisWeek;
  const checkInButtonLabel = isCheckedInThisWeek ? 'Checked In' : 'Check in (+10)';
  const checkInTooltip = undefined;
  const nextCheckInWeek = clampWeek(currentWeek + 1);
  const checkInMessage = isCheckedInThisWeek
    ? `Great work—next check-in unlocks on Week ${nextCheckInWeek}.`
    : 'One check-in per week keeps your pod energized.';

  const sortedBadges = useMemo(() => {
    const unlockedIds = new Set(unlockedBadges.map((badge) => badge.id));
    return bundle.badges
      .slice()
      .sort((a, b) => {
        const aUnlocked = unlockedIds.has(a.id);
        const bUnlocked = unlockedIds.has(b.id);
        if (aUnlocked === bUnlocked) return a.name.localeCompare(b.name);
        return aUnlocked ? -1 : 1;
      });
  }, [bundle.badges, unlockedBadges]);

  if (isLoadingData || !signupPrefs) {
    return <div className="p-4">Loading your pod…</div>;
  }

  if (!pod) {
    return (
      <div className="p-4 bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-xl">
        We couldn&apos;t find a matching pod. Please head back to the sign-up page and try again.
      </div>
    );
  }

  if (!quest) {
    return <div className="p-4">Loading this week&apos;s quest…</div>;
  }

  return (
    <div className="space-y-8">
      <section className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-asuMaroon/80">Welcome back</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-asuMaroon">{currentUserName}</h1>
            <p className="text-gray-600 mt-2">
              {(pod.zone || 'Zone TBD')} Pod · {pod.timeslot || 'Time TBD'} · {podMembers.length} members
            </p>
          </div>
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="bg-asuMaroon text-white rounded-2xl px-5 py-3 text-center shadow">
              <p className="text-xs uppercase tracking-wide text-white/70">Viewing Week</p>
              <p className="text-2xl font-bold">Week {currentWeek} / 14</p>
              <p className="mt-2 text-xs font-semibold text-white/70">Real week: {realWeek}</p>
            </div>
            <div className="bg-asuGold text-black rounded-2xl px-5 py-3 text-center shadow">
              <p className="text-xs uppercase tracking-wide text-black/60">Captain</p>
              <p className="text-lg font-semibold">{captainDisplayName}</p>
              {isCaptainCandidate && (
                <p className="text-[11px] font-semibold text-asuMaroon">Pending approval</p>
              )}
              {!pod.captainId && !isCaptain && !isCaptainCandidate && (
                <p className="text-[11px] font-semibold text-asuMaroon">Role open — apply to lead</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {dashboardInterests.map((interest) => (
            <span key={interest} className="px-3 py-1 rounded-full bg-asuGray text-asuMaroon/80">
              {interest}
            </span>
          ))}
        </div>
        {dashboardTags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px] text-asuMaroon/80">
            {dashboardTags.map((tag) => (
              <span key={tag} className="rounded-full border border-asuMaroon/30 px-3 py-1 bg-white/70">
                {formatTagLabel(tag)}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-asuMaroon">Pod Roster</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {podMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <span>{member.name}</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {(() => {
                    if (isCaptain && member.id === currentUserKey) return 'Captain';
                    if (isCaptainCandidate && member.id === currentUserKey) return 'Candidate';
                    if (pod.captainId && member.id === pod.captainId) return 'Captain';
                    return 'Member';
                  })()}
                </span>
              </li>
            ))}
          </ul>
          {vibeAverage !== null && (
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                Vibe average {vibeAverage.toFixed(1)}/5. Keep the rituals going to boost connection.
              </span>
              <span
                role="img"
                aria-label="Vibe is a private pod average"
                title="Vibe is a private pod average"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-asuMaroon/10 text-[11px] font-semibold text-asuMaroon"
              >
                i
              </span>
            </p>
          )}
        </div>
        <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-asuMaroon">Connection Quest · Week {currentWeek}</h2>
                <p className="text-base text-gray-700 font-semibold">{quest.title}</p>
                <p className="text-sm text-gray-600">{quest.description}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => updateWeek(currentWeek - 1)}
                  disabled={currentWeek <= 1}
                  className="rounded-full border border-asuMaroon/30 px-4 py-2 font-semibold text-asuMaroon transition hover:bg-asuMaroon/10 disabled:cursor-not-allowed disabled:border-asuGray disabled:text-gray-400"
                >
                  Previous week
                </button>
                <button
                  type="button"
                  onClick={() => updateWeek(currentWeek + 1)}
                  disabled={currentWeek >= 14}
                  className="rounded-full border border-asuMaroon/30 px-4 py-2 font-semibold text-asuMaroon transition hover:bg-asuMaroon/10 disabled:cursor-not-allowed disabled:border-asuGray disabled:text-gray-400"
                >
                  Next week
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:items-start">
                <button
                  onClick={handleCheckIn}
                  disabled={checkInDisabled}
                  title={checkInTooltip}
                  className={`rounded-full px-4 py-2 font-semibold text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-asuGold ${
                    checkInDisabled
                      ? 'bg-asuGray text-gray-500 cursor-not-allowed'
                      : 'bg-asuMaroon text-white hover:bg-[#6f1833]'
                  }`}
                >
                  {checkInButtonLabel}
                </button>
                <p className="text-xs text-gray-500 text-center sm:text-left">{checkInMessage}</p>
              </div>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <button
                  onClick={handleCompleteQuest}
                  disabled={questCompleted}
                  className={`rounded-full px-4 py-2 font-semibold text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-asuGold/60 ${
                    questCompleted ? 'bg-asuGray text-gray-500 cursor-not-allowed' : 'bg-asuGold text-black hover:brightness-95'
                  }`}
                >
                  {questCompleted ? 'Quest Completed' : 'Complete Quest (+30)'}
                </button>
                <p className="text-xs text-gray-500 text-center sm:text-right">
                  Unlock extra points by finishing together before Week {clampWeek(currentWeek + 1)}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-asuMaroon/80">Pod points</p>
              <h2 className="text-3xl font-extrabold text-asuMaroon">{displayedPoints.toLocaleString()} pts</h2>
            </div>
            <button
              onClick={() => navigate('/store')}
              className="rounded-full px-5 py-2 bg-asuGold text-black font-semibold text-sm hover:brightness-95"
            >
              Open Store
            </button>
          </div>
          {nextReward && (
            <div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Next reward: {nextReward.name}</span>
                <span>{Math.max(nextReward.cost - points, 0)} pts to go</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-asuGray overflow-hidden">
                <div className="h-full rounded-full bg-asuMaroon transition-all" style={{ width: `${progressToNextReward * 100}%` }} />
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-asuMaroon uppercase tracking-wide mb-3">Badges</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedBadges.map((badge) => {
                const unlocked = unlockedBadges.some((item) => item.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`relative flex items-start gap-3 rounded-xl border px-4 py-4 shadow-sm transition ${
                      unlocked
                        ? 'border-asuMaroon/40 bg-white'
                        : 'border-asuGray/50 bg-white/80 opacity-60'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-asuMaroon to-asuGold"
                    />
                    <span className={`text-2xl ${unlocked ? 'text-asuMaroon' : 'text-asuMaroon/50'}`} aria-hidden>
                      {badge.icon || '🏅'}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm font-semibold ${unlocked ? 'text-asuMaroon' : 'text-gray-600'}`}>{badge.name}</p>
                      <p className="text-xs text-gray-500">{badge.criteria}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        unlocked ? 'bg-asuMaroon/10 text-asuMaroon' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {!unlocked && (
                        <span aria-hidden role="img">
                          🔒
                        </span>
                      )}
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-asuMaroon">Meeting Space</h2>
            {isCaptain && (
              <button
                onClick={() => setShowSpacePicker(true)}
                className="text-sm font-semibold text-asuMaroon hover:underline"
              >
                Choose Space
              </button>
            )}
          </div>
          {selectedSpace ? (
            <div className="space-y-1 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">{selectedSpace.name}</p>
              <p className="text-xs text-gray-500">
                Capacity {selectedSpace.capacity} · {selectedSpace.ada ? 'ADA friendly' : 'Standard'} ·{' '}
                {selectedSpace.sensoryFriendly ? 'Low stimulus' : 'Active'}
              </p>
              {!getEffectiveAvailability(selectedSpace, availabilityOverrides) && (
                <p className="text-xs text-red-600 font-semibold">Currently marked unavailable by your captain.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No space selected yet.</p>
          )}
          {!isCaptain && (
            <p className="text-xs text-gray-500">Only your captain can change this.</p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-asuMaroon">Belonging Pulse</h2>
          {lastBelongingScore !== null ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Last average: <span className="font-semibold text-asuMaroon">{lastBelongingScore.toFixed(1)}</span> / 5
              </p>
              {belongingDelta !== null && (
                <p className="text-xs text-gray-500">
                  Change since previous pulse:{' '}
                  <span className={belongingDelta >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {belongingDelta >= 0 ? '+' : ''}
                    {belongingDelta.toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">You haven&apos;t taken the pulse yet.</p>
          )}
          <button
            onClick={() => setShowPulseModal(true)}
            className="rounded-full px-4 py-2 bg-asuMaroon text-white text-sm font-semibold hover:bg-[#6f1833]"
          >
            Take Pulse
          </button>
        </div>
        <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-asuMaroon">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {!isCaptain && !isCaptainCandidate && (
              <button
                onClick={() => navigate('/apply')}
                className="sm:col-span-2 rounded-2xl border border-asuMaroon bg-asuMaroon text-white px-4 py-3 text-sm font-semibold shadow hover:bg-[#6f1833]"
              >
                Become a Peer Captain
              </button>
            )}
            <button
              onClick={() => navigate('/store')}
              className="rounded-2xl border border-asuMaroon/30 bg-asuMaroon/5 px-4 py-3 text-sm font-semibold text-asuMaroon hover:bg-asuMaroon/10"
            >
              Redeem Rewards
            </button>
            {(isCaptain || isCaptainCandidate) && (
              <button
                onClick={() => navigate('/captain')}
                className="rounded-2xl border border-asuGold/40 bg-asuGold/20 px-4 py-3 text-sm font-semibold text-asuMaroon hover:brightness-95"
              >
                Open Captain Console
              </button>
            )}
            <button
              onClick={() => navigate('/signup')}
              className="rounded-2xl border border-asuGray bg-asuGray px-4 py-3 text-sm font-semibold text-asuMaroon hover:border-asuMaroon/30"
            >
              Update Preferences
            </button>
          </div>
        </div>
      </section>

      {showSpacePicker && (
        <SpacePicker
          zone={pod.zone}
          spaces={bundle.spaces}
          isCaptain={isCaptain}
          availabilityOverrides={availabilityOverrides}
          onSelect={(space) => {
            updateSelectedSpace(space);
            setShowSpacePicker(false);
          }}
          onToggleAvailability={toggleAvailability}
          onClose={() => setShowSpacePicker(false)}
        />
      )}
      {showPulseModal && (
        <BelongingPulse
          onSave={handleSavePulse}
          onClose={() => setShowPulseModal(false)}
        />
      )}
    </div>
  );
};

export default PodDashboard;
