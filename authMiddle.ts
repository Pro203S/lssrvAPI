import chalk from "chalk";
import { NextFunction, Request, Response } from "express";
import { log } from ".";

export default function AuthMiddle(req: Request, res: Response, next: NextFunction) {
    try {
        if (process.env.REQUIRED_PW !== "yes") return next();

        const originPw = Buffer.from(process.env.AUTH_PW).toString("base64");
        const gotPw = req.headers.authorization;

        if (gotPw !== originPw) return res.status(401).json({
            "code": 401,
            "message": "Unauthorized"
        });

        return next();
    } catch (err) {
        const e = err as Error;
        log(chalk.red("ERROR"), e.message);
        return res.status(500).json({
            "code": 500,
            "message": e.message
        });
    }
}