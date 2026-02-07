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
    report_comment: report_comment[]
}

type report_comment = {
    report_id: number
    report_comment_id: number
    comment_date: number
    message: string
    username: string
    state: string
}

type Report = ReportApi & {
    report_url: string
    latest_report_comment: report_comment;
}

type Reports = Record<string, Report>

const mapReport = (report: ReportApi, reportUrl: string): Report => {
    return {
        ...report,
        report_url: `${reportUrl}${report.report_id}`,
        latest_report_comment: report.report_comment[report.report_comment.length - 1]
    }
}

export { mapReport, Report, ReportApi, Reports, report_comment }
