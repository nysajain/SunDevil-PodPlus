import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPoints, setPoints as setStoredPoints } from '../lib/points';
import { currentUserId as getCurrentUserId } from '../lib/roles';

type Reward = {
  id: string;
  name: string;
  description: string;
  cost: number;
};

const Store: React.FC = () => {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [points, setPoints] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return getPoints(getCurrentUserId());
  });
  const [redeemed, setRedeemed] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('redeemed');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/rewards.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Unable to load rewards.json: ${res.status}`);
        }
        return res.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        setRewards(
          data
            .map((item: any) => ({
              id: String(item.id),
              name: String(item.name),
              description: String(item.description),
              cost: Number(item.cost) || 0,
            }))
            .sort((a, b) => a.cost - b.cost)
        );
      })
      .catch((error) => {
        console.error('Unable to load rewards', error);
        setRewards([]);
      });
  }, []);

  useEffect(() => {
    const syncPoints = () => setPoints(getPoints(getCurrentUserId()));
    const handlePoints = (event: Event) => {
      const detail = (event as CustomEvent<number | undefined>).detail;
      if (typeof detail === 'number') {
        setPoints(detail);
      } else {
        syncPoints();
      }
    };
    window.addEventListener('pods:points-updated', handlePoints as EventListener);
    window.addEventListener('storage', syncPoints);
    window.addEventListener('pods:session-updated', syncPoints);
    return () => {
      window.removeEventListener('pods:points-updated', handlePoints as EventListener);
      window.removeEventListener('storage', syncPoints);
      window.removeEventListener('pods:session-updated', syncPoints);
    };
  }, []);

  const persistPoints = (value: number) => {
    setPoints(value);
    try {
      setStoredPoints(getCurrentUserId(), value);
    } catch (error) {
      console.error('Unable to persist points after redemption', error);
    }
  };

  const persistRedemptions = (ids: string[]) => {
    setRedeemed(ids);
    try {
      localStorage.setItem('redeemed', JSON.stringify(ids));
    } catch (error) {
      console.error('Unable to persist redemption history', error);
    }
  };

  const handleRedeem = (reward: Reward) => {
    if (points < reward.cost) return;
    const updatedPoints = points - reward.cost;
    persistPoints(updatedPoints);
    const updatedRedeemed = [...redeemed, reward.id];
    persistRedemptions(updatedRedeemed);
    setMessage(`Redeemed ${reward.name}! Nice work staying connected.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 sm:p-8 space-y-3">
        <h1 className="text-3xl font-extrabold text-asuMaroon">Pod Rewards Store</h1>
        <div className="rounded-2xl border border-asuGold/40 bg-asuGold/20 px-4 py-2 text-xs font-semibold text-asuMaroon">
          Powered by Sun Devil Rewards (mock integration)
        </div>
        <p className="text-gray-600 text-sm">
          Trade the points your pod has earned for celebratory perks. Keep attending quests and checking in to unlock bigger rewards!
        </p>
        <div className="flex items-center gap-3">
          <div className="bg-asuMaroon text-white rounded-2xl px-5 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-white/70">Available Points</p>
            <p className="text-2xl font-bold">{points.toLocaleString()}</p>
          </div>
          {message && <span className="text-sm text-emerald-600 font-semibold">{message}</span>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {rewards.map((reward) => {
          const affordable = points >= reward.cost;
          const alreadyRedeemed = redeemed.includes(reward.id);
          return (
            <div
              key={reward.id}
              className="bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-xl p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-asuMaroon">{reward.name}</h2>
                <p className="text-sm text-gray-600">{reward.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-asuMaroon">
                <span>{reward.cost} pts</span>
                {alreadyRedeemed && <span className="text-xs text-emerald-600">Redeemed</span>}
              </div>
              <button
                onClick={() => handleRedeem(reward)}
                disabled={!affordable}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  affordable ? 'bg-asuGold text-black hover:brightness-95' : 'bg-asuGray text-gray-400 cursor-not-allowed'
                }`}
              >
                {affordable ? 'Redeem' : 'Keep Earning' }
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        Want more rewards?{' '}
        <a
          href="https://sundevilrewards.asu.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
        >
          See more here
        </a>
        .
      </p>

      <button
        onClick={() => navigate('/dashboard')}
        className="rounded-full px-5 py-3 bg-asuMaroon text-white text-sm font-semibold shadow-lg hover:bg-[#6f1833]"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default Store;
