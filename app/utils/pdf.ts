import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Invoice } from '../schema/invoice';

const generateHtml = (invoice: Invoice, subtotal: number, total: number) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
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
          <img src="https://hidopi.com/wp-content/uploads/2019/10/logo_hidopi_black_site.png" alt="Logo" class="logo" />
          <div class="invoice-title">
            <h1>Facture</h1>
            <p><strong>Numéro :</strong> #${invoice.invoiceInfo.invoiceNumber}</p>
            <p><strong>Date :</strong> ${invoice.invoiceInfo.invoiceDate}</p>
            ${invoice.invoiceInfo.invoiceDueDate && `<p><strong>Date d'échéance :</strong> ${invoice.invoiceInfo.invoiceDueDate}</p>`}
          </div>
        </div>
    
        <!-- Details -->
        <div class="details">
          <div class="section">
            <h2>De :</h2>
            <p>${invoice.sender.name}</p>
            <p>${invoice.sender.address}</p>
            <p>Salakta, Mahdia, Tunisie</p>
            
            <p>${invoice.sender.tva}</p>
          </div>
          <div class="section">
            <h2>À :</h2>
            <p>${invoice.recipient.name}</p>
            <p>${invoice.recipient.address}</p>
            <p>El Mourouj 3, Ben Arous, 2074, Tunisie</p>
            <p>${invoice.recipient.email}</p>
            <p>${invoice.sender.tva}</p>
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
            ${invoice.items.map((item) =>
        `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price.toFixed(2)} TND</td>
                <td>${(item.quantity * item.price).toFixed(2)} TND</td>
              </tr>
              `)}
            </tbody>
          </table>
        </div>
    
        <!-- Total -->
        <div class="total">
          <div>Sous-total : ${subtotal.toFixed(2)} TND</div>
          <div>TVA (20%) : 40.00 TND</div>
          <div>Droit de Timbre : 1.00 TND</div>
          <div style="font-size: 18px;">Total : ${total.toFixed(2)} TND</div>
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

export const generateInvoicePdf = async (invoice: Invoice, subtotal: number, total: number) => {
    try {
        // On iOS/android prints the given html. On web prints the HTML from the current page.
        const { uri } = await printToFileAsync({ html: generateHtml(invoice, subtotal, total) });
        const permanentUri = FileSystem.documentDirectory + `facture-${invoice.invoiceInfo.invoiceNumber}.pdf`;
        // move to document directory 
        const file = await FileSystem.moveAsync({
            from: uri,
            to: permanentUri,
        });
        console.log('Fichier transféré à ', permanentUri);
        console.log('File has been saved to:', permanentUri);
        return permanentUri;
        // await shareAsync(permanentUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.log('Error lors de la generation du PDF', error);

    }

};