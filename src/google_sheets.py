from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from config import config


def get_sheets_service():
    creds = Credentials.from_service_account_file(
        config["google_service_account_key_path"],
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds)


def append_lead(row_data):
    service = get_sheets_service()
    service.spreadsheets().values().append(
        spreadsheetId=config["google_spreadsheet_id"],
        range="Sheet1!A1:G1",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={
            "values": [
                [
                    row_data["created_at"],
                    row_data["lead_name"],
                    row_data["company"],
                    row_data["phone"],
                    row_data["status"],
                    row_data["transcript"],
                    row_data["notes"],
                ]
            ]
        },
    ).execute()
