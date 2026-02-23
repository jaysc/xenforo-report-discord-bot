import { ApiClient } from "./api-client";
import { Config } from "./config";
import { mapReport, Report } from "./report";
import { ReportRepository } from "./report-repository";

export interface IDiscordBot {
  sendReport(report: Report): Promise<void>;
}

export class ReportService {
  private readonly api: ApiClient;
  private readonly repository: ReportRepository;
  private readonly discord: IDiscordBot;
  private readonly reportUrl: string;

  constructor(
    api: ApiClient,
    repository: ReportRepository,
    discord: IDiscordBot,
    config: Config
  ) {
    this.api = api;
    this.repository = repository;
    this.discord = discord;
    this.reportUrl = config.reportUrl;
  }

  /**
   * Process reports from the API.
   * @param notify - If true, send Discord notifications for new reports.
   *                 Set to false during initial load to avoid notification spam.
   */
  async processReports(notify: boolean): Promise<void> {
    const reportApis = await this.api.getReports();
    const activeIds: string[] = [];
    let newReportCount = 0;
    let hasCommentUpdates = false;

    for (const reportApi of reportApis) {
      const report = mapReport(reportApi, this.reportUrl);
      activeIds.push(report.report_id.toString());

      const existingReport = await this.repository.getReport(report.report_id);

      if (!existingReport) {
        await this.repository.saveReport(report);
        newReportCount++;

        if (notify) {
          await this.discord.sendReport(report);
          console.log(
            `[${new Date().toISOString()}] Discord message sent - Report #${report.report_id} reported by ${report.latest_report_comment?.username ?? "unknown"}`
          );
        }
      } else if (this.hasNewComment(existingReport, report)) {
        await this.repository.updateReportComments(report);
        hasCommentUpdates = true;
      }
    }

    if (newReportCount > 0 || hasCommentUpdates) {
      await this.repository.save();
    }

    if (newReportCount > 0) {
      console.log(`Saved ${newReportCount} new reports`);
    }

    const deletedCount = await this.repository.removeStaleReports(activeIds);
    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} stale reports`);
    }
  }

  private hasNewComment(existingReport: Report, newReport: Report): boolean {
    if (!existingReport.latest_report_comment || !newReport.latest_report_comment) {
      return false;
    }
    return (
      existingReport.latest_report_comment.report_comment_id !==
      newReport.latest_report_comment.report_comment_id
    );
  }
}
