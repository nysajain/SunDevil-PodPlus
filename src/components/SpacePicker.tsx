import React, { useMemo } from 'react';

type AvailabilityOverrides = Record<string, boolean>;

export interface Space {
  id: string;
  name: string;
  zone: string;
  ada: boolean;
  sensoryFriendly: boolean;
  capacity: number;
  available?: boolean;
}

interface SpacePickerProps {
  zone: string;
  spaces: Space[];
  isCaptain: boolean;
  availabilityOverrides: AvailabilityOverrides;
  onSelect: (space: Space) => void;
  onToggleAvailability: (spaceId: string) => void;
  onClose: () => void;
}

const getEffectiveAvailability = (space: Space, overrides: AvailabilityOverrides) => {
  if (space.id in overrides) {
    return overrides[space.id];
  }
  return typeof space.available === 'boolean' ? space.available : true;
};

const AvailabilityPill: React.FC<{ isAvailable: boolean }> = ({ isAvailable }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}
  >
    {isAvailable ? 'Available' : 'Unavailable'}
  </span>
);

const SpacePicker: React.FC<SpacePickerProps> = ({
  zone,
  spaces,
  isCaptain,
  availabilityOverrides,
  onSelect,
  onToggleAvailability,
  onClose,
}) => {
  const filtered = useMemo(() => spaces.filter((space) => space.zone === zone), [spaces, zone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white/90 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-asuMaroon">Select a Meeting Space</h2>
            <p className="text-sm text-gray-600">Showing spaces in the {zone} zone.</p>
          </div>
          <button onClick={onClose} className="text-sm text-asuMaroon hover:underline">
            Close
          </button>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-600">No spaces available for this zone.</p>
        ) : (
          <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((space) => {
              const isAvailable = getEffectiveAvailability(space, availabilityOverrides);
              return (
                <li
                  key={space.id}
                  className="border border-white/60 rounded-xl bg-white/80 backdrop-blur p-4 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{space.name}</p>
                      <p className="text-xs text-gray-500">
                        Capacity {space.capacity} · {space.ada ? 'ADA friendly' : 'Standard'} ·{' '}
                        {space.sensoryFriendly ? 'Low stimulus' : 'Active'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AvailabilityPill isAvailable={isAvailable} />
                      {isCaptain && (
                        <button
                          onClick={() => onToggleAvailability(space.id)}
                          className="text-xs font-semibold px-3 py-1 rounded-full border border-asuMaroon/40 text-asuMaroon hover:bg-asuMaroon/10"
                        >
                          {isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => onSelect(space)}
                      disabled={!isAvailable && !isCaptain}
                      className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
                        isAvailable ? 'bg-asuMaroon text-white hover:bg-[#6f1833]' : 'bg-asuGray text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isAvailable || isCaptain ? 'Select' : 'Unavailable'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SpacePicker;
