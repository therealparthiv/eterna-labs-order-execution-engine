import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'order_engine',
  
  // Auto-create tables for this assignment (disable in real prod)
  synchronize: true, 
  logging: !isProduction,

  //  Load .js files from 'dist' in production, .ts from 'src' in dev
  entities: [isProduction ? 'dist/models/**/*.js' : 'src/models/**/*.ts'],
  migrations: [isProduction ? 'dist/migrations/**/*.js' : 'src/migrations/**/*.ts'],
  
  subscribers: [],
  
  // SSL for Render
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
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