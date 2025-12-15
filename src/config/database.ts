import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

// Support both individual env vars and DATABASE_URL
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL for production (Render, Heroku, etc.)
    return {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  // Use individual env vars for local development
  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'order_engine',
  };
};

export const AppDataSource = new DataSource({
  ...getDatabaseConfig(),
  synchronize: false, // We'll use migrations instead
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../models/**/*.{js,ts}'],
  migrations: [__dirname + '/../migrations/**/*.{js,ts}'],
  subscribers: [],
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};