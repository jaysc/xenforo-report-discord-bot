import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportRepository } from "../report-repository";
import { Report } from "../report";

// Mock node-json-db
vi.mock("node-json-db", () => {
  const mockData: Record<string, any> = {};

  return {
    JsonDB: vi.fn().mockImplementation(() => ({
      getData: vi.fn().mockImplementation((path: string) => {
        if (path === "/") {
          return Promise.resolve({ ...mockData });
        }
        const id = path.replace("/", "");
        if (mockData[id]) {
          return Promise.resolve(mockData[id]);
        }
        throw new Error("Data not found");
      }),
      push: vi.fn().mockImplementation((path: string, data: any) => {
        const id = path.split("/")[1];
        if (path.includes("/report_comment")) {
          mockData[id] = { ...mockData[id], report_comment: data };
        } else if (path.includes("/latest_report_comment")) {
          mockData[id] = { ...mockData[id], latest_report_comment: data };
        } else {
          mockData[id] = data;
        }
        return Promise.resolve();
      }),
      delete: vi.fn().mockImplementation((path: string) => {
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 1) {
          delete mockData[parts[0]];
        }
        return Promise.resolve();
      }),
      save: vi.fn().mockResolvedValue(undefined),
    })),
    Config: vi.fn(),
  };
});

const createMockReport = (id: number = 1): Report => ({
  report_id: id,
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
      report_id: id,
      report_comment_id: 1,
      comment_date: 1234567890,
      message: "Test comment",
      username: "Reporter",
      state: "open",
    },
  ],
  report_url: `https://example.com/forums/reports/${id}`,
  latest_report_comment: {
    report_id: id,
    report_comment_id: 1,
    comment_date: 1234567890,
    message: "Test comment",
    username: "Reporter",
    state: "open",
  },
});

describe("ReportRepository", () => {
  let repository: ReportRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ReportRepository("test-reports");
  });

  describe("getReport", () => {
    it("should return null when report does not exist", async () => {
      const result = await repository.getReport(999);
      expect(result).toBeNull();
    });
  });

  describe("getAllReports", () => {
    it("should return empty object when no reports exist", async () => {
      const result = await repository.getAllReports();
      expect(result).toEqual({});
    });
  });

  describe("saveReport", () => {
    it("should save a report without throwing", async () => {
      const report = createMockReport();
      await expect(repository.saveReport(report)).resolves.not.toThrow();
    });
  });

  describe("updateReportComments", () => {
    it("should update report comments without throwing", async () => {
      const report = createMockReport();
      await expect(
        repository.updateReportComments(report)
      ).resolves.not.toThrow();
    });
  });

  describe("deleteReport", () => {
    it("should delete a report without throwing", async () => {
      await expect(repository.deleteReport(1)).resolves.not.toThrow();
    });
  });

  describe("save", () => {
    it("should save to disk without throwing", async () => {
      await expect(repository.save()).resolves.not.toThrow();
    });
  });
});
