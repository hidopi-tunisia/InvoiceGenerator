import * as FileSystem from 'expo-file-system';
import { printToFileAsync } from 'expo-print';

import { getInvoiceCurrency, getTotals } from './invoice';
import { Invoice } from '../schema/invoice';

const generateHtml = (invoice: Invoice) => {
  const { subtotal, taxRate, tax, total } = getTotals(invoice);
  const currency = getInvoiceCurrency(invoice);
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Facture</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          line-height: 1.6;
          color: #333;
        }
    
        .invoice-container {
          max-width: 800px;
          margin: auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
    
        h1 {
          text-align: center;
          font-size: 24px;
          margin-bottom: 20px;
        }
    
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
    
        .header .logo {
          width: 150px;
        }
    
        .header .invoice-title {
          text-align: right;
        }
    
        .header .invoice-title h1 {
          margin: 0;
          font-size: 22px;
          color: #444;
        }
    
        .header .invoice-title p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
    
        .details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
    
        .details .section {
          width: 48%;
        }
    
        .details .section h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: #444;
        }
    
        .details .section p {
          margin: 5px 0;
          font-size: 14px;
        }
    
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
    
        table th,
        table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
    
        table th {
          background-color: #f4f4f4;
        }
    
        .total {
          text-align: right;
          font-weight: bold;
          margin-top: 20px;
        }
    
        .total div {
          margin: 5px 0;
        }
    
        .payment-terms {
          margin-top: 30px;
          font-size: 14px;
          color: #666;
        }
    
        .payment-terms h2 {
          font-size: 16px;
          margin-bottom: 10px;
          color: #444;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="invoice-title">
            <h1>Facture</h1>
<p><strong>Numéro :</strong> #${invoice.invoiceNumber || 'N/A'}</p>
<p><strong>Date :</strong> ${
    invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'
  }</p>
${
  invoice.invoiceDueDate
    ? `<p><strong>Date d'échéance :</strong> ${new Date(
        invoice.invoiceDueDate
      ).toLocaleDateString()}</p>`
    : ''
}
 </div>
        </div>
    
        <!-- Details -->
        <div class="details">
          <div class="section">
            <h2>De :</h2>
            <p>${invoice.sender.name}</p>
            <p>${invoice.sender.address}</p>
            
            <p>${invoice.sender.tva}</p>
          </div>
          <div class="section">
            <h2>À :</h2>
            <p>${invoice.recipient.name}</p>
            <p>${invoice.recipient.address}</p>
            <p>${invoice.recipient.email || ''}</p>
            <p>${invoice.recipient.tva || ''}</p>
          </div>
        </div>
    
        <!-- Items -->
        <div>
          <h2>Détails de la facture :</h2>
          <table>
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Quantité</th>
                <th>Prix Unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
            ${invoice.items
              .map(
                (item) =>
                  `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price.toFixed(2)} ${currency}</td>
                <td>${(item.quantity * item.price).toFixed(2)} ${currency}</td>
              </tr>
              `
              )
              .join('')}
            </tbody>
          </table>
        </div>
    
        <!-- Total -->
        <div class="total">
          <div>Sous-total : ${subtotal.toFixed(2)} ${currency}</div>
          ${taxRate > 0 ? `<div>TVA (${taxRate}%) : ${tax.toFixed(2)} ${currency}</div>` : ''}
          <div style="font-size: 18px;">Total : ${total.toFixed(2)} ${currency}</div>
        </div>
    
        <!-- Payment Terms -->
        <div class="payment-terms">
          <h2>Termes de paiement :</h2>
          <p>
            Merci de régler cette facture dans les délais impartis. Les paiements
            peuvent être effectués par virement bancaire ou tout autre mode de
            paiement convenu.
          </p>
        </div>
      </div>
    </body>
    </html>
    
    `;
  return html;
};

// Lève en cas d'échec : les écrans appelants gèrent l'erreur (message utilisateur).
export const generateInvoicePdf = async (invoice: Invoice) => {
  // On iOS/android prints the given html. On web prints the HTML from the current page.
  const { uri } = await printToFileAsync({ html: generateHtml(invoice) });
  const permanentUri = FileSystem.documentDirectory + `facture-${invoice.invoiceNumber}.pdf`;
  // move to document directory
  await FileSystem.moveAsync({
    from: uri,
    to: permanentUri,
  });
  return permanentUri;
};
