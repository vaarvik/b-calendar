import { parseArgs } from 'node:util';
import webPush from 'web-push';
import { AccountIdSchema } from '@b-calendar/contracts';
import { BIRTHDAY_WEEK } from './api.model.js';
import { CompositionRoot } from './composition-root.js';

// Usage:
//   cli vapid-keys                                   VAPID keys for .env (once)
//   cli seed-birthday --owner <account id> [--slug s] [--name n] [--origin https://…]
//                                                    the birthday week for an account, with one member's link
const [command, ...rest] = process.argv.slice(2);

if (command === 'vapid-keys') {
  const keys = webPush.generateVAPIDKeys();
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}`);
} else if (command === 'seed-birthday') {
  const { values } = parseArgs({
    args: rest,
    options: {
      owner: { type: 'string' },
      slug: { type: 'string', default: BIRTHDAY_WEEK.settings.slug },
      name: { type: 'string', default: 'deg' },
      origin: { type: 'string', default: 'http://localhost:3000' },
    },
  });
  // The account's id is in the accounts table once its owner has signed in.
  const owner = AccountIdSchema.parse(values.owner);
  const root = CompositionRoot.fromEnv(process.env);
  try {
    const calendar = await root.createCalendar.execute({
      owner,
      settings: { ...BIRTHDAY_WEEK.settings, slug: values.slug },
    });
    const member = await root.addMember.execute({ calendarId: calendar.id, name: values.name });
    for (const draft of BIRTHDAY_WEEK.doors) {
      await root.addDoor.execute({ calendarId: calendar.id, draft });
    }
    const version = await root.publishCalendar.execute({ calendarId: calendar.id });
    console.log(
      `Created ${calendar.title} with ${String(version.doorCount)} doors, published as version ${String(version.version)}.`,
    );
    console.log(
      `${member.name}'s link: ${values.origin}/c/${calendar.slug}?k=${encodeURIComponent(member.key)}`,
    );
    console.log(`Edit it:  ${values.origin}/admin/${calendar.id}`);
  } finally {
    await root.close();
  }
} else {
  console.error(
    'Usage: cli vapid-keys | cli seed-birthday --owner <account id> [--slug s] [--name n] [--origin url]',
  );
  process.exitCode = 2;
}
