export function formattedBids(bids: any): any {
  return Object.entries(bids || {}).map(([id, bid]) => ({
    id,
    ...(typeof bid === "object" && bid !== null ? bid : {}),
  }));
}
