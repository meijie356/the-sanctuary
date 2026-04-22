/**
 * Soul Ledger - Long-term memory logic for The Sanctuary.
 * Stores a condensed profile of the user's journey in localStorage.
 */

const STORAGE_KEY = 'the_sanctuary_soul_profile';

export const SoulLedger = {
  getProfile(): string {
    return localStorage.getItem(STORAGE_KEY) || "";
  },

  updateProfile(newProfile: string) {
    // Sanitize and cap length to prevent context bloat (approx 1500 chars)
    const sanitized = newProfile.slice(0, 1500).trim();
    localStorage.setItem(STORAGE_KEY, sanitized);
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  getFormattedContext(): string {
    const profile = this.getProfile();
    if (!profile) return "You have no previous context about this specific soul. This is a fresh start.";
    
    return `[CURRENT SOUL PROFILE]\n${profile}`;
  }
};
