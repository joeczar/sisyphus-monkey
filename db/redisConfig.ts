export type RedisConfig = {
  host: string;
  port?: number;
  password?: string;
};

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
};
