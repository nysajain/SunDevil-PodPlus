export type TagOption = {
  value: string;
  label: string;
};

export const TAG_OPTIONS: TagOption[] = [
  { value: 'mixed_identities', label: 'Mixed Identities' },
  { value: 'minority_group', label: 'Minority Groups' },
  { value: 'out_of_state', label: 'Out-of-State Students' },
  { value: 'non_traditional', label: 'Non-traditional Students' },
  { value: 'language', label: 'Language (ESL / multilingual)' },
  { value: 'disability', label: 'Disability' },
  { value: 'age', label: 'Age' },
  { value: 'finance_work', label: 'Finance / Work' },
  { value: 'commuter', label: 'Commuter' },
  { value: 'international', label: 'International' },
  { value: 'first_gen', label: 'First-Gen' },
  { value: 'sensory', label: 'Sensory Needs' },
  { value: 'mobility', label: 'Mobility Needs' },
  { value: 'language_ally', label: 'Language Ally' },
];

const LABEL_LOOKUP: Record<string, string> = TAG_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<string, string>);

export const formatTagLabel = (value: string): string => {
  if (value.startsWith('other:')) {
    const custom = value.slice('other:'.length).trim();
    return custom ? `Other: ${custom}` : 'Other';
  }
  return LABEL_LOOKUP[value] ?? value;
};

