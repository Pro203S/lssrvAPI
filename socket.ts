import http from "http";
import { WebSocketServer, WebSocket } from "ws";

const InitalizeWebSocket = (server: http.Server) => {
    const wss = new WebSocketServer({ noServer: true, perMessageDeflate: true });

    server.on("upgrade", (req, socket, head) => {
        const { url, headers } = req;
        if (!url?.startsWith("/socket")) {
            socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
            socket.destroy();
            return;
        }

        if (process.env.REQUIRED_PW === "yes") {
            const originPw = Buffer.from(process.env.AUTH_PW).toString("base64");
            const gotPw = headers.authorization;

            if (gotPw !== originPw) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
        });
    });

    wss.on("connection", (ws, req) => {
        const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;

        ws.send(JSON.stringify({
            "type": "hello",
            ip
        }));

        ws.on("message", (data, isBinary) => {
            if (isBinary) {
                ws.close(1003, "Unsupported Data");
                return;
            }

            try {
                const json = JSON.parse(data.toString().trimEnd());

                if (json.type === "heartbeat") {

                }
            } catch (err) {
                const e = err as Error;
                ws.close(1011, e.name);
            }
        });


    });
};

export default InitalizeWebSocket;