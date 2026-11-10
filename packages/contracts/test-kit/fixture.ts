import { afterEach, beforeEach } from 'vitest';

/** What a contract suite gets from the implementation under test. */
export interface Disposable {
  /** Called after each test, e.g. to drop a test database. */
  readonly dispose?: () => Promise<void>;
}

/**
 * Creates a fresh fixture for every test. The store behind it must start empty, and nothing
 * may leak between tests.
 */
export type FixtureFactory<F> = () => Promise<F & Disposable>;

/** Holds the fixture of the running test. Register inside a `describe` block. */
export class FixtureHolder<F> {
  private fixture: (F & Disposable) | undefined;

  public constructor(factory: FixtureFactory<F>) {
    beforeEach(async () => {
      this.fixture = await factory();
    });
    afterEach(async () => {
      await this.fixture?.dispose?.();
      this.fixture = undefined;
    });
  }

  public get current(): F {
    if (this.fixture === undefined) {
      throw new Error('The fixture is only available inside a test.');
    }
    return this.fixture;
  }
}
