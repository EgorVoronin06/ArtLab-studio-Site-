import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Запросы могут прийти как /auth/... (после прокси Vite) или как /api/auth/... (прямо на :3000).
  // Контроллеры без глобального префикса — нормализуем URL до маршрутизации.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const url = req.url ?? '/';
    if (url === '/api' || url.startsWith('/api/')) {
      req.url = url === '/api' ? '/' : url.slice(4);
      if (!req.url.startsWith('/')) req.url = `/${req.url}`;
    }
    next();
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`API http://localhost:${port}`);
}

bootstrap();
