type ReportApi = {
    report_id: number
    report_count: number
    last_modified_date: number
    first_report_date: number
    content_info: {
        message: string
        node_id: number
        node_name: string
        post_id: number
        thread_id: number
        thread_title: string
        user_id: number
        username: string
        post_date: number
    }
}

type Report = ReportApi & {
    report_url: string
}

type Reports = Record<string, Report>

const reportUrl = `${process.env.BASE_URL}forums/reports/`

const mapReport = (report: ReportApi): Report => {
    return {
        ...report,
        report_url: `${reportUrl}${report.report_id}`
    }
}

export { mapReport, Report, ReportApi, Reports }