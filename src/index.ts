import * as dotenv from "dotenv";
dotenv.config();

import axios from 'axios';
import { JsonDB, Config } from 'node-json-db';
import { mapReport, Report, ReportApi, Reports } from "./report";
import { connect, sendReport } from "./bot";

const db = new JsonDB(new Config("reports", false, false, '/'));
const report_api_url = `${process.env.BASE_URL}api/reports/`


const main = async () => {
  if (!await connect()) {
    throw Error('Failed to connect to discord')
  }

  if (!process.env.BASE_URL) {
    throw Error('No Base URL specified')
  }

  // Populate initial report file
  console.log('Populating initial report data')
  let intialReportCounter = 0;
  const reportApis = await getApiData();

  if (reportApis) {
    const newReportIds = [];

    for (const reportApi of reportApis) {
      const report = mapReport(reportApi);
      if (!(await getReport(reportApi.report_id))) {

        await db.push(`/${report.report_id}`, report);
        intialReportCounter++;
      }

      newReportIds.push(report.report_id.toString())
    }

    if (intialReportCounter > 0) {
      db.save();
    }

    await refreshReports(newReportIds)
  }

  console.log(`Added ${intialReportCounter} initial reports`)

  console.log('Starting schedule')
  setInterval(async () => {
    console.log('Polling report API')
    let newReports = 0;
    const reportApis = await getApiData();

    if (reportApis) {
      const newReportIds = [];

      for (const reportApi of reportApis) {
        const report = mapReport(reportApi);
        const existingReport = await getReport(reportApi.report_id);
        if (!existingReport) {

          await db.push(`/${report.report_id}`, report);
          sendReport(report);
          newReports++;
        }
        else if (existingReport.latest_report_comment.report_comment_id !== report.latest_report_comment.report_comment_id) {
          await db.delete(`/${report.report_id}/report_comment`);
          await db.push(`/${report.report_id}/report_comment`, report.report_comment);

          await db.delete(`/${report.report_id}/latest_report_comment`);
          await db.push(`/${report.report_id}/latest_report_comment`, report.latest_report_comment);

          sendReport(report);
        }

        newReportIds.push(report.report_id.toString())
      }

      if (newReports > 0) {
        db.save();
        console.log(`Sent ${newReports} new reports`);
      }

      await refreshReports(newReportIds)
    }
  }, parseInt(process.env.REPORT_POLL_SECONDS as string) * 1000);
}

const refreshReports = async (newReportIds: string[]) => {
  const existingReports = await getReports()
  let deletedReports = 0;
  if (existingReports){
  for (const existingReportId of Object.keys(existingReports)) {
    if (!newReportIds.includes(existingReportId)) {
      await db.delete(`/${existingReportId}`)
      deletedReports++;
    }
  }

  if (deletedReports > 0) {
    console.log(`Deleted ${deletedReports} reports`);
    db.save();
  } }
}

const getApiData = async () => {
  const response = await axios.get(report_api_url, {
    headers: {
      'XF-Api-Key': process.env.REPORT_API_KEY
    },
    validateStatus: (status) => {
      if (status === 404) {
        return true;
      }

      return status >= 200 && status < 300;
    }
  }).catch((error) => {
    console.log(error)
  });

  return response?.data?.reports as ReportApi[] | null;
}

const getReport = async (report_id: number): Promise<Report | null> => {
  let result = null;
  try {
    result = await db.getData(`/${report_id}`);
  } catch (error) {
    result = null;
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getReports = async (): Promise<Reports> => {
  let result = null;
  try {
    result = await db.getData(`/`);
  } catch (error) {
    result = null;
  }

  return result;
}

main();
