import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dotenv to prevent loading .env file during tests
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

describe("Config", () => {
  // Store original env to restore after each test
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so config re-evaluates
    vi.resetModules();
    // Clear all env vars that config uses
    delete process.env.BASE_URL;
    delete process.env.DISCORD_API_KEY;
    delete process.env.DISCORD_REPORT_CHANNEL_ID;
    delete process.env.REPORT_POLL_SECONDS;
    delete process.env.REPORT_API_KEY;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("with valid environment", () => {
    it("should export config object with all required properties", async () => {
      process.env.BASE_URL = "https://example.com/";
      process.env.DISCORD_API_KEY = "test-token";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";
      process.env.REPORT_API_KEY = "test-api-key";
      process.env.REPORT_POLL_SECONDS = "30";

      const { config } = await import("../config");

      expect(config).toHaveProperty("baseUrl", "https://example.com/");
      expect(config).toHaveProperty("discordApiKey", "test-token");
      expect(config).toHaveProperty("discordChannelId", "123456789");
      expect(config).toHaveProperty("pollIntervalMs", 30000);
      expect(config).toHaveProperty("reportApiKey", "test-api-key");
      expect(config).toHaveProperty(
        "reportApiUrl",
        "https://example.com/api/reports/"
      );
      expect(config).toHaveProperty(
        "reportUrl",
        "https://example.com/forums/reports/"
      );
    });

    it("should parse poll interval correctly", async () => {
      process.env.BASE_URL = "https://example.com/";
      process.env.DISCORD_API_KEY = "test-token";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";
      process.env.REPORT_API_KEY = "test-api-key";
      process.env.REPORT_POLL_SECONDS = "45";

      const { config } = await import("../config");

      expect(config.pollIntervalMs).toBe(45000);
    });

    it("should construct correct API URLs", async () => {
      process.env.BASE_URL = "https://forum.example.com/";
      process.env.DISCORD_API_KEY = "test-token";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";
      process.env.REPORT_API_KEY = "test-api-key";
      process.env.REPORT_POLL_SECONDS = "30";

      const { config } = await import("../config");

      expect(config.reportApiUrl).toBe(
        "https://forum.example.com/api/reports/"
      );
      expect(config.reportUrl).toBe(
        "https://forum.example.com/forums/reports/"
      );
    });

    it("should use default poll interval of 60 seconds when not specified", async () => {
      process.env.BASE_URL = "https://example.com/";
      process.env.DISCORD_API_KEY = "test-token";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";
      process.env.REPORT_API_KEY = "test-api-key";
      // REPORT_POLL_SECONDS not set

      const { config } = await import("../config");

      expect(config.pollIntervalMs).toBe(60000);
    });
  });

  describe("validation behavior", () => {
    it("should throw ConfigurationError when BASE_URL is missing", async () => {
      // Only set other required vars, not BASE_URL
      process.env.DISCORD_API_KEY = "test-token";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";
      process.env.REPORT_API_KEY = "test-api-key";

      await expect(import("../config")).rejects.toThrow(
        "Missing required environment variable: BASE_URL"
      );
    });

    it("should throw ConfigurationError when DISCORD_API_KEY is missing", async () => {
      process.env.BASE_URL = "https://example.com/";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";
      process.env.REPORT_API_KEY = "test-api-key";

      await expect(import("../config")).rejects.toThrow(
        "Missing required environment variable: DISCORD_API_KEY"
      );
    });

    it("should throw ConfigurationError when DISCORD_REPORT_CHANNEL_ID is missing", async () => {
      process.env.BASE_URL = "https://example.com/";
      process.env.DISCORD_API_KEY = "test-token";
      process.env.REPORT_API_KEY = "test-api-key";

      await expect(import("../config")).rejects.toThrow(
        "Missing required environment variable: DISCORD_REPORT_CHANNEL_ID"
      );
    });

    it("should throw ConfigurationError when REPORT_API_KEY is missing", async () => {
      process.env.BASE_URL = "https://example.com/";
      process.env.DISCORD_API_KEY = "test-token";
      process.env.DISCORD_REPORT_CHANNEL_ID = "123456789";

      await expect(import("../config")).rejects.toThrow(
        "Missing required environment variable: REPORT_API_KEY"
      );
    });
  });
});
