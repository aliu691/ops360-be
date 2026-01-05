// src/reconcile-meetings-users.ts
console.log('🚀 Reconciliation script started');

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Meeting } from './modules/meetings/meetings.entity';
import { User } from './modules/users/users.entity';

async function reconcileMeetingsWithUsers() {
  console.log('🧠 Bootstrapping Nest context...');

  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('🔌 Nest application context created');

  const dataSource = app.get(DataSource);

  console.log('🔌 Database connected');

  const meetingRepo = dataSource.getRepository(Meeting);
  const userRepo = dataSource.getRepository(User);

  console.log('🔍 Fetching users and meetings...');

  const users = await userRepo.find();
  const meetings = await meetingRepo.find();

  console.log(`👥 Users found: ${users.length}`);
  console.log(`📄 Meetings found: ${meetings.length}`);

  const userMap = new Map(users.map((u) => [u.name.trim().toLowerCase(), u]));

  let assigned = 0;
  let deleted = 0;

  for (const meeting of meetings) {
    const repKey = meeting.repName?.trim().toLowerCase();

    if (!repKey || !userMap.has(repKey)) {
      console.log(
        `❌ Deleting meeting ${meeting.id} (rep: "${meeting.repName}")`,
      );
      await meetingRepo.delete(meeting.id);
      deleted++;
      continue;
    }

    const user = userMap.get(repKey)!;
    meeting.userId = user.id;

    await meetingRepo.save(meeting);
    assigned++;
  }

  console.log('✅ Reconciliation complete');
  console.log({
    totalMeetings: meetings.length,
    assigned,
    deleted,
  });

  await app.close();
}

reconcileMeetingsWithUsers()
  .then(() => {
    console.log('🎉 Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('🔥 Error during reconciliation', err);
    process.exit(1);
  });
