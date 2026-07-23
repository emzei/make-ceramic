interface AdjectiveTier {
  maxTotalScore: number;
  adjectives: string[];
}

const ADJECTIVE_TIERS: AdjectiveTier[] = [
  { maxTotalScore: 99, adjectives: ["삐뚤어진", "찌그러진", "위태로운"] },
  { maxTotalScore: 199, adjectives: ["소박한", "투박한", "엉성한"] },
  { maxTotalScore: Infinity, adjectives: ["우아한", "매끈한", "균형잡힌"] },
];

export function generateNickname(totalScore: number, noun: string): string {
  const tier = ADJECTIVE_TIERS.find((t) => totalScore <= t.maxTotalScore) ?? ADJECTIVE_TIERS[ADJECTIVE_TIERS.length - 1];
  const adjective = tier.adjectives[Math.floor(Math.random() * tier.adjectives.length)];
  return `${adjective} ${noun}`;
}
