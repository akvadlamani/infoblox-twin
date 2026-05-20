import type { Mitigation, MdpInputAction, RiskScenario } from '@/lib/types/twin.types';

// Real-world control effectiveness factor.
export const CONTROL_EFFECTIVENESS = 0.6;

export interface MdpInput {
  eventsPerMonth: number;
  actions: MdpInputAction[];
  activeMitigations: Mitigation[];
  scenarioToActorMap: Record<string, string>; // actionId -> threatActorId
}

export function computeAle(input: MdpInput): number {
  const { actions, activeMitigations, scenarioToActorMap } = input;
  // Per Gartner G00835632 MDP: P(action) here is annualized.
  // The "events per month × 12" framing scopes the action space; it does
  // not multiply the loss expectation when each action's P is annual.
  const sum = actions.reduce((acc, action) => {
    const actor = scenarioToActorMap[action.id];
    const reductions = activeMitigations
      .filter((m) => m.affectedScenarios.includes(actor) || m.affectedScenarios.includes('all'))
      .map((m) => m.expectedRiskReduction);
    const aggregate = reductions.reduce(
      (p, r) => p * (1 - r * CONTROL_EFFECTIVENESS),
      1
    );
    const adjustedProb = action.probability * aggregate;
    return acc + adjustedProb * action.reward;
  }, 0);
  return Math.round(sum);
}

export function computeScenarioAle(
  scenario: RiskScenario,
  activeMitigations: Mitigation[]
): number {
  const reductions = activeMitigations
    .filter((m) => m.affectedScenarios.includes(scenario.threatActorId) || m.affectedScenarios.includes('all'))
    .map((m) => m.expectedRiskReduction);
  const aggregate = reductions.reduce(
    (p, r) => p * (1 - r * CONTROL_EFFECTIVENESS),
    1
  );
  return Math.round(scenario.expectedLoss * scenario.annualProbability * aggregate);
}
