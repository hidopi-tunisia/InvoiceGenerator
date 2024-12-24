import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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
      <img src="your-logo-url.png" alt="Logo" class="logo" />
      <div class="invoice-title">
        <h1>Facture</h1>
        <p><strong>Numéro :</strong> INV-20241208</p>
        <p><strong>Date :</strong> 08-12-2024</p>
        <p><strong>Date d'échéance :</strong> 31-12-2024</p>
      </div>
    </div>

    <!-- Details -->
    <div class="details">
      <div class="section">
        <h2>De :</h2>
        <p>Nom de l'entreprise</p>
        <p>123 Rue de la Paix</p>
        <p>Ville, Pays</p>
        <p>Email : contact@entreprise.com</p>
      </div>
      <div class="section">
        <h2>À :</h2>
        <p>Nom du Client</p>
        <p>Adresse du Client</p>
        <p>Email : client@exemple.com</p>
      </div>
    </div>

    <!-- Items -->
    <div>
      <h2>Détails de la facture :</h2>
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Quantité</th>
            <th>Prix Unitaire</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Service A</td>
            <td>2</td>
            <td>50.00 TND</td>
            <td>100.00 TND</td>
          </tr>
          <tr>
            <td>Produit B</td>
            <td>1</td>
            <td>100.00 TND</td>
            <td>100.00 TND</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Total -->
    <div class="total">
      <div>Sous-total : 200.00 TND</div>
      <div>TVA (20%) : 40.00 TND</div>
      <div>Droit de Timbre : 1.00 TND</div>
      <div style="font-size: 18px;">Total : 241.00 TND</div>
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

export const generateInvoicePdf = async () => {
    try {
        // On iOS/android prints the given html. On web prints the HTML from the current page.
    const { uri } = await printToFileAsync({ html });
    const permanentUri = FileSystem.documentDirectory + 'facture.pdf';
    // move to document directory 
    const file = await FileSystem.moveAsync({
        from:uri,
        to : permanentUri,
    });
    console.log('Fichier transféré à ', permanentUri);
    
    console.log('File has been saved to:', permanentUri);
    await shareAsync(permanentUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.log('Error lors de la generation du PDF', error);
        
    }
    
};