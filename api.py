from flask import Flask, request, jsonify
from flask_cors import CORS
import difflib
import re

app = Flask(__name__)
CORS(app, supports_credentials=True, origins='*')

def tokenize(text):
    return re.findall(r'\S+|\s+', text)

def compare_texts(text1, text2, ignore_list, ignore_case=False):
    if ignore_case:
        text1 = text1.lower()
        text2 = text2.lower()
        ignore_list = [word.lower() for word in ignore_list]

    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    matcher = difflib.SequenceMatcher(None, tokens1, tokens2)
    opcodes = matcher.get_opcodes()

    colored_words = []
    added = []
    missed = []
    changed = []

    for tag, i1, i2, j1, j2 in opcodes:
        if tag == 'equal':
            for token in tokens1[i1:i2]:
                colored_words.append({'word': token, 'color': 'black'})
        elif tag == 'delete':
            for token in tokens1[i1:i2]:
                if token.strip() and token.lower() not in ignore_list:
                    colored_words.append({'word': token, 'color': 'red'})
                    missed.append(token.strip())
                else:
                    colored_words.append({'word': token, 'color': 'black'})
        elif tag == 'insert':
            for token in tokens2[j1:j2]:
                if token.strip() and token.lower() not in ignore_list:
                    colored_words.append({'word': token, 'color': 'green'})
                    added.append(token.strip())
                else:
                    colored_words.append({'word': token, 'color': 'black'})
        elif tag == 'replace':
            old_words = [t for t in tokens1[i1:i2] if t.strip()]
            new_words = [t for t in tokens2[j1:j2] if t.strip()]
            
            for old, new in zip(old_words, new_words):
                if old.lower() in ignore_list or new.lower() in ignore_list:
                    colored_words.append({'word': new, 'color': 'black'})
                else:
                    colored_words.append({'word': old, 'color': 'red'})
                    colored_words.append({'word': new, 'color': 'green'})
                    changed.append((old, new))
            
            if len(old_words) > len(new_words):
                for word in old_words[len(new_words):]:
                    if word.lower() not in ignore_list:
                        colored_words.append({'word': word, 'color': 'red'})
                        missed.append(word)
            elif len(new_words) > len(old_words):
                for word in new_words[len(old_words):]:
                    if word.lower() not in ignore_list:
                        colored_words.append({'word': word, 'color': 'green'})
                        added.append(word)

    return {
        'colored_words': colored_words,
        'missed': missed,
        'added': added,
        'changed': changed
    }

@app.route('/compare', methods=['POST'])
def compare():
    data = request.json
    text1 = data.get('text1')
    text2 = data.get('text2')
    ignore_list = data.get('ignore_list', [])
    ignore_case = data.get('ignore_case', False)

    if not text1 or not text2:
        return jsonify({'error': 'Missing text1 or text2'}), 400

    result = compare_texts(text1, text2, ignore_list, ignore_case)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)