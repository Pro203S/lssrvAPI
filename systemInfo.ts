import info from 'systeminformation';

let networkStats = {
    down: 0,
    up: 0,
    sent: 0,
    received: 0
};

let isMonitoring = false;

async function monitorNetwork() {
    if (isMonitoring) return;

    const iface = await info.networkInterfaceDefault().catch(() => "");
    if (!iface) {
        console.error("활성 네트워크 인터페이스를 찾지 못했습니다.");
        return;
    }

    isMonitoring = true;

    // baseline
    await info.networkStats(iface);

    const statsArr = await info.networkStats(iface);
    const s = Array.isArray(statsArr) ? statsArr[0] : statsArr;

    const down = s.rx_sec ?? 0;
    const up = s.tx_sec ?? 0;

    networkStats = {
        down: down,
        up: up,
        sent: s.tx_bytes,
        received: s.rx_bytes
    };
    await new Promise(r => setTimeout(r, 1000));
    await monitorNetwork();
};
monitorNetwork();

export async function getRealtimeInfo() {
    const cpuTemp = await info.cpuTemperature();
    const ram = await info.mem();
    const { uptime } = info.time();
    const cpuSpd = await info.cpuCurrentSpeed();

    return {
        "cpu": {
            "temp": cpuTemp.main ?? -999,
            "speed": cpuSpd,
            "load": (await info.currentLoad()).cpus.map(v => v.load)
        },
        "ram": {
            "total": ram.total,
            "used": ram.used
        },
        "net": networkStats,
        "uptime": uptime,
        "disks": (await info.diskLayout()).map(v => ({
            "device": v.device,
            "type": v.type,
            "name": v.name,
            "vendor": v.vendor,
            "size": v.size,
            "temp": v.temperature ?? -999
        })),
        "fsStats": await info.fsStats(),
        "fsSize": await info.fsSize()
    };
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