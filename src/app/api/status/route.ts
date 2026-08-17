import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";

    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;

      for (const iface of ifaceList) {
        if (iface.family === "IPv4" && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
      if (localIp !== "localhost") break;
    }

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const localUrl = `http://${localIp}:${port}`;

    return NextResponse.json({
      success: true,
      localIp,
      port,
      localUrl,
    });
  } catch (error) {
    console.error("[STATUS API ERROR]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao verificar IP local" },
      { status: 500 }
    );
  }
}
