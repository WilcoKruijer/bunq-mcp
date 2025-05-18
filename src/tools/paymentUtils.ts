export function validateCounterpartyFields(
  counterpartyIban?: string,
  counterpartyEmail?: string,
  counterpartyPhone?: string,
) {
  const provided = [counterpartyIban, counterpartyEmail, counterpartyPhone].filter(Boolean);
  if (provided.length !== 1) {
    return {
      content: [
        {
          type: "text",
          text: "You must provide exactly one of counterpartyIban, counterpartyEmail, or counterpartyPhone.",
        },
      ],
      isError: true,
    };
  }
  return null;
}

export type CounterpartyAlias =
  | { type: "IBAN"; value: string; name?: string }
  | { type: "EMAIL"; value: string; name?: string }
  | { type: "PHONE_NUMBER"; value: string; name?: string };

export function getCounterpartyAlias(
  counterpartyIban?: string,
  counterpartyEmail?: string,
  counterpartyPhone?: string,
  counterpartyName?: string,
): CounterpartyAlias | undefined {
  if (counterpartyIban) {
    return { type: "IBAN", value: counterpartyIban, name: counterpartyName };
  } else if (counterpartyEmail) {
    return { type: "EMAIL", value: counterpartyEmail, name: counterpartyName };
  } else if (counterpartyPhone) {
    return { type: "PHONE_NUMBER", value: counterpartyPhone, name: counterpartyName };
  }
  return undefined;
}
