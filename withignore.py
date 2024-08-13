import pandas as pd
import re
import difflib
from Levenshtein import distance as levenshtein_distance
import nltk
from nltk.tokenize import word_tokenize
from langdetect import detect

# Download the necessary NLTK resources
nltk.download('punkt', quiet=True)

def preprocess_text(text):
    # Convert to string and handle NaN/empty values
    text = str(text) if pd.notna(text) else ""
    # Replace hyphens and periods.re
    text = text.replace('-', '').replace('.', '').replace(',','').replace('=','').replace("'",'').replace('"','')
    return text

def tokenize_text(text, language):
    if language in ['hi', 'mar']:
        # For Hindi and Marathi, split on whitespace and punctuation
        return re.findall(r'\S+', text)
    elif language == 'en':
        text = text.lower()
        return word_tokenize(text)
    else:
        return text.split()

def is_word(token):
    return bool(re.match(r'\S+', token))

def compare_texts(text1, text2, ignore_list):
    # Preprocess texts
    text1 = preprocess_text(text1)
    text2 = preprocess_text(text2)

    added = []
    missed = []
    spelling = []
    grammar = []

    if not text1 or not text2:
        return {
            'missed': missed,
            'added': added,
            'spelling': spelling,
            'grammar': grammar
        }

    try:
        language = detect(text1)  # Detect language of the first text
    except:
        language = 'en'  # Default to English if detection fails

    tokens1 = tokenize_text(text2, language)
    tokens2 = tokenize_text(text1, language)

    diff = list(difflib.ndiff(tokens1, tokens2))

    i = 0
    while i < len(diff):
        if diff[i].startswith('-'):
            j = i + 1
            while j < len(diff) and not diff[j].startswith('+') and not is_word(diff[j][2:].strip()):
                j += 1

            if j < len(diff) and diff[j].startswith('+'):
                deleted_token = diff[i][2:].strip()
                inserted_token = diff[j][2:].strip()

                if is_word(deleted_token) and is_word(inserted_token):
                    distance = levenshtein_distance(deleted_token, inserted_token)
                    max_length = max(len(deleted_token), len(inserted_token))
                    similarity = (max_length - distance) / max_length * 100

                    if deleted_token in ignore_list or inserted_token in ignore_list:
                        pass
                    elif similarity >= 50:
                        spelling.append((deleted_token, inserted_token))
                    else:
                        missed.append(deleted_token)
                        added.append(inserted_token)
                    i = j + 1
                    continue

            token = diff[i][2:].strip()
            if token not in ignore_list and is_word(token):
                missed.append(token)
        elif diff[i].startswith('+'):
            token = diff[i][2:].strip()
            if token not in ignore_list and is_word(token):
                added.append(token)

        i += 1

    return {
        'missed': missed,
        'added': added,
        'spelling': spelling,
        'grammar': grammar
    }

# Read the Excel file
excel_df = pd.read_csv('results - expertreviewlog (1).csv')

# Read the CSV file
csv_df = pd.read_csv('results - qsetdb (5).csv')

# Function to get ignore words based on qset and passage
def get_ignore_words(row, qset, passage):
    column = f'Q{qset}P{passage}'
    return row[column].split(',') if pd.notna(row[column]) else []

# Process each row in the Excel file
# Process each row in the Excel file
for index, row in excel_df.iterrows():
    qset = row['qset']
    subject_id = row['subjectId']
    
    # Find the corresponding row in the CSV file
    csv_row = csv_df[csv_df['subject_id'] == subject_id]
    
    if not csv_row.empty:
        csv_row = csv_row.iloc[0]
        
        # Get ignore words for passageA and passageB
        ignore_words_a = get_ignore_words(csv_row, qset, 'A')
        ignore_words_b = get_ignore_words(csv_row, qset, 'B')
        
        # Compare passageA
        result_a = compare_texts(row['ansPassageA'], row['passageA'], ignore_words_a)
        
        # Compare passageB
        result_b = compare_texts(row['ansPassageB'], row['passageB'], ignore_words_b)
        
        # Store lists first
        for key in result_a.keys():
            excel_df.at[index, f'passageA_{key}_list'] = ', '.join(str(item) for item in result_a[key])
            excel_df.at[index, f'passageB_{key}_list'] = ', '.join(str(item) for item in result_b[key])
        
        # Then store counts
        for key in result_a.keys():
            excel_df.at[index, f'passageA_{key}_count'] = len(result_a[key])
            excel_df.at[index, f'passageB_{key}_count'] = len(result_b[key])
        
        # Calculate one-sided mistake counts
        excel_df.at[index, 'passageA_one_sided_count'] = len(result_a['missed']) + len(result_a['added'])
        excel_df.at[index, 'passageB_one_sided_count'] = len(result_b['missed']) + len(result_b['added'])
    else:
        print(f"No matching subject_id found in CSV for row {index}")

# Save the updated Excel file
excel_df.to_excel('updated_excel_file.xlsx', index=False)

print("Processing complete. Updated Excel file saved.")