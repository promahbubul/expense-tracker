import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseEnvList } from './common/utils/env.validation';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = (config.get<string>('NODE_ENV') ?? 'development').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';
  const configuredOrigins = parseEnvList(config.get<string>('CORS_ORIGIN'));
  const corsOrigins = configuredOrigins.length ? configuredOrigins : isProduction ? [] : ['http://localhost:3000', 'http://localhost:8081'];

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (!isProduction || (config.get<string>('ENABLE_SWAGGER') ?? '').trim().toLowerCase() === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Expense Tracker API')
      .setDescription('Personal income, expense, account, loan, and reporting API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(config.get<number>('PORT') ?? 4000);
}

bootstrap();
