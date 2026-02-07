import * as dotenv from "dotenv";
dotenv.config();

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function validateRequired(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new ConfigurationError(
      `Missing required environment variable: ${key}`
    );
  }
  return value;
}

function validatePositiveInteger(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ConfigurationError(
      `Missing required environment variable: ${key}`
    );
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new ConfigurationError(
      `Environment variable ${key} must be a positive integer, got: ${value}`
    );
  }
  return parsed;
}

export interface Config {
  baseUrl: string;
  discordApiKey: string;
  discordChannelId: string;
  pollIntervalMs: number;
  reportApiKey: string;
  reportApiUrl: string;
  reportUrl: string;
}

function loadConfig(): Config {
  const baseUrl = validateRequired("BASE_URL");
  const pollSeconds = validatePositiveInteger("REPORT_POLL_SECONDS", 60);

  return {
    baseUrl,
    discordApiKey: validateRequired("DISCORD_API_KEY"),
    discordChannelId: validateRequired("DISCORD_REPORT_CHANNEL_ID"),
    pollIntervalMs: pollSeconds * 1000,
    reportApiKey: validateRequired("REPORT_API_KEY"),
    reportApiUrl: `${baseUrl}api/reports/`,
    reportUrl: `${baseUrl}forums/reports/`,
  };
}

// Validate and export config at module load time
export const config = loadConfig();
