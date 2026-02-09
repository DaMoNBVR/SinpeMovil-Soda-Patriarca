import { Purchase, Payment, Person } from '../models';

type SummaryItem = {
  personId: string;
  name: string;
  total: number;
};

export function getSummaryByPerson(
  transactions: (Purchase | Payment)[],
  people: Person[]
): SummaryItem[] {
  const summaryMap: { [personId: string]: number } = {};

  transactions.forEach((tx) => {
    if (!summaryMap[tx.personId]) {
      summaryMap[tx.personId] = 0;
    }
    summaryMap[tx.personId] += tx.amount;
  });

  return Object.entries(summaryMap).map(([personId, total]) => {
    const person = people.find((p) => p.id === personId);
    return {
      personId,
      name: person?.name || 'Desconocido',
      total,
    };
  });
}

