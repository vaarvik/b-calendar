import { describeMediaStorageContract } from '@b-calendar/contracts/test-kit';
import { InMemoryMediaStorage } from '@b-calendar/in-memory';

describeMediaStorageContract('InMemoryMediaStorage', () => {
  const storage = new InMemoryMediaStorage();
  return Promise.resolve({
    storage,
    read: (url) => Promise.resolve(storage.files.get(url.replace('/media/', ''))?.bytes ?? null),
  });
});
