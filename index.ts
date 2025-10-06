import express from 'express';
import dotenv from 'dotenv';
import chalk from 'chalk';
import dayjs from 'dayjs';
import info from 'systeminformation';
import path from 'path';
import http from "http";
import InitalizeWebSocket from './socket';
import AuthMiddle from './authMiddle';

dotenv.config({
    "path": "config.env",
    "quiet": true
});

const app = express();
export const log = (...args: any[]) => console.log(`[${chalk.gray(dayjs().format("YYYY/MM/DD HH:MM:ss.SSS"))}]`, ...args);

//#region Check config.env
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
//#endregion

log("SystemInformationAPI\n");

log("config.env:");
log("- PORT:", process.env.PORT);
log("- REQUIRED_PW:", process.env.REQUIRED_PW);
log("- AUTH_PW:", process.env.AUTH_PW.split("").map(v => "*").join(""), "\n");

app.use(AuthMiddle);

const server = http.createServer(app);
InitalizeWebSocket(server);

app.use("/os_logos", express.static(path.join(__dirname, "os_logos")));

app.get("/", async (req, res) => {
    try {
        const { scheme } = req.query;
        const cpu = await info.cpu();
        const mem = await info.mem();
        const os = await info.osInfo();

        return res.status(200).json({
            "cpu": {
                "manufacturer": cpu.manufacturer,
                "brand": cpu.brand,
                "cores": cpu.cores
            },
            "mem": mem.total,
            "os": {
                "name": os.distro,
                "release": os.release,
                "logoUri": (() => {
                    switch (os.logofile) {
                        case "android": return "/os_logos/android.svg";
                        case "apple": return scheme === "dark" ? "/os_logos/apple_dark.svg" : "/os_logos/apple_light.svg";
                        case "macos": return scheme === "dark" ? "/os_logos/apple_dark.svg" : "/os_logos/apple_light.svg";
                        case "debian": return "/os_logos/debian.svg";
                        case "fedora": return "/os_logos/fedora.svg";
                        case "ubuntu": return "/os_logos/ubuntu.svg";
                        case "windows": return "/os_logos/windows.svg";
                    }

                    return "/os_logos/lunux.svg";
                })()
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
});

server.listen(process.env.PORT, () => {
    log("API server listening on", process.env.PORT);
});