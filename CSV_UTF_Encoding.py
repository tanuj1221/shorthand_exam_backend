import pandas as pd

# Replace 'ShorthandExam2024.xlsx' with your actual Excel file name
excel_file = 'ShorthandExam2024.xlsx'
sheet_name = 'finalpassagesubmit'

# Load the Excel file
xls = pd.ExcelFile(excel_file)

# Load a sheet into a DataFrame
df = pd.read_excel(xls, sheet_name=sheet_name)

# Replace 'ShorthandExam2024 - finalpassagesubmit.csv' with your desired CSV file name
csv_file = 'ShorthandExam2024 - finalpassagesubmit.csv'

# Save the DataFrame to CSV with UTF-8 encoding
df.to_csv(csv_file, encoding='utf-8', index=False)

print(f'Saved {sheet_name} from {excel_file} as {csv_file} with UTF-8 encoding.')
