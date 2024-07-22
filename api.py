from flask import Flask, request, jsonify
from flask_cors import CORS
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

def tokenize_text(text, language):
    if language in ['hi', 'mar']:
        # For Hindi and Marathi, split on whitespace and punctuation
        return re.findall(r'\S+', text)
    elif language == 'en':
        return word_tokenize(text)
    else:
        return text.split()

def is_word(token):
    return bool(re.match(r'\S+', token))

def compare_texts(text1, text2, ignore_list):
    added = []
    missed = []
    spelling = []
    grammar = []
    colored_words = []

    language = detect(text1)  # Detect language of the first text
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
                        colored_words.append({'word': deleted_token, 'color': 'black'})
                        colored_words.append({'word': inserted_token, 'color': 'black'})
                    elif similarity >= 50:
                        colored_words.append({'word': deleted_token, 'color': 'green'})
                        colored_words.append({'word': inserted_token, 'color': 'red'})
                        spelling.append((deleted_token, inserted_token))
                    else:
                        colored_words.append({'word': deleted_token, 'color': 'green'})
                        colored_words.append({'word': inserted_token, 'color': 'red'})
                        missed.append(deleted_token)
                        added.append(inserted_token)
                    i = j + 1
                    continue

            token = diff[i][2:].strip()
            if token in ignore_list:
                colored_words.append({'word': token, 'color': 'black'})
            else:
                colored_words.append({'word': token, 'color': 'green'})
                if is_word(token):
                    missed.append(token)
        elif diff[i].startswith('+'):
            token = diff[i][2:].strip()
            if token in ignore_list:
                colored_words.append({'word': token, 'color': 'black'})
            else:
                colored_words.append({'word': token, 'color': 'red'})
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
    ignore_list = data.get('ignore_list', [])
    print(ignore_list)

    if not text1 or not text2:
        return jsonify({'error': 'Missing text1 or text2'}), 400

    result = compare_texts(text1, text2, ignore_list)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)