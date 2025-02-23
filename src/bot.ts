import { Client, EmbedBuilder, Events, GatewayIntentBits } from 'discord.js';
import type { TextChannel } from 'discord.js'
import { Report, Reports } from './report';
import dayjs from 'dayjs'

const token = process.env.DISCORD_API_KEY

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const connect = async () => {
    return new Promise<boolean>((resolve, reject) => {
        client.once(Events.ClientReady, c => {
            console.log(`Ready! Logged in as ${c.user.tag}`);
            resolve(true);
        });

        client.once(Events.Error, c => {
            console.error(c)
            reject(false)
        })

        client.login(token);
    })
}

const getReportChannel = () => {
    // todo need better way to store and validate this
    return client.channels.cache.get(process.env.DISCORD_REPORT_CHANNEL_ID as string) as TextChannel | undefined;
}

const sendReport = async (report: Report) => {
    const channel = getReportChannel();
    if (!channel) {
        return;
    }

    const embed = createReportEmbed(report)
    if (embed) {
        await channel.send({ embeds: [embed] });
    }
}

const createReportEmbed = (report: Report) => {
    const date = dayjs.unix(report.first_report_date);
    //const description = `Days since report opened: **${dayjs().diff(date, 'day')}**`
    try {
        const reportEmbed = new EmbedBuilder()
        .setTitle(`${report.content_info.username} - [${report.report_id}]`)
        .addFields(
            { name: "Report date", value: date.format('YYYY-MM-DD') },
            { name: "Reported by", value: report.latest_report_comment.username },
            { name: "Thread title", value: report.content_info.thread_title },
            { name: "Report count", value: report.report_count.toString() }
        )
        .setDescription(report.latest_report_comment.message)
        .setURL(report.report_url)
        .setTimestamp()
        return reportEmbed;
    } catch (e) {
        console.error(e)
        console.log({ name: "Report date", value: date.format('YYYY-MM-DD') },
        { name: "Reported by", value: report.latest_report_comment.username },
        { name: "Thread title", value: report.content_info.thread_title },
        { name: "Report count", value: report.report_count.toString() })

        return null;
    }
}

const sendCurrentReports = async (reports: Reports) => {
    const channel = getReportChannel();
    if (!channel) {
        return;
    }

    for (const report of Object.values(reports)) {
        const embed = createReportEmbed(report)
        if (embed) {
            await channel.send({ embeds: [embed] });
        }
    }
}


export { connect, sendCurrentReports, sendReport };