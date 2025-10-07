import info from 'systeminformation';

let networkStats = {
    down: {
        "Bps": 0,
        "KBps": 0,
        "MBps": 0
    },
    up: {
        "Bps": 0,
        "KBps": 0,
        "MBps": 0
    },
    sent: 0,
    received: 0
};

function convertUnits(Bps: number) {
    return {
        Bps,
        KBps: Bps / 1_000, // 1 KB = 1000 bytes
        MBps: Bps / 1_000_000
    };
}
let networkStatsInterval: NodeJS.Timeout | null = null;

async function monitorNetwork(intervalMs = 1000) {
    if (networkStatsInterval) return;

    const iface = await info.networkInterfaceDefault().catch(() => "");
    if (!iface) {
        console.error("활성 네트워크 인터페이스를 찾지 못했습니다.");
        return;
    }

    // baseline
    await info.networkStats(iface);

    networkStatsInterval = setInterval(async () => {
        const statsArr = await info.networkStats(iface);
        const s = Array.isArray(statsArr) ? statsArr[0] : statsArr;

        const down = s.rx_sec ?? 0;
        const up = s.tx_sec ?? 0;

        networkStats = {
            down: convertUnits(down),
            up: convertUnits(up),
            sent: s.tx_bytes,
            received: s.rx_bytes
        };
    }, intervalMs);
};
monitorNetwork(1000);

export async function getRealtimeInfo() {
    const cpuTemp = await info.cpuTemperature();
    const cpuInfo = await info.cpu();
    const ram = await info.mem();

    return {
        "cpu": {
            "temp": cpuTemp.main ?? -1,
            "speed": cpuInfo.speed
        },
        "ram": {
            "total": ram.total,
            "used": ram.used
        },
        "net": networkStats
    };
}

export async function getStaticInfo(scheme: string = "dark") {
    const cpu = await info.cpu();
    const mem = await info.mem();
    const os = await info.osInfo();
    const disk = await info.fsSize();
    const diskTTL = disk.reduce(
        (acc, d) => {
            acc.total += d.size;
            acc.used += d.used;
            return acc;
        },
        { total: 0, used: 0 }
    );


    return {
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
        },
        "disk": diskTTL
    }
}