import React, { useState } from 'react';

/**
 * BelongingPulse is a modal component that prompts the user to
 * reflect on their sense of belonging and connection. It
 * presents three Likert-scale questions and saves the results
 * to localStorage when submitted. The parent can react to
 * new scores via the onSave callback. We intentionally keep
 * this component self-contained so it can be reused or
 * extended in the future.
 */
interface BelongingPulseProps {
  /** Called with the array of scores (1–5) when the user saves */
  onSave: (scores: number[]) => void;
  /** Called when the modal should be closed without saving */
  onClose: () => void;
}

// Questions matching the pilot evaluation criteria. These
// correspond to the three items defined in the build spec.
const PULSE_QUESTIONS = [
  'I feel like I belong at ASU.',
  'I have at least two peers I can reach out to for help.',
  'I feel comfortable approaching others in my pod.',
];

const BelongingPulse: React.FC<BelongingPulseProps> = ({ onSave, onClose }) => {
  // Use local state to track the current selection for each
  // question. Initialize with 3 (neutral) for a gentle default.
  const [scores, setScores] = useState<number[]>([3, 3, 3]);

  // Handle radio input change. Each radio corresponds to a
  // question index (0–2) and value (1–5).
  const handleChange = (idx: number, value: number) => {
    setScores(prev => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  // Save the scores to localStorage and notify parent. We
  // append a timestamped entry to the belongingPulse array and
  // propagate the scores up for immediate UI updates.
  const handleSave = () => {
    try {
      const history: { date: string; scores: number[] }[] = JSON.parse(
        localStorage.getItem('belongingPulse') || '[]'
      );
      history.push({ date: new Date().toISOString(), scores });
      localStorage.setItem('belongingPulse', JSON.stringify(history));
    } catch (e) {
      // If parsing fails, start a new history.
      const history = [{ date: new Date().toISOString(), scores }];
      localStorage.setItem('belongingPulse', JSON.stringify(history));
    }
    onSave(scores);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="belonging-pulse-heading"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-asuMaroon/15 bg-[#fdf9f3] p-8 text-left shadow-[0_28px_60px_rgba(111,24,51,0.22)]">
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/60 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative space-y-6">
          <header className="space-y-3">
            <h2 id="belonging-pulse-heading" className="text-2xl font-extrabold text-asuMaroon">
              Belonging Pulse
            </h2>
            <p className="text-sm text-gray-700">
              Reflect on your experience so far. Choose a number from 1 (strongly disagree) to 5 (strongly agree) for each
              statement.
            </p>
          </header>
          <div className="space-y-5 max-h-[22rem] overflow-y-auto pr-1">
            {PULSE_QUESTIONS.map((question, idx) => (
              <fieldset key={question} className="space-y-3" aria-describedby={`question-${idx}-helper`}>
                <legend className="text-sm font-semibold text-asuMaroon">{question}</legend>
                <p id={`question-${idx}-helper`} className="text-xs text-gray-500">
                  Tap a number to log how you feel right now.
                </p>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className="flex flex-col items-center text-xs font-semibold text-asuMaroon">
                      <input
                        type="radio"
                        name={`question-${idx}`}
                        value={value}
                        checked={scores[idx] === value}
                        onChange={() => handleChange(idx, value)}
                        className="sr-only peer"
                        aria-label={`${question} response ${value}`}
                      />
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-asuMaroon/30 bg-white text-sm transition peer-checked:bg-gradient-to-br peer-checked:from-asuMaroon peer-checked:via-asuMaroon peer-checked:to-asuGold peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-asuGold"
                      >
                        {value}
                      </span>
                      <span className="mt-1 text-[10px] font-normal text-gray-500">{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-asuMaroon/20 px-5 py-2 text-sm font-semibold text-asuMaroon transition hover:bg-asuMaroon/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-asuGold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-gradient-to-r from-asuMaroon via-asuMaroon to-asuGold px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-asuGold"
            >
              Save pulse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BelongingPulse;
