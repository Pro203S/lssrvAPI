declare global {
    namespace NodeJS {
        interface ProcessEnv {
            readonly PORT: string;

            readonly REQUIRED_PW: "yes" | "no";
            readonly AUTH_PW: string;
        }
    }
}

export { }