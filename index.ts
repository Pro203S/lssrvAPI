import express from 'express';
import dotenv from 'dotenv';
import chalk from 'chalk';
import dayjs from 'dayjs';
import info from 'systeminformation';
import path from 'path';
dotenv.config({
    "path": "config.env",
    "quiet": true
});

const app = express();

if (!process.env.PORT) {
    console.error(chalk.red("PORT key in config.env is missing. Please set it."));
    process.exit(1);
}
if (process.env.REQUIRED_PW !== "yes" && process.env.REQUIRED_PW !== "no") {
    console.error(chalk.red("The REQUIRED_PW key in config.env is not of the type. Please set the value to yes or no."));
    process.exit(1);
}
if (!process.env.AUTH_PW) {
    console.error(chalk.red("AUTH_PW key in config.env is missing. Please set it."));
    process.exit(1);
}

const log = (...args: string[]) => console.log(`[${chalk.gray(dayjs().format("YYYY/MM/DD HH:MM:ss.SSS"))}]`, ...args);

log("SystemInformationAPI\n");

log("config.env:");
log("- PORT:", process.env.PORT);
log("- REQUIRED_PW:", process.env.REQUIRED_PW);
log("- AUTH_PW:", process.env.AUTH_PW.split("").map(v => "*").join(""), "\n");

app.use("/os_logos", express.static(path.join(__dirname, "os_logos")));

app.get("/", async (req, res) => {
    try {
        const cpu = await info.cpu();
        const mem = await info.mem();
        const net = (await info.networkStats())[0];
        
        return res.status(200).json({
            "cpu": {
                "manufacturer": cpu.manufacturer,
                "brand": cpu.brand,
                "vendor": cpu.vendor,
                "family": cpu.family,
                "cores": cpu.cores,
                "speed": {
                    "max": cpu.speedMax,
                    "min": cpu.speedMin,
                    "cur": cpu.speed
                },
                "socket": cpu.socket
            },
            "mem": {
                "total": mem.total,
                "free": mem.free,
                "used": mem.used
            },
            "net": {
                "received": net.rx_bytes,
                "sent": net.tx_bytes
            }
        });
    } catch (err) {
        const e = err as Error;
        log(chalk.red("ERROR"), e.message);
        return res.status(500).json({
            "code": 500,
            "message": e.message
        });
    }
})

app.listen(process.env.PORT, () => {
    log("API server listening on", process.env.PORT);
});