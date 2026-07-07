import type { ResourceDrop } from '../data/tasks'
import { getResourceName } from '../data/resources'

export interface CostReadiness {
  resourceId: string
  name: string
  needed: number
  owned: number
  ready: boolean
}

export function getCostReadiness(
  costs: ResourceDrop[] | undefined,
  getItemCount: (resourceId: string) => number,
  multiplier = 1
): CostReadiness[] {
  return (costs ?? []).map((cost) => {
    const needed = cost.amount * multiplier
    const owned = getItemCount(cost.resourceId)

    return {
      resourceId: cost.resourceId,
      name: getResourceName(cost.resourceId),
      needed,
      owned,
      ready: owned >= needed,
    }
  })
}

export function hasMissingCosts(costs: CostReadiness[]): boolean {
  return costs.some((cost) => !cost.ready)
}

export function formatCostReadiness(costs: CostReadiness[]): string {
  return costs
    .map((cost) => `${cost.needed.toLocaleString()} ${cost.name} (have ${cost.owned.toLocaleString()})`)
    .join(', ')
}
