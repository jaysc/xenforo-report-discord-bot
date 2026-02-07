import { JsonDB, Config } from "node-json-db";
import { Report, Reports } from "./report";

export class ReportRepository {
  private readonly db: JsonDB;

  constructor(dbPath: string = "reports") {
    this.db = new JsonDB(new Config(dbPath, false, false, "/"));
  }

  async getReport(reportId: number): Promise<Report | null> {
    try {
      return await this.db.getData(`/${reportId}`);
    } catch {
      return null;
    }
  }

  async getAllReports(): Promise<Reports> {
    try {
      return await this.db.getData("/");
    } catch {
      return {};
    }
  }

  async saveReport(report: Report): Promise<void> {
    await this.db.push(`/${report.report_id}`, report);
  }

  async updateReportComments(report: Report): Promise<void> {
    await this.db.delete(`/${report.report_id}/report_comment`);
    await this.db.push(
      `/${report.report_id}/report_comment`,
      report.report_comment
    );

    await this.db.delete(`/${report.report_id}/latest_report_comment`);
    await this.db.push(
      `/${report.report_id}/latest_report_comment`,
      report.latest_report_comment
    );
  }

  async deleteReport(reportId: number): Promise<void> {
    try {
      await this.db.delete(`/${reportId}`);
    } catch {
      // Report may not exist, ignore
    }
  }

  async removeStaleReports(activeIds: string[]): Promise<number> {
    const existingReports = await this.getAllReports();
    let deletedCount = 0;

    for (const existingId of Object.keys(existingReports)) {
      if (!activeIds.includes(existingId)) {
        await this.db.delete(`/${existingId}`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await this.save();
    }

    return deletedCount;
  }

  async save(): Promise<void> {
    await this.db.save();
  }
}
