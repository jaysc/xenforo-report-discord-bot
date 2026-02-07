import { config } from "./config";
import { ApiClient } from "./api-client";
import { ReportRepository } from "./report-repository";
import { DiscordBot } from "./bot";
import { ReportService } from "./report-service";

async function main(): Promise<void> {
  console.log("Starting XenForo Report Consumer...");

  // Initialize Discord bot and connect
  const discord = new DiscordBot(config);
  await discord.connect();

  // Initialize data layer
  const api = new ApiClient(config);
  const repository = new ReportRepository();

  // Initialize service layer
  const service = new ReportService(api, repository, discord, config);

  // Initial load (no notifications to avoid spam)
  console.log("Populating initial report data...");
  await service.processReports(false);

  // Start polling
  console.log(
    `Starting polling schedule (every ${config.pollIntervalMs / 1000}s)`
  );
  setInterval(async () => {
    try {
      await service.processReports(true);
    } catch (error) {
      console.error("Error during report processing:", error);
    }
  }, config.pollIntervalMs);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
