import { google } from 'googleapis';
import { config } from './config.js';

let sheetsClient;

function getSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.serviceAccountKeyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export async function appendLead(rowData) {
  const sheets = getSheetsClient();
  const request = {
    spreadsheetId: config.google.spreadsheetId,
    range: 'Sheet1!A1:G1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          rowData.createdAt,
          rowData.leadName,
          rowData.company,
          rowData.phone,
          rowData.status,
          rowData.transcript,
          rowData.notes,
        ],
      ],
    },
  };

  await sheets.spreadsheets.values.append(request);
}
