declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BASE_URL: string;
            DISCORD_API_KEY: string;
            DISCORD_REPORT_CHANNEL_ID: string;
            REPORT_POLL_SECONDS: string;
            REPORT_API_KEY: string;
        }
    }
}

export { }