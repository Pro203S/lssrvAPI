import http from "http";
import { WebSocketServer } from "ws";
import { log } from ".";
import chalk from "chalk";
import { getStaticInfo, realtime_cpu, realtime_disks, realtime_fsSize, realtime_fsStats, realtime_net, realtime_ram, realtime_uptime } from "./systemInfo";

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

        let isStopped: boolean[] = [false, false, false, false, false, false, false];
        let doNotSendInformation = false;
        const sendInformation = [
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[0] = true;
                    return;
                }
                isStopped[0] = false;

                ws.send(JSON.stringify({
                    "type": "cpu",
                    "data": await realtime_cpu()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[0](interval);
            }, // 0 cpu
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[1] = true;
                    return;
                }
                isStopped[1] = false;

                ws.send(JSON.stringify({
                    "type": "ram",
                    "data": await realtime_ram()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[1](interval);
            }, // 1 ram
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[2] = true;
                    return;
                }
                isStopped[2] = false;

                ws.send(JSON.stringify({
                    "type": "net",
                    "data": realtime_net()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[2](interval);
            }, // 2 net
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[3] = true;
                    return;
                }
                isStopped[3] = false;

                ws.send(JSON.stringify({
                    "type": "cpu",
                    "data": realtime_uptime()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[3](interval);
            }, // 3 uptime
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[4] = true;
                    return;
                }
                isStopped[4] = false;

                ws.send(JSON.stringify({
                    "type": "disks",
                    "data": await realtime_disks()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[4](interval);
            }, // 4 disks
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[5] = true;
                    return;
                }
                isStopped[5] = false;

                ws.send(JSON.stringify({
                    "type": "fsStats",
                    "data": await realtime_fsStats()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[5](interval);
            }, // 5 fsStats
            async (interval: number) => {
                if (doNotSendInformation) {
                    isStopped[6] = true;
                    return;
                }
                isStopped[6] = false;

                ws.send(JSON.stringify({
                    "type": "fsSize",
                    "data": await realtime_fsSize()
                }))

                await new Promise(r => setTimeout(r, interval));
                await sendInformation[6](interval);
            } // 6 fsSize
        ];
        sendInformation.forEach(v => v(realtimeInterval));

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

                if (json.type === "interval") {
                    realtimeInterval = json.interval;

                    doNotSendInformation = true;
                    await new Promise<void>(r => {
                        const a = setInterval(() => {
                            if (!isStopped.includes(false)) {
                                clearInterval(a);
                                r();
                                return;
                            }
                        });
                    });

                    doNotSendInformation = false;
                    sendInformation.forEach(v => v(realtimeInterval));

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
            doNotSendInformation = true;
            clearInterval(heartbeatTimer!);
            clearTimeout(heartbeatWatchdog!);
        });
    });
};

export default InitalizeWebSocket;