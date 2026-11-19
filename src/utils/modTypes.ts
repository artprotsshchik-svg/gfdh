import type { IncompatibilityRule } from '../data/modsData.ts';

export interface ConflictDetection {
  rule: IncompatibilityRule;
  matchedIds: string[];
  matchedNames: string[];
}

export interface DependencyWarning {
  modId: string;
  modName: string;
  severity: 'red' | 'yellow';
  message: string;
  fixModIds?: string[];
}

export interface DualPortPair {
  id: string;
  title: string;
  forgeModId: string;
  forgeLabel: string;
  forgeSummary: string;
  fabricModId: string;
  fabricLabel: string;
  fabricSummary: string;
  switchableOnForge: boolean;
  altForgeIds?: string[];
  altFabricIds?: string[];
}

export type CheckerTier = 'green' | 'lime' | 'yellow' | 'red';

export type PortStrategy = 'native-forge' | 'hybrid' | 'fabric-sinytra';
export type RecipeViewerChoice = 'none' | 'jei' | 'emi' | 'emi-jei';
export type PackScale = 'light' | 'medium' | 'heavy';

export interface AssemblyPreferences {
  gpu: 'nvidia' | 'amd-intel' | 'integrated';
  mode: 'singleplayer' | 'server' | 'hybrid-server';
  useShaders: boolean;
  useCreate: boolean;
  allowSinytra: boolean;
  portStrategy?: PortStrategy;
  recipeViewer?: RecipeViewerChoice;
  packScale?: PackScale;
  goal: 'balanced' | 'max-safe' | 'potato';
  focusModId?: string | null;
}

export const INITIAL_BUILDER_PREFS: AssemblyPreferences = {
  gpu: 'nvidia',
  mode: 'singleplayer',
  useShaders: false,
  useCreate: false,
  allowSinytra: true,
  portStrategy: 'hybrid',
  recipeViewer: 'jei',
  packScale: 'medium',
  goal: 'balanced',
  focusModId: null,
};

export interface ExcludedModNote {
  name: string;
  reason: string;
}

export interface SmartAssemblyResult {
  modIds: string[];
  notes: string[];
  excluded: ExcludedModNote[];
}

export interface SmartToggleResult {
  nextIds: string[];
  notice: string | null;
  noticeTone: 'info' | 'warn';
}

export interface MissingSlotWarning {
  groupId: string;
  groupTitle: string;
  leaderId: string;
  leaderName: string;
}

export interface RecipeBridgeStatus {
  compatible: boolean;
  viaBridge?: string;
  reason?: string;
}

export interface SupersederInfo {
  byNames: string[];
  isActiveInSelection: boolean;
  reason: string;
}

export type ModImpactLevel =
  | 'core'
  | 'high'
  | 'medium'
  | 'conditional'
  | 'support'
  | 'diagnostic'
  | 'zero'
  | 'negative';

export type InteractionKind = 'synergy' | 'overlap' | 'dependency' | 'conflict' | 'context';

export type CoUsageVerdict = 'synergy' | 'solo' | 'overlap' | 'redundant' | 'dependency' | 'conflict';

export interface ModInteractionNote {
  kind: InteractionKind;
  targetIds: string[];
  targetNames: string[];
  summary: string;
  impactDelta: number;
}

export type ResourceLoadDelta = -2 | -1 | 0 | 1 | 2;

export interface ModResourceProfile {
  gains: string[];
  costs: string[];
  shortTag: string;
  hasTradeoff: boolean;
  gpuLoad: ResourceLoadDelta;
  vramLoad: ResourceLoadDelta;
  cpuLoad: ResourceLoadDelta;
  ramLoad: ResourceLoadDelta;
  tradeoffNote: string;
}

export interface ContextualModImpact {
  modId: string;
  level: ModImpactLevel;
  label: string;
  contextualScore: number;
  /** Normalized 0..100 (or negative on conflict/danger) value score in this assembly context */
  impactPoints: number;
  /** Marginal % change in assembly effectiveness when adding (or keeping) this mod */
  relativeImpactPct: number;
  inPack: boolean;
  coUsageVerdict: CoUsageVerdict;
  summary: string;
  interactions: ModInteractionNote[];
  resourceProfile: ModResourceProfile;
  betterAnalogId?: string;
  betterAnalogName?: string;
  betterAnalogDeltaPoints?: number;
}

export interface AssemblySubsystemScore {
  id: string;
  title: string;
  covered: boolean;
  score: number;
  maxScore: number;
  scorePct: number;
}

export interface ArtifactRiskFactor {
  label: string;
  deltaPct: number;
  tone: 'risk' | 'mitigation';
}

export interface ArtifactRiskProfile {
  chancePct: number;
  level: 'low' | 'moderate' | 'high' | 'critical';
  label: string;
  summary: string;
  factors: ArtifactRiskFactor[];
}

export interface DubiousModEntry {
  modId: string;
  mod: import('../data/modsData.ts').ModItem;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  artifactContributionPct: number;
  replacementId?: string;
  replacementName?: string;
  canRemoveSafely: boolean;
}

export interface AssemblyScoreBreakdown {
  efficiencyScore: number;
  stabilityScore: number;
  coverageScore: number;
  synergyBonus: number;
  penaltyPoints: number;
  hardwareFitDelta: number;
  bloatPenalty: number;
  artifactPenalty: number;
}

export interface AssemblyResourceBalance {
  fpsScore: number;
  tpsScore: number;
  memoryScore: number;
  gpuPressure: 'low' | 'moderate' | 'high';
  vramPressure: 'low' | 'moderate' | 'high';
  cpuPressure: 'low' | 'moderate' | 'high';
  ramDeltaLabel: string;
  fpsDeltaLabel: string;
  effectiveCount: number;
  conditionalCount: number;
  redundantCount: number;
  conflictCount: number;
}

export interface AssemblyImpactSummary {
  assemblyScore: number;
  coveragePct: number;
  coveredSubsystems: string[];
  missingSubsystems: string[];
  subsystemScores: AssemblySubsystemScore[];
  synergies: ModInteractionNote[];
  overlaps: ModInteractionNote[];
  zeroOrLowImpactIds: string[];
  networkOnlyIds: string[];
  highVramIds: string[];
  hardwareSummary: {
    highGpuIds: string[];
    highVramIds: string[];
    highCpuIds: string[];
    ramSaverIds: string[];
  };
  resourceBalance: AssemblyResourceBalance;
  artifactRisk: ArtifactRiskProfile;
  dubiousMods: DubiousModEntry[];
  scoreBreakdown: AssemblyScoreBreakdown;
}

export type AnalogRelationKind =
  | 'leader'
  | 'better-replacement'
  | 'dual-port'
  | 'addon-synergy'
  | 'alternative'
  | 'overlap-duplicate'
  | 'conflict'
  | 'builtin-covered';

export interface AnalogComparisonEntry {
  mod: import('../data/modsData.ts').ModItem;
  relation: AnalogRelationKind;
  relationLabel: string;
  canUseTogether: boolean;
  coUsageNote: string;
  points: number;
  relativeDeltaPoints: number;
  marginalPct: number;
  isSelectedInContext: boolean;
}


