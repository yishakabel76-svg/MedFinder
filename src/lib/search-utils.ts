import type { StockStatus } from "@/db/schema";

export const FRESHNESS_WINDOW_HOURS = 24;
export type AvailabilityStatus = StockStatus | "unconfirmed";

export function normalizeSearchTerm(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function stringSimilarity(query: string, candidate: string) {
  if (!query || !candidate) return 0;
  if (query === candidate) return 1;
  if (candidate.includes(query)) {
    if (query.length < 3) return candidate.startsWith(query) ? 0.78 : 0;
    return 0.94 - Math.min(0.12, (candidate.length - query.length) / 100);
  }
  if (query.includes(candidate)) return query.length >= 3 ? 0.82 : 0;

  const queryTokens = query.split(" ");
  const candidateTokens = candidate.split(" ");
  const tokenScore = queryTokens.reduce((sum, token) => {
    const best = candidateTokens.reduce((score, other) => {
      const distance = levenshteinDistance(token, other);
      return Math.max(score, 1 - distance / Math.max(token.length, other.length, 1));
    }, 0);
    return sum + best;
  }, 0) / queryTokens.length;
  const fullScore = 1 - levenshteinDistance(query, candidate) / Math.max(query.length, candidate.length, 1);
  return Math.max(tokenScore * 0.94, fullScore);
}

export function medicineMatchScore(query: string, medicine: {
  genericName: string;
  brandNames: string[];
  nameAmharic: string;
  strength: string;
  form: string;
}) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return 0;
  const candidates = [
    medicine.genericName,
    ...medicine.brandNames,
    medicine.nameAmharic,
    `${medicine.genericName} ${medicine.strength} ${medicine.form}`,
  ].map(normalizeSearchTerm).filter(Boolean);
  return Math.max(...candidates.map((candidate) => stringSimilarity(normalizedQuery, candidate)), 0);
}

export function distanceKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDifference = radians(toLatitude - fromLatitude);
  const longitudeDifference = radians(toLongitude - fromLongitude);
  const a = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getAvailabilityStatus(status: StockStatus, lastConfirmedAt: Date, now = Date.now()): AvailabilityStatus {
  const ageHours = (now - new Date(lastConfirmedAt).getTime()) / (60 * 60 * 1000);
  if (status !== "out_of_stock" && ageHours > FRESHNESS_WINDOW_HOURS) return "unconfirmed";
  return status;
}

export function freshnessLabel(lastConfirmedAt: Date, now = Date.now()) {
  const ageMinutes = Math.max(0, Math.floor((now - new Date(lastConfirmedAt).getTime()) / 60000));
  if (ageMinutes < 1) return "just now";
  if (ageMinutes < 60) return `${ageMinutes} min ago`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours} hr${ageHours === 1 ? "" : "s"} ago`;
  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays} day${ageDays === 1 ? "" : "s"} ago`;
}
