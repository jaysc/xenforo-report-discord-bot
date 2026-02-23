import axios, { AxiosError } from "axios";
import { Config } from "./config";
import { ReportApi } from "./report";

export interface ApiClientOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<ApiClientOptions> = {
  maxRetries: 3,
  retryDelayMs: 1000,
};

export class ApiClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(config: Config, options: ApiClientOptions = {}) {
    this.apiUrl = config.reportApiUrl;
    this.apiKey = config.reportApiKey;
    this.maxRetries = options.maxRetries ?? DEFAULT_OPTIONS.maxRetries;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_OPTIONS.retryDelayMs;
  }

  async getReports(): Promise<ReportApi[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get(this.apiUrl, {
          headers: {
            "XF-Api-Key": this.apiKey,
          },
          validateStatus: (status) => {
            // Accept 404 as valid (no reports)
            if (status === 404) {
              return true;
            }
            return status >= 200 && status < 300;
          },
        });

        // 404 means no reports
        if (response.status === 404) {
          return [];
        }

        const reports = response.data?.reports;
        if (!Array.isArray(reports)) {
          console.warn("API response did not contain reports array");
          return [];
        }

        return reports as ReportApi[];
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.maxRetries;

        if (isRetryable && !isLastAttempt) {
          console.warn(
            `API request failed (attempt ${attempt}/${this.maxRetries}): ${lastError.message}. Retrying...`
          );
          await this.delay(this.retryDelayMs * attempt); // Linear backoff
        } else {
          console.error(
            `API request failed (attempt ${attempt}/${this.maxRetries}): ${lastError.message}`
          );
          break;
        }
      }
    }

    // All retries exhausted
    console.error("All API retry attempts exhausted");
    return [];
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      // Network errors are retryable
      if (!error.response) {
        return true;
      }
      // 5xx errors are retryable
      const status = error.response.status;
      return status >= 500 && status < 600;
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
