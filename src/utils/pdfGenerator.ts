import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Person, Purchase, Payment } from '../models';

function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const meses = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
  return `Semana del ${startDate.getDate()} de ${meses[startDate.getMonth()]} al ${endDate.getDate()} de ${meses[endDate.getMonth()]}`;
}

export async function sharePDFForPerson(
  person: Person,
  purchases: Purchase[],
  payments: Payment[],
  selectedWeekStartDate?: Date,
  currentBalance: number = 0 // 👈 AHORA RECIBIMOS EL SALDO
) {
  const title = selectedWeekStartDate
    ? `Estado de Cuenta - ${formatWeekRange(selectedWeekStartDate)}`
    : `Estado de Cuenta General`;

  const formatType = (type: Payment['type']) => {
    switch (type) {
      case 'prepaid': return 'Pago anticipado';
      case 'debtPayment': return 'Pago de deuda';
      case 'manualAdjustment': return 'Ajuste manual';
      default: return 'Otro';
    }
  };

  const sortedPurchases = [...purchases].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));

  // Generar filas para compras
  const purchasesRows = sortedPurchases.map(p => `
    <tr>
      <td>${p.date}</td>
      <td>${p.description || 'Consumo en Soda'}</td>
      <td class="amount text-red">- ₡${p.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  // Generar filas para pagos
  const paymentsRows = sortedPayments.map(p => `
    <tr>
      <td>${p.date}</td>
      <td>${formatType(p.type)}${p.comment ? ` (${p.comment})` : ''}</td>
      <td class="amount text-green">+ ₡${p.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #007bff; font-size: 24px; }
          .header h2 { margin: 5px 0 0 0; color: #555; font-size: 16px; font-weight: normal; }
          .client-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .client-info p { margin: 5px 0; font-size: 14px; }
          .balance-box { font-size: 18px; font-weight: bold; margin-top: 10px; color: ${currentBalance < 0 ? '#d9534f' : '#5cb85c'}; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          th { background-color: #f2f2f2; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .amount { text-align: right; font-weight: bold; }
          .text-red { color: #d9534f; }
          .text-green { color: #5cb85c; }
          .footer { text-align: center; font-size: 12px; color: #888; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Movimientos</h1>
          <h2>${title}</h2>
        </div>
        
        <div class="client-info">
          <p><strong>Cliente:</strong> ${person.name}</p>
          ${person.guardianName ? `<p><strong>Encargado:</strong> ${person.guardianName}</p>` : ''}
          <div class="balance-box">
            Saldo al finalizar el periodo: ${currentBalance < 0 ? 'Debe' : 'A favor'} ₡${Math.abs(currentBalance).toFixed(2)}
          </div>
        </div>

        <h3>📦 Compras y Consumos</h3>
        ${sortedPurchases.length > 0 ? `
          <table>
            <tr><th>Fecha</th><th>Descripción</th><th class="amount">Monto</th></tr>
            ${purchasesRows}
          </table>
        ` : '<p style="color: #666; font-style: italic;">No hay compras en este periodo.</p>'}

        <h3>💰 Pagos y Ajustes</h3>
        ${sortedPayments.length > 0 ? `
          <table>
            <tr><th>Fecha</th><th>Descripción</th><th class="amount">Monto</th></tr>
            ${paymentsRows}
          </table>
        ` : '<p style="color: #666; font-style: italic;">No hay pagos en este periodo.</p>'}

        <div class="footer">
          Generado automáticamente por el Sistema de Soda.
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
}

export async function generatePDFReport(title: string, content: string) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          h1 { text-align: center; color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; font-size: 24px; }
          h2 { margin-top: 30px; color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 18px; }
          .item { margin: 8px 0; font-size: 15px; }
          hr { border: 0; border-top: 2px dashed #ccc; margin: 30px 0; }
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