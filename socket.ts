import http from "http";
import { WebSocketServer } from "ws";
import { log } from ".";
import chalk from "chalk";
import { getStaticInfo, datas } from "./systemInfo";

const InitalizeWebSocket = (server: http.Server) => {
    const wss = new WebSocketServer({ noServer: true, perMessageDeflate: true });

    server.on("upgrade", (req, socket, head) => {
        const { url } = req;
        if (!url?.startsWith("/socket")) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.destroy();
            return;
        }

        if (process.env.REQUIRED_PW === "yes") {
            if (!url?.endsWith("?pw=" + btoa(process.env.AUTH_PW))) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    });

    wss.on("connection", async (ws) => {
        //const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;

        const heartbeatInterval = Number(process.env.HEARTBEAT_INTERVAL);
        ws.send(JSON.stringify({
            "type": "hello",
            "data": heartbeatInterval
        }));
        ws.send(JSON.stringify({
            "type": "static",
            "data": await getStaticInfo()
        }));

        let realtimeInterval: number = 1000;

        let heartbeatCount: number = 0;
        let heartbeatTimer: NodeJS.Timeout | null = null;
        let heartbeatWatchdog: NodeJS.Timeout | null = null;

        let sendInformation = setInterval(() => {
            for (let key of Object.keys(datas)) {
                ws.send(JSON.stringify({
                    "type": key,
                    //@ts-ignore
                    "data": datas[key]
                }));
            }
        }, realtimeInterval);

        heartbeatTimer = setInterval(() => {
            heartbeatWatchdog = setTimeout(() => {
                if (heartbeatCount === 0) {
                    ws.close(4000, "heartbeat has not been received");
                    return;
                }

                heartbeatCount = 0;
            }, 1500);
        }, heartbeatInterval);

        ws.on("message", async (data, isBinary) => {
            if (isBinary) {
                ws.close(1003, "Unsupported Data");
                return;
            }

            try {
                const json = JSON.parse(data.toString().trimEnd());

                if (json.type === "heartbeat") {
                    heartbeatCount++;

                    if (heartbeatCount > 1) {
                        ws.close(4000, "Too many heartbeats");
                        return;
                    }

                    ws.send(JSON.stringify({
                        "type": "heartbeat"
                    }));
                    return;
                }

                ws.close(4000, "Unsupported Operation");
                return;
            } catch (err) {
                const e = err as Error;
                if (e.message.includes("JSON")) return ws.close(1003, "Unsupported Data");

                log(chalk.red("ERROR"), e.message);
                ws.close(1011, e.name);
            }
        });

        ws.on("close", () => {
            clearInterval(sendInformation);
            clearInterval(heartbeatTimer!);
            clearTimeout(heartbeatWatchdog!);
        });
    });
};

export default InitalizeWebSocket;