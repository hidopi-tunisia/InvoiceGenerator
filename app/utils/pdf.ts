// SDK 54 : la nouvelle API File/Directory est par défaut ; l'ancienne API
// (documentDirectory, downloadAsync, moveAsync) est déplacée dans /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import { printToFileAsync } from 'expo-print';

import { formatAmount, formatDate, getInvoiceCurrency, getTotals } from './invoice';
import { Invoice } from '../schema/invoice';

import { useStore } from '~/store';

/**
 * Compose l'adresse complète de l'émetteur depuis les champs structurés.
 * Rétro-compatible : si seul `address` est renseigné (anciens profils concaténés),
 * il est retourné tel quel.
 */
const formatSenderAddress = (sender: Invoice['sender']): string => {
  const line2 = [sender.zipCode, sender.city].filter(Boolean).join(' ');
  return [sender.address, line2].filter(Boolean).join(', ');
};

/** Extension de fichier → type MIME (défaut jpeg). Copie locale de domain/profile.ts::mimeForUri. */
const mimeForUri = (uri: string): string => {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

/**
 * Résout le logo à embarquer dans le PDF.
 * Priorité : sender.logoUri (local, encodé en base64) → sender.logoUrl (distant)
 * → profil courant du store (compatibilité anciens snapshots sans logo).
 * Retourne null en cas d'échec — jamais d'exception.
 */
const resolveLogoSrc = async (sender: Invoice['sender']): Promise<string | null> => {
  try {
    // 1. URI locale sur le snapshot de la facture
    const localUri = sender.logoUri;
    if (localUri) {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mimeForUri(localUri)};base64,${base64}`;
    }

    // 2. URL distante sur le snapshot
    if (sender.logoUrl) {
      return sender.logoUrl;
    }

    // 3. Repli sur le profil courant (anciens snapshots sans logo)
    const profile = useStore.getState().profile;
    if (profile?.logoUri) {
      const base64 = await FileSystem.readAsStringAsync(profile.logoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mimeForUri(profile.logoUri)};base64,${base64}`;
    }
    if (profile?.logoUrl) {
      return profile.logoUrl;
    }

    return null;
  } catch {
    return null;
  }
};

