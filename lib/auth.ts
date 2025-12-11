import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SALT_ROUNDS = 12;

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  chairmanModel: string;
  councilModels: string[];
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  chairmanModel: string;
  councilModels: string[];
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<AuthUser> {
  // Validate council models (max 4)
  if (data.councilModels.length > 4) {
    throw new Error("Maximum 4 council models allowed");
  }
  if (data.councilModels.length === 0) {
    throw new Error("At least 1 council model is required");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { username: data.username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new Error("Email already registered");
    }
    throw new Error("Username already taken");
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      password_hash: passwordHash,
      chairman_model: data.chairmanModel,
      council_models: data.councilModels,
    },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    chairmanModel: user.chairman_model,
    councilModels: user.council_models,
  };
}

/**
 * Login a user
 */
export async function loginUser(data: LoginData): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValid = await verifyPassword(data.password, user.password_hash);

  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    chairmanModel: user.chairman_model,
    councilModels: user.council_models,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    chairmanModel: user.chairman_model,
    councilModels: user.council_models,
  };
}

/**
 * Update user's model preferences
 */
export async function updateUserModels(
  userId: string,
  chairmanModel: string,
  councilModels: string[]
): Promise<AuthUser> {
  if (councilModels.length > 4) {
    throw new Error("Maximum 4 council models allowed");
  }
  if (councilModels.length === 0) {
    throw new Error("At least 1 council model is required");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      chairman_model: chairmanModel,
      council_models: councilModels,
    },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    chairmanModel: user.chairman_model,
    councilModels: user.council_models,
  };
}

/**
 * Update user profile (username/email)
 */
export async function updateUserProfile(
  userId: string,
  username: string,
  email: string
): Promise<AuthUser> {
  // Check if email/username already taken by another user
  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        { id: { not: userId } },
        { OR: [{ email }, { username }] },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error("Email already in use by another account");
    }
    throw new Error("Username already taken");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username, email },
  });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    chairmanModel: user.chairman_model,
    councilModels: user.council_models,
  };
}
