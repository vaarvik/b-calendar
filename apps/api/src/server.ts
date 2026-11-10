import { CompositionRoot } from './composition-root.js';

const root = CompositionRoot.fromEnv(process.env);
await root.start();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void root.close();
  });
}
