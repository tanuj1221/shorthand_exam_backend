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

def compare_texts(text1, text2, ignore_list, ignore_case=False):
    added = []
    missed = []
    spelling = []
    grammar = []
    colored_words = []

    if ignore_case:
        text1 = text1.lower()
        text2 = text2.lower()
        ignore_list = [word.lower() for word in ignore_list]

    words1 = text1.split()
    words2 = text2.split()

    s = difflib.SequenceMatcher(None, words1, words2)
    opcodes = s.get_opcodes()

    
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'equal':
            for word in words1[i1:i2]:
                colored_words.append({'word': word, 'color': 'black'})
        elif tag == 'delete':
            for word in words1[i1:i2]:
                if word.lower() not in ignore_list:
                    colored_words.append({'word': word, 'color': 'red'})
                    missed.append(word)
                else:
                    colored_words.append({'word': word, 'color': 'black'})
        elif tag == 'insert':
            for word in words2[j1:j2]:
                if word.lower() not in ignore_list:
                    colored_words.append({'word': word, 'color': 'green'})
                    added.append(word)
                else:
                    colored_words.append({'word': word, 'color': 'black'})
        elif tag == 'replace':
            for old, new in zip(words1[i1:i2], words2[j1:j2]):
                dist = levenshtein_distance(old.lower(), new.lower())
                max_len = max(len(old), len(new))
                similarity = (max_len - dist) / max_len * 100

                old_no_punct = re.sub(r'[^\w\s]', '', old)
                new_no_punct = re.sub(r'[^\w\s]', '', new)

                if old.lower() in ignore_list or new.lower() in ignore_list:
                    colored_words.append({'word': new, 'color': 'black'})
                elif old.lower() == new.lower():
                    colored_words.append({'word': old, 'color': 'black'})
                elif similarity > 50 and old_no_punct.lower() != new_no_punct.lower():
                    colored_words.append({'word': old, 'color': 'red'})
                    colored_words.append({'word': new, 'color': 'green'})
                    spelling.append((old, new))
                elif old_no_punct.lower() == new_no_punct.lower():
                    colored_words.append({'word': old, 'color': 'red'})
                    colored_words.append({'word': new, 'color': 'green'})
                    grammar.append((old, new))
                else:
                    colored_words.append({'word': old, 'color': 'red'})
                    colored_words.append({'word': new, 'color': 'green'})
                    missed.append(old)
                    added.append(new)


        for word in words1[i1+len(words2[j1:j2]):i2]:
                if word.lower() not in ignore_list:
                    colored_words.append({'word': word, 'color': 'red'})
                    missed.append(word)

        for word in words2[j1+len(words1[i1:i2]):j2]:
                colored_words.append({'word': word, 'color': 'green'})
                if word.lower() not in ignore_list:
                    added.append(word)




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
    ignore_case = data.get('ignore_case', False)  # Get the ignore_case value from the request data
    print(ignore_list)

    if not text1 or not text2:
        return jsonify({'error': 'Missing text1 or text2'}), 400

    result = compare_texts(text1, text2, ignore_list, ignore_case)  # Pass ignore_case to the function
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)