export class PolicyViolationError extends Error {
  constructor(message: string, public readonly issues: string[]) {
    super(message);
    this.name = "PolicyViolationError";
  }
}

export class SimulationError extends Error {
  constructor(message: string, public readonly details: string[]) {
    super(message);
    this.name = "SimulationError";
  }
}

export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionError";
  }
}
