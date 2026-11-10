export interface Calculator {
  calculate(): number;
}

export class DecayingCalculator implements Calculator {
  public calculate(): number {
    return 1;
  }
}
