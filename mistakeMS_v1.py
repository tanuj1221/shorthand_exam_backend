from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import re
import difflib
from Levenshtein import distance as levenshtein_distance
import nltk
from nltk.tokenize import word_tokenize
from langdetect import detect

# Download the necessary resources
nltk.download('punkt')

app = Flask(__name__)
CORS(app, supports_credentials=True, origins='*')

def preprocess_text(text):
    # Convert to string and handle NaN/empty values
    text = str(text) if pd.notna(text) else ""
    # Replace hyphens, periods, and other specified characters
    text = text.replace('-', '').replace('.', '').replace(',','').replace('$','').replace('#','').replace('"','').replace("'","")
    # Remove extra spaces (replace two or more spaces with a single space)
    text = re.sub(r'\s{2,}', ' ', text)
    # Trim leading and trailing spaces
    text = text.strip()
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
    print(ignore_list)
    if text1 is None:
        print('null')
        text1= 'a '
    if text2 is None:
        print('null')
        text2 = 'a '

    text1 = preprocess_text(text1)
    text2 = preprocess_text(text2)

    # Convert ignore_list to lowercase for case-insensitive comparison
    ignore_list = [word.lower() for word in ignore_list]

    added = []
    missed = []
    spelling = []
    grammar = []
    colored_words = []

    try:
        language = detect(text1)
    except:
        language = 'en'

    tokens2 = tokenize_text(text2, language)
    tokens1 = tokenize_text(text1, language)

    if not text1 or not text2:
        return {'is_empty': True}

    diff = list(difflib.ndiff(tokens1, tokens2))
    diff = [d for d in diff if not d.startswith('?')]
    print(diff)

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
                    if deleted_token.lower() in ignore_list or inserted_token.lower() in ignore_list:
                        colored_words.append({'word': deleted_token, 'color': 'black'})
                        colored_words.append({'word': inserted_token, 'color': 'black'})
                    else:
                        distance = levenshtein_distance(deleted_token, inserted_token)
                        max_length = max(len(deleted_token), len(inserted_token))
                        similarity = (max_length - distance) / max_length * 100

                        if similarity >= 40:
                            colored_words.append({'word': deleted_token, 'color': 'red'})
                            colored_words.append({'word': inserted_token, 'color': 'green'})
                            spelling.append((deleted_token, inserted_token))
                        else:
                            colored_words.append({'word': deleted_token, 'color': 'red'})
                            colored_words.append({'word': inserted_token, 'color': 'green'})
                            missed.append(deleted_token)
                            added.append(inserted_token)
                    i = j + 1
                    continue

            token = diff[i][2:].strip()
            if token.lower() in ignore_list:
                colored_words.append({'word': token, 'color': 'red'})
                missed.append(token)
            else:
                colored_words.append({'word': token, 'color': 'red'})
                if is_word(token):
                    missed.append(token)
        elif diff[i].startswith('+'):
            token = diff[i][2:].strip()
            if token.lower() in ignore_list:
                colored_words.append({'word': token, 'color': 'black'})
            else:
                colored_words.append({'word': token, 'color': 'green'})
                if is_word(token):
                    added.append(token)
        else:
            token = diff[i][2:].strip()
            colored_words.append({'word': token, 'color': 'black'})

        i += 1

    return {
        'colored_words': colored_words,
        'missed': missed,
        'added': added,
        'spelling': spelling,
        'grammar': grammar
    }

@app.route('/compare', methods=['POST'])
def compare():
    data = request.json
    text1 = data.get('text1')
    text2 = data.get('text2')
    ignore_list = data.get('ignore_list')
   


    result = compare_texts(text1, text2, ignore_list)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)