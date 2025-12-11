/**
 * User Profile Management Utility
 */

export interface UserProfile {
  username: string;
  email: string;
  chairmanModel: string;
  councilModels: string[];
}

/**
 * Get the user profile from localStorage
 */
export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const profile = localStorage.getItem("userProfile");
    if (!profile) return null;
    return JSON.parse(profile) as UserProfile;
  } catch (error) {
    console.error("Error reading user profile:", error);
    return null;
  }
}

/**
 * Save the user profile to localStorage
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
}

/**
 * Clear the user profile from localStorage
 */
export function clearUserProfile(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("userProfile");
  } catch (error) {
    console.error("Error clearing user profile:", error);
  }
}

/**
 * Get all models (chairman + council) from the user profile
 */
export function getAllModelsFromProfile(profile: UserProfile | null): string[] {
  if (!profile) return [];

  const allModels = [...new Set([profile.chairmanModel, ...profile.councilModels])];
  return allModels.filter((m) => m);
}

/**
 * Check if profile has required models configured
 */
export function isProfileValid(profile: UserProfile | null): boolean {
  if (!profile) return false;

  const hasChairman = !!profile.chairmanModel;
  const hasCouncilModels = profile.councilModels && profile.councilModels.length > 0;

  return hasChairman && hasCouncilModels;
}
