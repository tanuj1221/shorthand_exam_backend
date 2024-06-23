import os
import shutil
import pandas as pd

# Path to the folder containing all photos
source_folder = "C:\\Users\\KKCA\\Downloads\\GCC_SHORTHAND_EXAM_JUNE_2024\\photos_all"

# Path to the folder where you want to move the photos
destination_folder = "\\new\\"

# Path to the Excel file containing the list of photos
excel_file_path = "list.xlsx"

# Read the Excel file into a DataFrame
df = pd.read_excel(excel_file_path)

# Iterate over each row in the DataFrame
for index, row in df.iterrows():
    # Extract file name from the DataFrame
    file_name = row["File Name"]
    # Construct source and destination paths
    source_file_path = os.path.join(source_folder, file_name)
    destination_file_path = os.path.join(destination_folder, file_name)
    # Check if the source file exists and if it's a file
    if os.path.exists(source_file_path) and os.path.isfile(source_file_path):
        # Move the file to the destination folder
        shutil.move(source_file_path, destination_file_path)
        print(f"Moved '{file_name}' to '{destination_folder}'")
    else:
        print(f"File '{file_name}' not found in source folder or is not a file.")

print("All files moved successfully!")
