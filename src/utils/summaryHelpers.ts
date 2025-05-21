type Purchase = {
  id: string;
  personId: string;
  amount: number;
  date: string;
};

type Person = {
  id: string;
  name: string;
};

type SummaryItem = {
  personId: string;
  name: string;
  total: number;
};

export function getSummaryByPerson(
  purchases: Purchase[],
  people: Person[]
): SummaryItem[] {
  const summaryMap: { [personId: string]: number } = {};

  purchases.forEach((purchase) => {
    if (!summaryMap[purchase.personId]) {
      summaryMap[purchase.personId] = 0;
    }
    summaryMap[purchase.personId] += purchase.amount;
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

