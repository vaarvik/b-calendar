import { parseArgs } from 'node:util';
import webPush from 'web-push';
import { BIRTHDAY_WEEK } from './api.model.js';
import { CompositionRoot } from './composition-root.js';

// Usage:
//   cli vapid-keys                                   VAPID keys for .env (once)
//   cli seed-birthday [--slug s] [--name n] [--origin https://…]   the birthday week, with its link
const [command, ...rest] = process.argv.slice(2);

if (command === 'vapid-keys') {
  const keys = webPush.generateVAPIDKeys();
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}`);
} else if (command === 'seed-birthday') {
  const { values } = parseArgs({
    args: rest,
    options: {
      slug: { type: 'string', default: BIRTHDAY_WEEK.settings.slug },
      name: { type: 'string', default: BIRTHDAY_WEEK.settings.recipientName },
      origin: { type: 'string', default: 'http://localhost:3000' },
    },
  });
  const root = CompositionRoot.fromEnv(process.env);
  try {
    const calendar = await root.createCalendar.execute({
      ...BIRTHDAY_WEEK.settings,
      slug: values.slug,
      recipientName: values.name,
    });
    for (const draft of BIRTHDAY_WEEK.doors) {
      await root.addDoor.execute({ calendarId: calendar.id, draft });
    }
    const version = await root.publishCalendar.execute({ calendarId: calendar.id });
    console.log(
      `Created ${calendar.title} with ${String(version.doorCount)} doors, published as version ${String(version.version)}.`,
    );
    console.log(
      `Her link: ${values.origin}/c/${calendar.slug}?k=${encodeURIComponent(calendar.accessKey)}`,
    );
    console.log(`Edit it:  ${values.origin}/admin/${calendar.id}`);
  } finally {
    await root.close();
  }
} else {
  console.error('Usage: cli vapid-keys | cli seed-birthday [--slug s] [--name n] [--origin url]');
  process.exitCode = 2;
}
