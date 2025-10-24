import React from 'react';
import { Link } from 'react-router-dom';

const ApplySuccess: React.FC = () => (
  <div className="space-y-8">
    <section className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-asuMaroon/60">Application received</p>
      <h1 className="mt-2 text-4xl font-extrabold text-asuMaroon">Thanks for stepping up!</h1>
      <p className="mt-4 text-sm text-gray-600">
        Your captain application is now pending review. Keep an eye on your inbox—we&apos;ll reach out with next steps within a week. In the meantime you can explore the dashboard or keep simulating pod scenarios.
      </p>
      <p className="mt-3 rounded-2xl border border-asuMaroon/15 bg-white/70 px-4 py-3 text-sm text-asuMaroon">
        You&apos;re now on the path to becoming a Peer Captain. Complete the semester to earn a Letter of Recommendation and a
        Completion Certificate.
      </p>
    </section>

    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl border border-asuGold/50 bg-asuGold/20 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-asuMaroon">What&apos;s in it for you</h2>
        <ul className="mt-4 space-y-2 text-sm text-asuMaroon/90">
          <li>Letter of Recommendation — awarded by program sponsors after a successful semester.</li>
          <li>Completion Certificate — a digital credential you can share with employers and campus partners.</li>
        </ul>
      </div>
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
        <h2 className="text-xl font-bold text-asuMaroon">Next up</h2>
        <p className="mt-2 text-sm text-gray-600">
          Want to keep prototyping? Jump back into the student dashboard or explore the Captain Console preview.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-full bg-asuMaroon px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[#6f1833]"
          >
            View dashboard
          </Link>
          <Link
            to="/captain"
            className="rounded-full border border-asuMaroon/50 px-5 py-2 text-sm font-semibold text-asuMaroon hover:bg-asuMaroon/10"
          >
            Open Captain Console
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default ApplySuccess;
