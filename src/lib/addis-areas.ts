export type AddisArea = {
  name: string;
  latitude: number;
  longitude: number;
};

export const ADDIS_AREAS: AddisArea[] = [
  { name: "Bole", latitude: 8.9975, longitude: 38.7878 },
  { name: "Kazanchis", latitude: 9.0109, longitude: 38.7622 },
  { name: "Piassa", latitude: 9.0351, longitude: 38.7521 },
  { name: "Saris", latitude: 8.9468, longitude: 38.7476 },
  { name: "Megenagna", latitude: 9.0303, longitude: 38.7973 },
  { name: "Lideta", latitude: 9.0125, longitude: 38.7386 },
  { name: "Arat Kilo", latitude: 9.0354, longitude: 38.7616 },
  { name: "CMC", latitude: 9.0404, longitude: 38.8172 },
  { name: "Mexico", latitude: 9.0047, longitude: 38.7461 },
  { name: "Gerji", latitude: 8.9995, longitude: 38.8133 },
  { name: "Sar Bet", latitude: 8.9867, longitude: 38.7573 },
  { name: "Addis Ketema", latitude: 9.0308, longitude: 38.7323 },
];

export function findArea(name: string) {
  return ADDIS_AREAS.find((area) => area.name.toLowerCase() === name.trim().toLowerCase());
}
