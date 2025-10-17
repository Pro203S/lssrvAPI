import info from 'systeminformation';

type DiskData = {
    "device": string,
    "type": string,
    "name": string,
};

export const datas = {
    "cpu": {
        "temp": -999,
        "speed": -999,
        "load": -999
    },
    "ram": {
        "total": -999,
        "used": -999
    },
    "net": {
        "down": -999,
        "up": -999,
        "sent": -999,
        "received": -999
    },
    "uptime": -999,
    "disks": [] as DiskData[],
    "fsStats": null as info.Systeminformation.FsStatsData | null,
    "fsSize": [] as info.Systeminformation.FsSizeData[]
}

const running = {
    cpu: false,
    ram: false,
    net: false,
    uptime: false,
    disks: false,
    fsStats: false,
    fsSize: false,
};

const timers: Partial<Record<keyof typeof running, NodeJS.Timeout>> = {};
let defaultIface: string | null = null;

function every(key: keyof typeof running, ms: number, fn: () => Promise<void>) {
    if (timers[key]) return; // 이미 시작됨
    timers[key] = setInterval(async () => {
        if (running[key]) return; // 겹침 방지
        running[key] = true;
        try {
            await fn();
        } catch (e) {
            // 필요시 로깅
            // console.error(`[${key}]`, e);
        } finally {
            running[key] = false;
        }
    }, ms);
}

async function pickDefaultIface() {
    try {
        defaultIface = await info.networkInterfaceDefault();
    } catch {
        defaultIface = null;
    }
}

export function startMonitor() {
    // 네트워크 인터페이스는 한 번만 선택, 실패 시 주기적으로 재시도
    pickDefaultIface();
    setInterval(() => { if (!defaultIface) pickDefaultIface(); }, 5000);

    // 빠르게 변하는 항목
    every('cpu', 1000, async () => {
        const [cpuTemp, cpuSpd, load] = await Promise.all([
            info.cpuTemperature().catch(() => ({ main: -999 })),
            info.cpuCurrentSpeed().catch(() => ({ avg: -999 })),
            info.currentLoad().catch(() => ({ cpus: [] as { load: number }[] })),
        ]);

        const loads = load.cpus?.map(v => v.load) ?? [];
        const avg = loads.length
            ? Math.round((loads.reduce((a, b) => a + b, 0) / loads.length) * 100) / 100
            : -999;

        datas.cpu = {
            temp: cpuTemp.main ?? -999,
            speed: (cpuSpd as any).avg ?? -999,
            load: avg,
        };
    });

    every('ram', 1000, async () => {
        const m = await info.mem().catch(() => ({ total: -999, used: -999 }));
        datas.ram = { total: m.total, used: m.used };
    });

    every('net', 1000, async () => {
        if (!defaultIface) return;
        const statsArr = await info.networkStats(defaultIface).catch(() => null);
        if (!statsArr) return;
        const s = Array.isArray(statsArr) ? statsArr[0] : statsArr;
        datas.net = {
            down: s?.rx_sec ?? -999,
            up: s?.tx_sec ?? -999,
            sent: s?.tx_bytes ?? -999,
            received: s?.rx_bytes ?? -999,
        };
    });

    every('uptime', 1000, async () => {
        datas.uptime = info.time().uptime ?? -999;
    });

    // 느리게 변하는 항목(부하 큰 API)
    every('disks', 60_000, async () => {
        const disks = await info.diskLayout().catch(() => []);
        datas.disks = disks.map(v => ({ device: v.device, type: v.type, name: v.name }));
    });

    every('fsStats', 5_000, async () => {
        datas.fsStats = await info.fsStats().catch(() => null);
    });

    every('fsSize', 30_000, async () => {
        datas.fsSize = await info.fsSize().catch(() => []);
    });
}

export function stopMonitor() {
    (Object.keys(timers) as (keyof typeof running)[]).forEach(k => {
        if (timers[k]) {
            clearInterval(timers[k]!);
            delete timers[k];
            running[k] = false;
        }
    });
}

export async function getStaticInfo(scheme: string = "dark") {
    const cpu = await info.cpu();
    const mem = await info.mem();
    const os = await info.osInfo();

    return {
        "cpu": {
            "manufacturer": cpu.manufacturer,
            "brand": (() => {
                const brand = cpu.brand;
                if (!brand.startsWith("Ryzen")) return brand;

                return brand.replace(/ \d-Core Processor/i, "");
            })(),
            "cores": cpu.cores
        },
        "mem": mem.total,
        "os": {
            "name": (() => {
                const distro = os.distro;
                if (!distro.startsWith("Microsoft ")) return distro;

                return distro.replace("Microsoft ", "");
            })(),
            "release": os.release,
            "logoUri": (() => {
                switch (os.logofile) {
                    case "android": return "/os_logos/android.png";
                    case "apple": return scheme === "dark" ? "/os_logos/apple_light.png" : "/os_logos/apple_dark.png";
                    case "macos": return scheme === "dark" ? "/os_logos/apple_light.png" : "/os_logos/apple_dark.png";
                    case "debian": return "/os_logos/debian.png";
                    case "fedora": return "/os_logos/fedora.png";
                    case "ubuntu": return "/os_logos/ubuntu.png";
                    case "windows": return "/os_logos/windows.png";
                }

                return "/os_logos/linux.png";
            })()
        }
    }
}