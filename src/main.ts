import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Trust proxy (important for Render / reverse proxies)
  const server = app.getHttpAdapter().getInstance();
  server.set('trust proxy', true);

  // ✅ Dynamic port (Render provides this)
  const port = process.env.PORT ?? 3000;

  // ✅ CORS config
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(','),
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  // ✅ DB warm-up (good for cold starts)
  const dataSource = app.get(DataSource);

  try {
    await dataSource.query('SELECT 1');
    console.log('🔥 DB warm-up query successful');
  } catch (err) {
    console.error('❌ DB warm-up failed', err);
  }

  if (dataSource.isInitialized) {
    console.log('✅ Database connected successfully');
  } else {
    console.error('❌ Database connection NOT initialized');
  }

  // ✅ CRITICAL FIX FOR RENDER
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on port ${port}`);
}

bootstrap();
