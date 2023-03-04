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
    for (const reportApi of reportApis) {
      if (!(await getReport(reportApi.report_id))) {
        const report = mapReport(reportApi);

        await db.push(`/${report.report_id}`, report);
        intialReportCounter++;
      }
    }

    db.save();
  }
  console.log(`Added ${intialReportCounter} initial reports`)

  console.log('Starting schedule')
  setInterval(async () => {
    console.log('Polling report API')
    let newReports = 0;
    const reportApis = await getApiData();

    if (reportApis) {
      for (const reportApi of reportApis) {
        if (!(await getReport(reportApi.report_id))) {
          const report = mapReport(reportApi);

          await db.push(`/${report.report_id}`, report);
          sendReport(report);
          newReports++;
        }
      }
  
      db.save();

      console.log(`Sent ${newReports} new reports`);
    }
  }, parseInt(process.env.REPORT_POLL_SECONDS as string) * 1000);
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