export type RadiusProfile = number[];

export type DifficultyTier = 1 | 2 | 3;

export interface TargetPreset {
  id: string;
  difficultyTier: DifficultyTier;
  noun: string;
  profile: RadiusProfile;
}

export interface RankingEntry {
  nickname: string;
  score: number;
  registeredAt: number;
}
