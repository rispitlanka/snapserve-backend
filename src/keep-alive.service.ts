import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepAliveService.name);
  private timer?: NodeJS.Timeout;

  onModuleInit(): void {
    const enabled = process.env.KEEP_ALIVE_ENABLED === 'true';
    if (!enabled) {
      return;
    }

    const intervalMs = Number(
      process.env.KEEP_ALIVE_INTERVAL_MS ?? 14 * 60 * 1000,
    );
    const baseUrl =
      process.env.KEEP_ALIVE_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      process.env.APP_BASE_URL;

    if (!baseUrl) {
      this.logger.warn(
        'KEEP_ALIVE_ENABLED is true but KEEP_ALIVE_URL/RENDER_EXTERNAL_URL/APP_BASE_URL is missing.',
      );
      return;
    }

    const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.timer = setInterval(() => {
      void this.ping(url);
    }, intervalMs);

    this.logger.log(
      `Keep-alive ping enabled. Target: ${url}, interval: ${intervalMs}ms`,
    );
    void this.ping(url);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async ping(url: string): Promise<void> {
    try {
      await fetch(url, { method: 'GET' });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.warn(
        `Keep-alive ping failed for ${url}: ${detail}`,
      );
    }
  }
}
