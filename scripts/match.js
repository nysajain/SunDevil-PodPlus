const fs = require('fs');
const path = require('path');
const { parse: csvParse } = require('csv-parse/sync');

function readUsers(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const records = csvParse(content, { columns: true, skip_empty_lines: true });
  return records.map((rec, idx) => ({
    id: `u-${String(idx + 1).padStart(3, '0')}`,
    name: String(rec.name || '').trim(),
    email: String(rec.email || '').trim(),
    zone: String(rec.zone || '').trim(),
    interests: String(rec.interests || '')
      .split(/;|,/) 
      .map((s) => s.trim())
      .filter(Boolean),
    times: String(rec.times || '')
      .split(/;|,/) 
      .map((s) => s.trim())
      .filter(Boolean),
    tags: rec.tags
      ? String(rec.tags)
          .split(/;|,/) 
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  }));
}

function uid(prefix, num) {
  return `${prefix}-${String(num).padStart(3, '0')}`;
}

function matchPods(users) {
  const pods = [];
  let podCounter = 1;

  const usersByZone = {};
  users.forEach((u) => {
    usersByZone[u.zone] = usersByZone[u.zone] || [];
    usersByZone[u.zone].push(u);
  });

  const isMidday = (slot) => /11:\\d{2}|12:\\d{2}|13:\\d{2}/.test(slot);

  Object.keys(usersByZone).forEach((zone) => {
    const zoneUsers = usersByZone[zone];
    const timeslots = Array.from(new Set(zoneUsers.flatMap((u) => u.times)));

    timeslots.sort((a, b) => (isMidday(b) ? 1 : 0) - (isMidday(a) ? 1 : 0));

    timeslots.forEach((slot) => {
      let slotUsers = zoneUsers.filter((u) => u.times.includes(slot));
      slotUsers.sort((a, b) => (b.tags.includes('commuter') ? 1 : 0) - (a.tags.includes('commuter') ? 1 : 0));

      while (slotUsers.length >= 5) {
        const podMembers = [];
        const first = slotUsers.shift();
        podMembers.push(first);

        for (let i = slotUsers.length - 1; i >= 0 && podMembers.length < 8; i--) {
          const candidate = slotUsers[i];
          if (candidate.interests.some((i1) => first.interests.includes(i1))) {
            podMembers.push(candidate);
            slotUsers.splice(i, 1);
          }
        }

        const hasInternational = podMembers.some((u) => u.tags.includes('international'));
        const hasLanguageAlly = podMembers.some((u) => u.tags.includes('language_ally'));
        if (hasInternational && !hasLanguageAlly) {
          const idxLa = slotUsers.findIndex((u) => u.tags.includes('language_ally'));
          if (idxLa >= 0 && podMembers.length < 8) podMembers.push(slotUsers.splice(idxLa, 1)[0]);
        }

        while (podMembers.length < 5 && slotUsers.length > 0) podMembers.push(slotUsers.shift());

        const podId = uid('pod', podCounter++);
        const commonInterests = Array.from(new Set(podMembers.flatMap((u) => u.interests)));
        const allTags = Array.from(new Set(podMembers.flatMap((u) => u.tags)));
        pods.push({
          id: podId,
          zone,
          timeslot: slot,
          interests: commonInterests,
          tags: allTags,
          memberIds: podMembers.map((u) => u.id),
          points: 0,
          level: 1,
          vibe: 0,
        });
      }
    });
  });

  return pods;
}

function writePods(pods, outPath) {
  fs.writeFileSync(outPath, JSON.stringify(pods, null, 2));
}

const studentsPath = path.join(__dirname, '..', 'public', 'data', 'students.csv');
const podsOutPath = path.join(__dirname, '..', 'public', 'data', 'pods.json');
const users = readUsers(studentsPath);
const pods = matchPods(users);
writePods(pods, podsOutPath);
console.log(`Generated ${pods.length} pods at ${podsOutPath}`);