const generateHtml = (invoice: Invoice, logoSrc?: string | null): string => {
  const { subtotal, discountRate, discountAmount, taxRate, tax, total } = getTotals(invoice);
  const currency = getInvoiceCurrency(invoice);

  const senderAddress = formatSenderAddress(invoice.sender);

  /* ---------- blocs optionnels émetteur ---------- */
  const senderPhone = invoice.sender.phone
    ? `<p class="detail-line">${invoice.sender.phone}</p>`
    : '';
  const senderTva = invoice.sender.tva
    ? `<p class="detail-line"><span class="label">N° TVA&nbsp;:</span> ${invoice.sender.tva}</p>`
    : '';
  // siret prioritaire sur mf
  const senderId = (invoice.sender as Record<string, unknown>).siret
    ? `<p class="detail-line"><span class="label">SIRET&nbsp;:</span> ${(invoice.sender as Record<string, unknown>).siret}</p>`
    : (invoice.sender as Record<string, unknown>).mf
      ? `<p class="detail-line"><span class="label">MF&nbsp;:</span> ${(invoice.sender as Record<string, unknown>).mf}</p>`
      : '';

  /* ---------- blocs optionnels destinataire ---------- */
  const recipientAddress = invoice.recipient.address
    ? `<p class="detail-line">${invoice.recipient.address}</p>`
    : '';
  const recipientEmail = invoice.recipient.email
    ? `<p class="detail-line">${invoice.recipient.email}</p>`
    : '';
  const recipientTva = invoice.recipient.tva
    ? `<p class="detail-line"><span class="label">N° TVA&nbsp;:</span> ${invoice.recipient.tva}</p>`
    : '';

  /* ---------- logo ---------- */
  const logoBlock = logoSrc
    ? `<img src="${logoSrc}" alt="Logo" class="logo" />`
    : `<div class="logo-placeholder"></div>`;

  /* ---------- date d'échéance ---------- */
  const dueDateBlock = invoice.invoiceDueDate
    ? `<p class="meta-line"><span class="meta-label">Échéance&nbsp;:</span> ${formatDate(invoice.invoiceDueDate)}</p>`
    : '';

  /* ---------- Ligne remise (affichée uniquement si > 0) ---------- */
  const discountLine =
    discountAmount > 0
      ? `<div class="total-row">
           <span class="total-label">Remise (${discountRate}&nbsp;%)</span>
           <span class="total-value" style="color:#16a34a;">−&nbsp;${formatAmount(discountAmount)}&nbsp;${currency}</span>
         </div>`
      : '';

  /* ---------- TVA line ---------- */
  const taxLine =
    taxRate > 0
      ? `<div class="total-row">
           <span class="total-label">TVA (${taxRate}&nbsp;%)</span>
           <span class="total-value">${formatAmount(tax)}&nbsp;${currency}</span>
         </div>`
      : '';

  /* ---------- lignes articles ---------- */
  const itemRows = invoice.items
    .map(
      (item, idx) => `
      <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
        <td class="col-desc">${item.name}</td>
        <td class="col-num">${item.quantity}</td>
        <td class="col-num">${formatAmount(item.price)}&nbsp;${currency}</td>
        <td class="col-num col-total">${formatAmount(item.quantity * item.price)}&nbsp;${currency}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${invoice.invoiceNumber || ''}</title>
  <style>
    @page {
      size: A4;
      /* Marge basse : réserve la surface de la boîte de pagination (une
         margin-box vit DANS la marge — avec margin 0 elle serait invisible). */
      margin: 0 0 14mm 0;

      /* Numéro de page « 1 / 3 » en bas à droite. Supporté par le moteur
         d'impression Android (Chromium) ; WebKit iOS ne rend pas encore les
         margin-boxes → PDF iOS local sans numéros (le PDF serveur fait foi). */
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-family: Helvetica, Arial, sans-serif;
        font-size: 9px;
        color: #9ca3af;
        padding-right: 12mm;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.55;
      color: #1a1a2e;
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
    }

    /* ── Bandeau d'en-tête ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 36px 44px 28px;
      border-bottom: 3px solid #4f46e5;
    }

    .logo {
      max-height: 72px;
      max-width: 160px;
      object-fit: contain;
    }

    .logo-placeholder {
      width: 160px;
      height: 72px;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #4f46e5;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .meta-line {
      font-size: 12px;
      color: #555;
      margin-bottom: 2px;
    }

    .meta-label {
      font-weight: 600;
      color: #1a1a2e;
    }

    /* ── Corps de page ── */
    .body {
      padding: 32px 44px 40px;
    }

    /* ── Blocs De / À ── */
    .parties {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 36px;
    }

    .party {
      flex: 1;
    }

    .party-heading {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #4f46e5;
      border-bottom: 1px solid #e5e3fd;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }

    .party-name {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .detail-line {
      font-size: 12px;
      color: #444;
      margin-bottom: 2px;
    }

    .label {
      font-weight: 600;
      color: #1a1a2e;
    }

    /* ── Tableau articles ── */
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      color: #4f46e5;
      margin-bottom: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      /* fixed : les largeurs de colonnes sont respectées même avec une
         désignation très longue (sinon elle écrase les colonnes de prix) */
      table-layout: fixed;
    }

    thead tr {
      background-color: #eeecfd;
    }

    thead th {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3730a3;
      padding: 10px 12px;
    }

    th.col-desc,
    td.col-desc {
      text-align: left;
      width: 52%;
      /* passe à la ligne, y compris un mot/une référence sans espace */
      overflow-wrap: break-word;
      word-break: break-word;
    }

    th.col-num,
    td.col-num {
      text-align: right;
      width: 16%;
    }

    tbody tr {
      border-bottom: 1px solid #ececf0;
    }

    tbody td {
      padding: 10px 12px;
      font-size: 12.5px;
      color: #2a2a3c;
      vertical-align: top;
    }

    .row-alt {
      background-color: #fafafe;
    }

    td.col-total {
      font-weight: 600;
      color: #1a1a2e;
    }

    /* ── Bloc totaux ── */
    .totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 36px;
    }

    .totals {
      width: 260px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 5px 0;
      font-size: 12.5px;
      color: #3a3a4e;
      border-bottom: 1px solid #ececf0;
    }

    .total-row:last-child {
      border-bottom: none;
    }

    .total-label {
      font-weight: 500;
    }

    .total-value {
      font-weight: 500;
      text-align: right;
    }

    .total-row-ttc {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 10px 0 6px;
      border-top: 2px solid #4f46e5;
      margin-top: 4px;
    }

    .total-ttc-label {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a2e;
    }

    .total-ttc-value {
      font-size: 18px;
      font-weight: 700;
      color: #4f46e5;
      text-align: right;
    }

    /* ── Pied de page ── */
    .footer {
      padding: 20px 44px 28px;
      border-top: 1px solid #e5e3fd;
    }

    .footer-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #4f46e5;
      margin-bottom: 6px;
    }

    .footer-text {
      font-size: 11px;
      color: #777;
      line-height: 1.6;
    }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="header">
    ${logoBlock}
    <div class="invoice-meta">
      <p class="invoice-title">Facture</p>
      <p class="meta-line"><span class="meta-label">N°&nbsp;</span>${invoice.invoiceNumber || 'N/A'}</p>
      <p class="meta-line"><span class="meta-label">Date&nbsp;:</span> ${invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A'}</p>
      ${dueDateBlock}
    </div>
  </div>

  <!-- Corps -->
  <div class="body">

    <!-- De / À -->
    <div class="parties">
      <div class="party">
        <p class="party-heading">Émetteur</p>
        <p class="party-name">${invoice.sender.name}</p>
        ${senderAddress ? `<p class="detail-line">${senderAddress}</p>` : ''}
        ${senderPhone}
        ${senderTva}
        ${senderId}
      </div>
      <div class="party">
        <p class="party-heading">Destinataire</p>
        <p class="party-name">${invoice.recipient.name}</p>
        ${recipientAddress}
        ${recipientEmail}
        ${recipientTva}
      </div>
    </div>

    <!-- Articles -->
    <p class="section-title">Détail des prestations</p>
    <table>
      <thead>
        <tr>
          <th class="col-desc">Désignation</th>
          <th class="col-num">Qté</th>
          <th class="col-num">Prix unitaire</th>
          <th class="col-num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Totaux -->
    <div class="totals-wrapper">
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Sous-total HT</span>
          <span class="total-value">${formatAmount(subtotal)}&nbsp;${currency}</span>
        </div>
        ${discountLine}
        ${taxLine}
        <div class="total-row-ttc">
          <span class="total-ttc-label">Total TTC</span>
          <span class="total-ttc-value">${formatAmount(total)}&nbsp;${currency}</span>
        </div>
      </div>
    </div>

  </div>

  <!-- Pied de page -->
  <div class="footer">
    <p class="footer-title">Conditions de paiement</p>
    <p class="footer-text">
      Merci de régler cette facture dans les délais impartis.
      Les paiements peuvent être effectués par virement bancaire ou tout autre mode de paiement convenu.
    </p>
  </div>

</body>
</html>`;
};

// Supprime le PDF local d'une facture (best-effort — jamais d'exception).
// Utilisé quand le numéro change en édition : l'ancien {tag}.pdf devient orphelin.
export const deleteInvoicePdf = async (invoiceNumber: string) => {
  try {
    await FileSystem.deleteAsync(FileSystem.documentDirectory + `${invoiceNumber}.pdf`, {
      idempotent: true,
    });
  } catch {
    // best-effort
  }
};

// Migration one-shot : supprime les PDFs générés sous l'ancien nommage
// `facture-{tag}.pdf` (remplacé par `{tag}.pdf`). Fire-and-forget — jamais d'exception.
export const purgeLegacyPdfFilenames = async () => {
  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return;
    const entries = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      entries
        .filter((name) => name.startsWith('facture-') && name.endsWith('.pdf'))
        .map((name) => FileSystem.deleteAsync(dir + name, { idempotent: true }))
    );
  } catch {
    // best-effort : un échec de purge ne doit jamais gêner le boot
  }
};

