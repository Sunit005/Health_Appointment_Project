// Set environment variables before any other imports to satisfy Zod validation in config/index.ts
process.env.DATABASE_URL = "mysql://healthcare_user:user_password_123@localhost:3306/healthcare_db";
process.env.JWT_ACCESS_SECRET = "default_local_dev_jwt_access_secret_code_phrase_123!";
process.env.JWT_REFRESH_SECRET = "default_local_dev_jwt_refresh_secret_code_phrase_123!";
process.env.NODE_ENV = "test";
