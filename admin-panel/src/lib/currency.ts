/** Formats an amount as Ugandan Shillings, e.g. 15000 -> "UGX 15,000".
 * UGX is conventionally shown without decimal places. */
export function formatUGX(amount: number): string {
  const rounded = Math.round(amount);
  return `UGX ${rounded.toLocaleString("en-US")}`;
}