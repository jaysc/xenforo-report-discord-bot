import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportService, IDiscordBot } from "../report-service";
import { ApiClient } from "../api-client";
import { ReportRepository } from "../report-repository";
import { Config } from "../config";
import { Report, ReportApi } from "../report";

// Mock implementations
const createMockConfig = (): Config => ({
  baseUrl: "https://example.com/",
  discordApiKey: "test-token",
  discordChannelId: "123456789",
  pollIntervalMs: 60000,
  reportApiKey: "test-api-key",
  reportApiUrl: "https://example.com/api/reports/",
  reportUrl: "https://example.com/forums/reports/",
});

const createMockReportApi = (overrides: Partial<ReportApi> = {}): ReportApi => ({
  report_id: 1,
  report_count: 1,
  last_modified_date: 1234567890,
  first_report_date: 1234567800,
  content_info: {
    message: "Test message",
    node_id: 1,
    node_name: "Test Node",
    post_id: 100,
    thread_id: 50,
    thread_title: "Test Thread",
    user_id: 10,
    username: "TestUser",
    post_date: 1234567800,
  },
  report_comment: [
    {
      report_id: 1,
      report_comment_id: 1,
      comment_date: 1234567890,
      message: "Test comment",
      username: "Reporter",
      state: "open",
    },
  ],
  ...overrides,
});

const createMockReport = (overrides: Partial<Report> = {}): Report => {
  const apiReport = createMockReportApi();
  return {
    ...apiReport,
    report_url: `https://example.com/forums/reports/${apiReport.report_id}`,
    latest_report_comment: apiReport.report_comment[0],
    ...overrides,
  };
};

describe("ReportService", () => {
  let mockApi: { getReports: ReturnType<typeof vi.fn> };
  let mockRepository: {
    getReport: ReturnType<typeof vi.fn>;
    getAllReports: ReturnType<typeof vi.fn>;
    saveReport: ReturnType<typeof vi.fn>;
    updateReportComments: ReturnType<typeof vi.fn>;
    deleteReport: ReturnType<typeof vi.fn>;
    removeStaleReports: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let mockDiscord: { sendReport: ReturnType<typeof vi.fn> };
  let service: ReportService;
  let config: Config;

  beforeEach(() => {
    config = createMockConfig();

    mockApi = {
      getReports: vi.fn().mockResolvedValue([]),
    };

    mockRepository = {
      getReport: vi.fn().mockResolvedValue(null),
      getAllReports: vi.fn().mockResolvedValue({}),
      saveReport: vi.fn().mockResolvedValue(undefined),
      updateReportComments: vi.fn().mockResolvedValue(undefined),
      deleteReport: vi.fn().mockResolvedValue(undefined),
      removeStaleReports: vi.fn().mockResolvedValue(0),
      save: vi.fn().mockResolvedValue(undefined),
    };

    mockDiscord = {
      sendReport: vi.fn().mockResolvedValue(undefined),
    };

    service = new ReportService(
      mockApi as unknown as ApiClient,
      mockRepository as unknown as ReportRepository,
      mockDiscord as IDiscordBot,
      config
    );
  });

  describe("processReports", () => {
    it("should save new reports and notify when notify=true", async () => {
      const reportApi = createMockReportApi();
      mockApi.getReports.mockResolvedValue([reportApi]);
      mockRepository.getReport.mockResolvedValue(null);

      await service.processReports(true);

      expect(mockRepository.saveReport).toHaveBeenCalledTimes(1);
      expect(mockDiscord.sendReport).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it("should save new reports without notifying when notify=false", async () => {
      const reportApi = createMockReportApi();
      mockApi.getReports.mockResolvedValue([reportApi]);
      mockRepository.getReport.mockResolvedValue(null);

      await service.processReports(false);

      expect(mockRepository.saveReport).toHaveBeenCalledTimes(1);
      expect(mockDiscord.sendReport).not.toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it("should update comments and notify when a new comment is detected", async () => {
      const existingReport = createMockReport();
      const newReportApi = createMockReportApi({
        report_comment: [
          ...existingReport.report_comment,
          {
            report_id: 1,
            report_comment_id: 2, // New comment ID
            comment_date: 1234567900,
            message: "New comment",
            username: "AnotherUser",
            state: "open",
          },
        ],
      });

      mockApi.getReports.mockResolvedValue([newReportApi]);
      mockRepository.getReport.mockResolvedValue(existingReport);

      await service.processReports(true);

      expect(mockRepository.updateReportComments).toHaveBeenCalledTimes(1);
      expect(mockDiscord.sendReport).toHaveBeenCalledTimes(1);
    });

    it("should not update or notify when report has no changes", async () => {
      const existingReport = createMockReport();
      const reportApi = createMockReportApi();

      mockApi.getReports.mockResolvedValue([reportApi]);
      mockRepository.getReport.mockResolvedValue(existingReport);

      await service.processReports(true);

      expect(mockRepository.saveReport).not.toHaveBeenCalled();
      expect(mockRepository.updateReportComments).not.toHaveBeenCalled();
      expect(mockDiscord.sendReport).not.toHaveBeenCalled();
    });

    it("should remove stale reports", async () => {
      mockApi.getReports.mockResolvedValue([]);
      mockRepository.removeStaleReports.mockResolvedValue(2);

      await service.processReports(true);

      expect(mockRepository.removeStaleReports).toHaveBeenCalledWith([]);
    });

    it("should handle multiple reports", async () => {
      const reportApi1 = createMockReportApi({ report_id: 1 });
      const reportApi2 = createMockReportApi({ report_id: 2 });

      mockApi.getReports.mockResolvedValue([reportApi1, reportApi2]);
      mockRepository.getReport.mockResolvedValue(null);

      await service.processReports(true);

      expect(mockRepository.saveReport).toHaveBeenCalledTimes(2);
      expect(mockDiscord.sendReport).toHaveBeenCalledTimes(2);
    });
  });
});
