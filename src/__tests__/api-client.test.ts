import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient } from "../api-client";
import { Config } from "../config";
import axios, { AxiosError } from "axios";

// Mock axios
vi.mock("axios", async () => {
  const actual = await vi.importActual("axios");
  return {
    ...actual,
    default: {
      get: vi.fn(),
    },
  };
});

const mockedAxios = vi.mocked(axios);

const createMockConfig = (): Config => ({
  baseUrl: "https://example.com/",
  discordApiKey: "test-token",
  discordChannelId: "123456789",
  pollIntervalMs: 60000,
  reportApiKey: "test-api-key",
  reportApiUrl: "https://example.com/api/reports/",
  reportUrl: "https://example.com/forums/reports/",
});

// Helper to create a proper AxiosError
const createAxiosError = (message: string, status?: number): AxiosError => {
  const error = new AxiosError(message);
  if (status) {
    error.response = {
      status,
      statusText: "Error",
      headers: {},
      config: {} as any,
      data: null,
    };
  }
  return error;
};

describe("ApiClient", () => {
  let client: ApiClient;
  let config: Config;

  beforeEach(() => {
    config = createMockConfig();
    client = new ApiClient(config, { maxRetries: 3, retryDelayMs: 10 }); // Short delay for tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getReports", () => {
    it("should return reports from successful API call", async () => {
      const mockReports = [
        { report_id: 1, report_count: 1 },
        { report_id: 2, report_count: 2 },
      ];

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { reports: mockReports },
      });

      const result = await client.getReports();

      expect(result).toEqual(mockReports);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://example.com/api/reports/",
        expect.objectContaining({
          headers: { "XF-Api-Key": "test-api-key" },
        })
      );
    });

    it("should return empty array on 404", async () => {
      mockedAxios.get.mockResolvedValue({
        status: 404,
        data: null,
      });

      const result = await client.getReports();

      expect(result).toEqual([]);
    });

    it("should return empty array when response has no reports array", async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { something: "else" },
      });

      const result = await client.getReports();

      expect(result).toEqual([]);
    });

    it("should retry on network errors", async () => {
      // Create a network error (no response = network error)
      const networkError = createAxiosError("Network Error");

      mockedAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          status: 200,
          data: { reports: [{ report_id: 1 }] },
        });

      const result = await client.getReports();

      expect(result).toEqual([{ report_id: 1 }]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it("should retry on 5xx errors", async () => {
      const serverError = createAxiosError("Internal Server Error", 500);

      mockedAxios.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          status: 200,
          data: { reports: [{ report_id: 1 }] },
        });

      const result = await client.getReports();

      expect(result).toEqual([{ report_id: 1 }]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it("should not retry on 4xx errors", async () => {
      const clientError = createAxiosError("Bad Request", 400);

      mockedAxios.get.mockRejectedValue(clientError);

      const result = await client.getReports();

      expect(result).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it("should return empty array after max retries exhausted", async () => {
      const networkError = createAxiosError("Network Error");

      mockedAxios.get.mockRejectedValue(networkError);

      const result = await client.getReports();

      expect(result).toEqual([]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });
});
