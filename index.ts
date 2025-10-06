import express from 'express';
import dotenv from 'dotenv';
import chalk from 'chalk';
import dayjs from 'dayjs';
import http from "http";
import InitalizeWebSocket from './socket';
import AuthMiddle from './authMiddle';
import { getStaticInfo } from './systemInfo';
import * as fs from 'fs';

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
if (!process.env.HEARTBEAT_INTERVAL) {
    console.error(chalk.red("HEARTBEAT_INTERVAL key in config.env is missing. Please set it."));
    process.exit(1);
}
//#endregion

log("SystemInformationAPI\n");

log("config.env:");
log("- PORT:", process.env.PORT);
log("- REQUIRED_PW:", process.env.REQUIRED_PW);
log("- AUTH_PW:", process.env.AUTH_PW.split("").map(v => "*").join(""));
log("- HEARTBEAT_INTERVAL:", process.env.HEARTBEAT_INTERVAL, "\n");

app.use(AuthMiddle);

const server = http.createServer(app);
InitalizeWebSocket(server);

app.use("/os_logos/:file", (req, res) => {
    try {
        const { file } = req.params;
        const path = `./os_logos/${file}`;
        if (!fs.existsSync(path)) return res.status(404).json({
            "code": 404,
            "message": "Not Found"
        });

        const read = fs.readFileSync(path);

        return res.status(200).json({
            "img": `data:image/png;base64,${Buffer.from(read).toString("base64")}`
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

app.get("/", async (req, res) => {
    try {
        const { scheme } = req.query;
        return res.status(200).json(await getStaticInfo(String(scheme)));
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