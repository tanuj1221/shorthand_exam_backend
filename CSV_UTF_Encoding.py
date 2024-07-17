import pandas as pd

# Replace 'PaperEvaluationDB.xlsx' with your actual Excel file name
excel_file = 'PaperEvaluationDB.xlsx'
sheet_name = 'expertdb'

# Load the Excel file
xls = pd.ExcelFile(excel_file)

# Load a sheet into a DataFrame
df = pd.read_excel(xls, sheet_name=sheet_name)

# Replace 'ShorthandExam2024 - expertreviewlog.csv' with your desired CSV file name
csv_file = 'ShorthandExam2024 - expertdb.csv'

# Save the DataFrame to CSV with UTF-8 encoding and BOM
df.to_csv(csv_file, encoding='utf-8-sig', index=False)

print(f'Saved {sheet_name} from {excel_file} as {csv_file} with UTF-8 encoding and BOM.')

# Verify the contents
df_check = pd.read_csv(csv_file, encoding='utf-8-sig')
