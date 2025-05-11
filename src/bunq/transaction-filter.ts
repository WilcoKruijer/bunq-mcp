// Utility to filter unique PERSON counterparties from payments
// Usage: import { getUniquePersonCounterparties } from './transaction-filter';

import type { Payment, Counterparty } from "./UserAPI";

/**
 * Returns a list of unique counterparties (type PERSON) from a list of payments.
 * @param payments Array of Payment objects (from UserAPI.getPayments)
 */
export function getUniquePersonCounterparties(payments: Payment[]): Counterparty[] {
  const seen = new Set<string>();
  const result: Counterparty[] = [];

  for (const payment of payments) {
    const cp = payment.counterparty_alias;
    const labelUser = cp?.label_user;
    if (labelUser && labelUser.type === "PERSON") {
      // Use IBAN or display_name or public_nick_name as unique key if available
      const key =
        cp.iban || labelUser.display_name || labelUser.public_nick_name || JSON.stringify(cp);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cp);
      }
    }
  }
  return result.map((cp) => ({
    display_name: cp.display_name,
    public_nick_name: cp.public_nick_name,
    iban: cp.iban,
  }));
}

/**
 * Maps a list of Payment objects to a more human-readable format.
 * Only extracts the most useful fields for display.
 * @param payments Array of Payment objects
 * @returns Array of simplified payment objects
 */
export function mapPaymentsToHumanReadable(payments: Payment[]): Array<{
  id: number;
  created: string;
  amount: { value: string; currency: string };
  description: string;
  type: string;
  counterparty: {
    display_name?: string;
    public_nick_name?: string;
    iban?: string | null;
  };
  merchant_category_code?: string;
}> {
  return payments.map((p) => ({
    id: p.id,
    created: p.created,
    amount: p.amount,
    description: p.description,
    type: p.type,
    counterparty: {
      display_name: p.counterparty_alias?.display_name,
      public_nick_name: p.counterparty_alias?.label_user?.public_nick_name,
      iban: p.counterparty_alias?.iban,
    },
    merchant_category_code: p.counterparty_alias?.merchant_category_code,
  }));
}
