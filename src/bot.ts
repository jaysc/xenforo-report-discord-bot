import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
import { Config } from "./config";
import { Report } from "./report";
import { IDiscordBot } from "./report-service";
import dayjs from "dayjs";

export class DiscordBot implements IDiscordBot {
  private readonly client: Client;
  private readonly token: string;
  private readonly channelId: string;
  private channel: TextChannel | null = null;

  constructor(config: Config) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
    this.token = config.discordApiKey;
    this.channelId = config.discordChannelId;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.once(Events.ClientReady, async (c) => {
        console.log(`Ready! Logged in as ${c.user.tag}`);

        // Validate and cache the channel
        try {
          await this.validateChannel();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.client.once(Events.Error, (error) => {
        console.error("Discord client error:", error);
        reject(new Error("Failed to connect to Discord"));
      });

      this.client.login(this.token).catch(reject);
    });
  }

  private async validateChannel(): Promise<void> {
    const channel = this.client.channels.cache.get(this.channelId);

    if (!channel) {
      // Try fetching the channel if not in cache
      try {
        const fetchedChannel = await this.client.channels.fetch(this.channelId);
        if (!fetchedChannel) {
          throw new Error(
            `Discord channel not found: ${this.channelId}. Please verify the channel ID.`
          );
        }
        if (!fetchedChannel.isTextBased()) {
          throw new Error(
            `Discord channel ${this.channelId} is not a text channel`
          );
        }
        this.channel = fetchedChannel as TextChannel;
      } catch (error) {
        throw new Error(
          `Failed to fetch Discord channel ${this.channelId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      if (!channel.isTextBased()) {
        throw new Error(
          `Discord channel ${this.channelId} is not a text channel`
        );
      }
      this.channel = channel as TextChannel;
    }

    console.log(`Validated Discord channel: ${this.channel.name}`);
  }

  async sendReport(report: Report): Promise<void> {
    if (!this.channel) {
      console.error("Cannot send report: channel not initialized");
      return;
    }

    const embed = this.createReportEmbed(report);
    if (embed) {
      try {
        await this.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to send Discord message:", error);
      }
    }
  }

  private createReportEmbed(report: Report): EmbedBuilder | null {
    try {
      const date = dayjs.unix(report.first_report_date);

      const embed = new EmbedBuilder()
        .setTitle(`${report.content_info.username} - [${report.report_id}]`)
        .addFields(
          { name: "Report date", value: date.format("YYYY-MM-DD") },
          { name: "Reported by", value: report.latest_report_comment.username },
          {
            name: "Thread title",
            value: report.content_info?.thread_title || "No thread title",
          },
          { name: "Report count", value: report.report_count.toString() }
        )
        .setDescription(report.latest_report_comment.message)
        .setURL(report.report_url)
        .setTimestamp();

      return embed;
    } catch (error) {
      console.error("Failed to create report embed:", error);
      console.log("Report data:", {
        report_id: report.report_id,
        username: report.content_info?.username,
        thread_title: report.content_info?.thread_title,
        report_count: report.report_count,
      });
      return null;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.destroy();
    console.log("Discord client disconnected");
  }
}
