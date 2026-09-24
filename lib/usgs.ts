export interface GaugeReading {
  siteId: string;
  siteName: string;
  datetime: string;
  cfs: number | null;
  gaugeFt: number | null;
  waterTempC: number | null;
  waterTempF: number | null;
  turbidityNTU: number | null; // water clarity sensor (FNU/NTU); null = no sensor at this gauge
  cfsHistory: { dateTime: string; value: number }[];
}

// 00060=discharge(CFS), 00065=gauge height(ft), 00010=water temp(C), 00076=turbidity(FNU)
const PARAM_CODES = "00060,00065,00010,00076";

export async function fetchUSGS(siteIds: string[]): Promise<Record<string, GaugeReading>> {
  const sites = siteIds.join(",");
  const url =
    `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${sites}` +
    `&parameterCd=${PARAM_CODES}&siteStatus=active&period=PT48H`;

  // Retry up to 3 times — USGS occasionally returns 503 under load
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      });
      if (res.ok) return parseUSGS(await res.json());
      if (res.status !== 503 || attempt === 3)
        throw new Error(`USGS fetch failed: ${res.status}`);
    } catch (e) {
      if (attempt === 3) throw e;
    }
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  return {};
}

function safeVal(raw: any): number | null {
  const n = parseFloat(raw?.value);
  return isNaN(n) || n <= -999 ? null : n;
}

function parseUSGS(raw: any): Record<string, GaugeReading> {
  const result: Record<string, GaugeReading> = {};

  for (const ts of raw?.value?.timeSeries ?? []) {
    const siteId: string = ts.sourceInfo.siteCode[0].value;
    const paramCode: string = ts.variable.variableCode[0].value;
    const values: any[] = ts.values[0]?.value ?? [];

    if (!result[siteId]) {
      result[siteId] = {
        siteId,
        siteName: ts.sourceInfo.siteName,
        datetime: values.at(-1)?.dateTime ?? "",
        cfs: null,
        gaugeFt: null,
        waterTempC: null,
        waterTempF: null,
        turbidityNTU: null,
        cfsHistory: [],
      };
    }

    const val = safeVal(values.at(-1));

    if (paramCode === "00060") {
      result[siteId].cfs = val;
      result[siteId].cfsHistory = values
        .filter((v: any) => v.value !== "-999999" && v.value !== "" && parseFloat(v.value) > -999)
        .map((v: any) => ({ dateTime: v.dateTime, value: parseFloat(v.value) }))
        .filter((v: any) => !isNaN(v.value));
    } else if (paramCode === "00065") {
      result[siteId].gaugeFt = val;
    } else if (paramCode === "00010") {
      result[siteId].waterTempC = val;
      result[siteId].waterTempF = val !== null ? Math.round((val * 9) / 5 + 32) : null;
    } else if (paramCode === "00076") {
      result[siteId].turbidityNTU = val;
    }
  }

  return result;
}
