import { describe, it, expect } from "vitest";
import { mapReport, ReportApi } from "../report";

describe("mapReport", () => {
  const createMockReportApi = (): ReportApi => ({
    report_id: 123,
    report_count: 5,
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
        report_id: 123,
        report_comment_id: 1,
        comment_date: 1234567850,
        message: "First comment",
        username: "Reporter1",
        state: "open",
      },
      {
        report_id: 123,
        report_comment_id: 2,
        comment_date: 1234567890,
        message: "Latest comment",
        username: "Reporter2",
        state: "open",
      },
    ],
  });

  it("should map API report to internal Report format", () => {
    const apiReport = createMockReportApi();
    const reportUrl = "https://example.com/forums/reports/";

    const result = mapReport(apiReport, reportUrl);

    expect(result.report_id).toBe(123);
    expect(result.report_count).toBe(5);
    expect(result.report_url).toBe("https://example.com/forums/reports/123");
  });

  it("should set latest_report_comment to the last comment", () => {
    const apiReport = createMockReportApi();
    const reportUrl = "https://example.com/forums/reports/";

    const result = mapReport(apiReport, reportUrl);

    expect(result.latest_report_comment?.report_comment_id).toBe(2);
    expect(result.latest_report_comment?.message).toBe("Latest comment");
    expect(result.latest_report_comment?.username).toBe("Reporter2");
  });

  it("should preserve all original API report properties", () => {
    const apiReport = createMockReportApi();
    const reportUrl = "https://example.com/forums/reports/";

    const result = mapReport(apiReport, reportUrl);

    expect(result.content_info.username).toBe("TestUser");
    expect(result.content_info.thread_title).toBe("Test Thread");
    expect(result.first_report_date).toBe(1234567800);
    expect(result.report_comment).toHaveLength(2);
  });

  it("should handle single comment correctly", () => {
    const apiReport: ReportApi = {
      ...createMockReportApi(),
      report_comment: [
        {
          report_id: 123,
          report_comment_id: 1,
          comment_date: 1234567850,
          message: "Only comment",
          username: "Reporter1",
          state: "open",
        },
      ],
    };
    const reportUrl = "https://example.com/forums/reports/";

    const result = mapReport(apiReport, reportUrl);

    expect(result.latest_report_comment?.report_comment_id).toBe(1);
    expect(result.latest_report_comment?.message).toBe("Only comment");
  });
});