// Télécharge le PDF serveur (Cloudinary, plan avec pdfGeneration) — source de
// vérité une fois la facture synchronisée (API.md §15.17). Lève en cas d'échec :
// l'appelant retombe sur la génération locale.
export const downloadRemoteInvoicePdf = async (
  url: string,
  invoiceNumber: string
): Promise<string> => {
  // Nom de fichier = tag de la facture (INV-YYYY-NNNN.pdf), visible au partage
  const target = FileSystem.documentDirectory + `${invoiceNumber}.pdf`;
  const { status, uri } = await FileSystem.downloadAsync(url, target);
  if (status !== 200) {
    throw new Error(`Téléchargement du PDF échoué (${status})`);
  }
  return uri;
};

// Lève en cas d'échec : les écrans appelants gèrent l'erreur (message utilisateur).
export const generateInvoicePdf = async (invoice: Invoice) => {
  const logoSrc = await resolveLogoSrc(invoice.sender);
  const { uri } = await printToFileAsync({ html: generateHtml(invoice, logoSrc) });
  // Nom de fichier = tag de la facture (INV-YYYY-NNNN.pdf), visible au partage
  const permanentUri = FileSystem.documentDirectory + `${invoice.invoiceNumber}.pdf`;
  // move to document directory
  await FileSystem.moveAsync({
    from: uri,
    to: permanentUri,
  });
  return permanentUri;
};
