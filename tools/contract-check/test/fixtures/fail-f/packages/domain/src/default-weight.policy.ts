export interface WeightPolicyOptions {
  readonly weight: number;
}

export class DefaultWeightPolicy {
  public weight(): number {
    return 1;
  }
}
