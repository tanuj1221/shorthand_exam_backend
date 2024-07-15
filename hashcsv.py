import os
import mysql.connector
import json
import subprocess
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from dotenv import load_dotenv
import base64
import csv
import hashlib
import datetime

load_dotenv()

DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_DATABASE = os.getenv('DB_DATABASE')
SECRET_KEY = os.getenv('SECRET_KEY')
SCHEMA_FILE = os.getenv('SCHEMA_FILE', 'schema/schema.js')

def ensure_key_length(key, desired_length=32):
    hasher = hashlib.sha256()
    hasher.update(key.encode())
    return hasher.digest()[:desired_length]

def derive_key(secret_key):
    return hashlib.sha256(secret_key.encode()).digest()[:32]

def encrypt(obj):
    plain_text = json.dumps(obj)
    iv = os.urandom(16)

    key = derive_key(SECRET_KEY)
    key = ensure_key_length(SECRET_KEY)

    backend = default_backend()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=backend)
    encryptor = cipher.encryptor()

    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plain_text.encode()) + padder.finalize()

    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

    iv_hex = base64.b64encode(iv).decode('utf-8')
    encrypted_hex = base64.b64encode(encrypted_data).decode('utf-8')
    return f"{iv_hex}:{encrypted_hex}"

def decrypt(encrypted_text):
    parts = encrypted_text.split(':')
    if len(parts) != 2:
        raise ValueError('Invalid input format for decryption')

    iv_hex, encrypted_hex = parts
    iv = base64.b64decode(iv_hex)
    encrypted_data = base64.b64decode(encrypted_hex)

    key = derive_key(SECRET_KEY)
    key = ensure_key_length(key)

    backend = default_backend()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=backend)
    decryptor = cipher.decryptor()

    decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    unpadded_data = unpadder.update(decrypted_data) + unpadder.finalize()

    decrypted_text = unpadded_data.decode('utf-8')
    try:
        return json.loads(decrypted_text)
    except json.JSONDecodeError:
        return decrypted_text

def load_schema(schema_file):
    try:
        result = subprocess.run(['node', '-e', f"console.log(JSON.stringify(require('./{schema_file}')));"], capture_output=True, text=True)
        schema = json.loads(result.stdout)
        return schema
    except Exception as e:
        print(f"Error loading schema: {e}")
        return {}

def ensure_table_exists(connection, schema, table_name):
    table_schema = schema.get(table_name)
    if not table_schema:
        print(f"No schema found for table: {table_name}")
        return
    
    fields = ', '.join([f"{field} {dtype}" for field, dtype in table_schema.items()])
    create_table_query = f"CREATE TABLE IF NOT EXISTS {table_name} ({fields})"

    cursor = connection.cursor()
    try:
        cursor.execute(create_table_query)
        connection.commit()
        print(f"Table '{table_name}' checked/created successfully.")
    except mysql.connector.Error as err:
        print(f"Error creating table '{table_name}': {err}")
    finally:
        cursor.close()


def upload_data(csv_file, schema_file, table_name, encrypt_fields):
    schema = load_schema(schema_file)
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_DATABASE
        )
        ensure_table_exists(connection, schema, table_name)

        cursor = connection.cursor()

        with open(csv_file, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                for field in encrypt_fields:
                    if field in row:
                        row[field] = encrypt(row[field])

                # Process all fields and convert data types as necessary
                for field, value in row.items():
                    if value and isinstance(value, str):
                        # Remove square brackets if present
                        if value.startswith('[') and value.endswith(']'):
                            value = value[1:-1]

                        # Get the field type from the schema
                        field_type = schema.get(table_name, {}).get(field, '').lower()

                        # Convert based on field type
                        if field == 'batchdate' or field_type == 'date':
                            try:
                                date_obj = datetime.datetime.strptime(value, '%m/%d/%Y')
                                row[field] = date_obj.strftime('%Y-%m-%d')
                            except ValueError:
                                print(f"Warning: Invalid date format for {field}: {value}")
                                row[field] = None
                        elif field_type == 'time':
                            try:
                                time_obj = datetime.datetime.strptime(value, '%I:%M %p')
                                row[field] = time_obj.strftime('%H:%M:%S')
                            except ValueError:
                                print(f"Warning: Invalid time format for {field}: {value}")
                                row[field] = None
                        elif field_type in ['tinyint', 'bool', 'boolean']:
                            if value.lower() in ['yes', 'no']:
                                row[field] = 1 if value.lower() == 'yes' else 0
                            elif value.isdigit():
                                row[field] = int(value)
                        elif field_type in ['int', 'integer', 'bigint']:
                            if value.isdigit():
                                row[field] = int(value)
                            else:
                                row[field] = None  # Convert non-digit and empty strings to None for integer fields
                        else:
                            row[field] = value
                    elif value == '':
                        field_type = schema.get(table_name, {}).get(field, '').lower()
                        if field_type in ['int', 'integer', 'bigint']:
                            row[field] = None  # Ensure empty strings are set to None for integer fields

                columns = ', '.join(row.keys())
                placeholders = ', '.join(['%s'] * len(row))
                query = f"""
                    INSERT INTO {table_name} ({columns})
                    VALUES ({placeholders})
                """
                values = tuple(row.values())
                cursor.execute(query, values)

        connection.commit()
        print(f'Data uploaded and encrypted successfully for table: {table_name}')
    except mysql.connector.Error as error:
        print(f'Error inserting data into {table_name}:', error)
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Usage examples:
csv_file_path = 'examcenterdb.csv'
upload_data(csv_file_path, SCHEMA_FILE, 'examcenterdb', ['centerpass'])

csv_file_path = 'students.csv'
upload_data(csv_file_path, SCHEMA_FILE, 'students', ['password'])

csv_file_path = 'controllerdb.csv'
upload_data(csv_file_path, SCHEMA_FILE, 'controllerdb', ['controller_pass'])
