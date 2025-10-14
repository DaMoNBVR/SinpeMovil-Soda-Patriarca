import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Person, Purchase, Payment } from '../models';

function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `Semana del ${startDate.getDate()} de ${meses[startDate.getMonth()]} al ${endDate.getDate()} de ${meses[endDate.getMonth()]}`;
}

export async function generatePDFReport(title: string, content: string) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { text-align: center; color: #333; }
          h2 { margin-top: 30px; color: #444; }
          .item { margin: 4px 0; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${content}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
}

export async function sharePDFForPerson(
  person: Person,
  purchases: Purchase[],
  payments: Payment[],
  selectedWeekStartDate?: Date
) {
  const title = selectedWeekStartDate
    ? `Historial de ${person.name} - ${formatWeekRange(selectedWeekStartDate)}`
    : `Historial de ${person.name}`;

  const formatType = (type: Payment['type']) => {
    switch (type) {
      case 'prepaid':
        return 'Pago anticipado';
      case 'debtPayment':
        return 'Pago de deuda';
      case 'manualAdjustment':
        return 'Ajuste manual';
      default:
        return 'Otro';
    }
  };

  const sortedPurchases = purchases
    .filter(p => p.personId === person.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const sortedPayments = payments
    .filter(p => p.personId === person.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const purchasesHTML = sortedPurchases.length
    ? sortedPurchases
        .map(p => `<div class="item">📅 ${p.date}: ₡${p.amount.toFixed(2)} - ${p.description || 'Sin descripción'}</div>`)
        .join('')
    : '<div class="item">No hay compras registradas.</div>';

  const paymentsHTML = sortedPayments.length
    ? sortedPayments
        .map(p => `<div class="item">📅 ${p.date}: ₡${p.amount.toFixed(2)} - ${formatType(p.type)}${p.comment ? ` (${p.comment})` : ''}</div>`)
        .join('')
    : '<div class="item">No hay pagos registrados.</div>';

  const html = `
    <h2>📦 Compras</h2>
    ${purchasesHTML}
    <h2>💰 Pagos y Ajustes</h2>
    ${paymentsHTML}
  `;

  await generatePDFReport(title, html);
}
