export interface ForecastPeriod {
  name: string;
  temp: number;
  tempUnit: string;
  shortForecast: string;
  precipChance: number;
  windSpeed: string;
  isDaytime: boolean;
}

export interface LocationForecast {
  periods: ForecastPeriod[];
  error?: string;
}

const USER_AGENT = "SteelheadAlley/1.0 (dexflyco@gmail.com)";

export async function fetchNWSForecast(lat: number, lon: number): Promise<LocationForecast> {
  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!pointsRes.ok) throw new Error(`points failed: ${pointsRes.status}`);
    const points = await pointsRes.json();

    const forecastUrl: string = points.properties.forecast;
    const fcRes = await fetch(forecastUrl, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!fcRes.ok) throw new Error(`forecast failed: ${fcRes.status}`);
    const forecast = await fcRes.json();

    const periods: ForecastPeriod[] = (forecast.properties.periods ?? [])
      .slice(0, 6)
      .map((p: any) => ({
        name: p.name,
        temp: p.temperature,
        tempUnit: p.temperatureUnit,
        shortForecast: p.shortForecast,
        precipChance: p.probabilityOfPrecipitation?.value ?? 0,
        windSpeed: p.windSpeed ?? "",
        isDaytime: p.isDaytime,
      }));

    return { periods };
  } catch (e: any) {
    return { periods: [], error: e.message };
  }
}
