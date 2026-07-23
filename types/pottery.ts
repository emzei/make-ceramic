export type RadiusProfile = number[];

export type DifficultyTier = 1 | 2 | 3;

export interface TargetPreset {
  id: string;
  difficultyTier: DifficultyTier;
  noun: string;
  profile: RadiusProfile;
}
