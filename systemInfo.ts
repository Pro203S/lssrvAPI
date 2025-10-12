import info from 'systeminformation';

type DiskData = {
    "device": string,
    "type": string,
    "name": string,
    "vendor": string,
    "size": number,
    "temp": number,
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

let isMonitoring = [
    false, // 0 cpu
    false, // 1 ram
    false, // 2 net
    false, // 3 uptime
    false, // 4 disks
    false, // 5 fsStats
    false  // 6 fsSize
];

async function monitorCpu() {
    if (isMonitoring[0]) return;

    const cpuTemp = await info.cpuTemperature();
    const cpuSpd = await info.cpuCurrentSpeed();
    const cpuLoad = (await info.currentLoad()).cpus.map(v => v.load);

    datas.cpu = {
        "temp": cpuTemp.main ?? -999,
        "speed": cpuSpd.avg,
        "load": (() => {
            let total = 0;

            for (let load of cpuLoad) {
                total += load;
            }

            return Math.round((total / cpuLoad.length) * 100) / 100;
        })()
    };

    await new Promise(r => setTimeout(r, 500));
    return await monitorCpu();
}
async function monitorRam() {
    if (isMonitoring[1]) return;

    const ram = await info.mem();

    datas.ram = {
        "total": ram.total,
        "used": ram.used
    };

    await new Promise(r => setTimeout(r, 500));
    return await monitorRam();
}
async function monitorNet() {
    if (isMonitoring[2]) return;

    const iface = await info.networkInterfaceDefault().catch(() => "");
    if (!iface) {
        console.error("활성 네트워크 인터페이스를 찾지 못했습니다.");
        return;
    }

    isMonitoring[2] = true;

    // baseline
    await info.networkStats(iface);

    const statsArr = await info.networkStats(iface);
    const s = Array.isArray(statsArr) ? statsArr[0] : statsArr;

    const down = s.rx_sec ?? -999;
    const up = s.tx_sec ?? -999;

    datas.net = {
        down: down,
        up: up,
        sent: s.tx_bytes,
        received: s.rx_bytes
    };
    await new Promise(r => setTimeout(r, 500));
    return await monitorNet();
}
async function monitorUptime() {
    if (isMonitoring[3]) return;

    datas.uptime = info.time().uptime;

    await new Promise(r => setTimeout(r, 500));
    return await monitorUptime();
}
async function monitorDisks() {
    if (isMonitoring[4]) return;

    datas.disks = (await info.diskLayout()).map(v => ({
        "device": v.device,
        "type": v.type,
        "name": v.name,
        "vendor": v.vendor,
        "size": v.size,
        "temp": v.temperature ?? -999
    }));

    await new Promise(r => setTimeout(r, 500));
    return await monitorDisks();
}
async function monitorFsStats() {
    if (isMonitoring[5]) return;

    datas.fsStats = await info.fsStats();

    await new Promise(r => setTimeout(r, 500));
    return await monitorFsStats();
}
async function monitorFsSize() {
    if (isMonitoring[6]) return;

    datas.fsSize = await info.fsSize();

    await new Promise(r => setTimeout(r, 500));
    return await monitorFsSize();
}

export function startMonitor() {
    monitorCpu();
    monitorRam();
    monitorNet();
    monitorUptime();
    monitorDisks();
    monitorFsStats();
    monitorFsSize();
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