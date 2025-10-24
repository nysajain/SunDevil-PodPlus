import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';

interface User {
  id: string;
  name: string;
  email: string;
  zone: string;
  interests: string[];
  times: string[];
  tags: string[];
}

interface Pod {
  id: string;
  zone: string;
  timeslot: string;
  interests: string[];
  tags: string[];
  memberIds: string[];
  points: number;
  level: number;
  vibe: number;
}

// Read CSV file and parse users
function readUsers(csvPath: string): User[] {
  const content = fs.readFileSync(csvPath, 'utf8');
  const records = csvParse(content, { columns: true, skip_empty_lines: true });
  return records.map((rec: any, idx: number) => ({
    id: `u-${(idx + 1).toString().padStart(3, '0')}`,
    name: rec.name.trim(),
    email: rec.email.trim(),
    zone: rec.zone.trim(),
    interests: rec.interests
      .split(/;|,/)
      .map((s: string) => s.trim())
      .filter(Boolean),
    times: rec.times
      .split(/;|,/)
      .map((s: string) => s.trim())
      .filter(Boolean),
    tags: rec.tags
      ? rec.tags
          .split(/;|,/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : []
  }));
}

// Generate a simple unique ID
function uid(prefix: string, num: number): string {
  return `${prefix}-${num.toString().padStart(3, '0')}`;
}

// Matching algorithm: group by zone, time slot, shared interest and tags
function matchPods(users: User[]): Pod[] {
  const pods: Pod[] = [];
  let podCounter = 1;

  // Group users by zone
  const usersByZone: { [zone: string]: User[] } = {};
  users.forEach((u) => {
    usersByZone[u.zone] = usersByZone[u.zone] || [];
    usersByZone[u.zone].push(u);
  });

  const isMidday = (slot: string) => {
    return /11:\d{2}|12:\d{2}|13:\d{2}/.test(slot);
  };

  Object.keys(usersByZone).forEach((zone) => {
    const zoneUsers = usersByZone[zone];

    // Build index by timeslot
    const timeslots = Array.from(
      new Set(zoneUsers.flatMap((u) => u.times))
    );

    // Process slots, starting with midday slots to favour commuters
    timeslots.sort((a, b) => {
      const aMid = isMidday(a) ? 1 : 0;
      const bMid = isMidday(b) ? 1 : 0;
      return bMid - aMid;
    });

    timeslots.forEach((slot) => {
      // Filter users available at this slot
      let slotUsers = zoneUsers.filter((u) => u.times.includes(slot));
      // Sort to prioritise commuters for midday slots
      slotUsers.sort((a, b) => {
        const aComm = a.tags.includes('commuter') ? 1 : 0;
        const bComm = b.tags.includes('commuter') ? 1 : 0;
        return bComm - aComm;
      });

      // Greedy grouping: create pods while enough users remain
      while (slotUsers.length >= 5) {
        const podMembers: User[] = [];
        const first = slotUsers.shift()!;
        podMembers.push(first);

        // Add others who share at least one interest with the first user
        for (let i = slotUsers.length - 1; i >= 0 && podMembers.length < 8; i--) {
          const candidate = slotUsers[i];
          if (
            candidate.interests.some((i1) => first.interests.includes(i1))
          ) {
            podMembers.push(candidate);
            slotUsers.splice(i, 1);
          }
        }

        // If we have an international student but no language_ally, try to add one
        const hasInternational = podMembers.some((u) => u.tags.includes('international'));
        const hasLanguageAlly = podMembers.some((u) => u.tags.includes('language_ally'));
        if (hasInternational && !hasLanguageAlly) {
          const idxLa = slotUsers.findIndex((u) => u.tags.includes('language_ally'));
          if (idxLa >= 0 && podMembers.length < 8) {
            podMembers.push(slotUsers.splice(idxLa, 1)[0]);
          }
        }

        // If still short, fill with any remaining users
        while (podMembers.length < 5 && slotUsers.length > 0) {
          podMembers.push(slotUsers.shift()!);
        }

        // Assemble pod
        const podId = uid('pod', podCounter++);
        const commonInterests = Array.from(
          new Set(podMembers.flatMap((u) => u.interests))
        );
        const allTags = Array.from(new Set(podMembers.flatMap((u) => u.tags)));
        const pod: Pod = {
          id: podId,
          zone: zone,
          timeslot: slot,
          interests: commonInterests,
          tags: allTags,
          memberIds: podMembers.map((u) => u.id),
          points: 0,
          level: 1,
          vibe: 0
        };
        pods.push(pod);
      }
    });
  });

  return pods;
}

function writePods(pods: Pod[], outPath: string): void {
  fs.writeFileSync(outPath, JSON.stringify(pods, null, 2));
}

// Main
const studentsPath = path.join(__dirname, '..', 'public', 'data', 'students.csv');
const podsOutPath = path.join(__dirname, '..', 'public', 'data', 'pods.json');
const users = readUsers(studentsPath);
const pods = matchPods(users);
writePods(pods, podsOutPath);
console.log(`Generated ${pods.length} pods at ${podsOutPath}`);
