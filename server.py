import sqlite3
import json
import hashlib
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from datetime import datetime

PORT = 3000
DB_FILE = 'database.sqlite'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            dob TEXT NOT NULL,
            passwordHash TEXT NOT NULL,
            registeredAt TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def hash_password(password, salt):
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

class RequestHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/register':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                name = data.get('name')
                email = data.get('email')
                phone = data.get('phone')
                dob = data.get('dob')
                password = data.get('password')
                
                if not all([name, email, phone, dob, password]):
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'All fields are required.'}).encode('utf-8'))
                    return
                
                salt = os.urandom(16).hex()
                password_hash = hash_password(password, salt)
                stored_password = f"{salt}:{password_hash}"
                registered_at = datetime.utcnow().isoformat()
                
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                try:
                    cursor.execute('''
                        INSERT INTO users (name, email, phone, dob, passwordHash, registeredAt)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (name, email, phone, dob, stored_password, registered_at))
                    conn.commit()
                    user_id = cursor.lastrowid
                    self._set_headers(201)
                    self.wfile.write(json.dumps({'message': 'Registration successful', 'userId': user_id}).encode('utf-8'))
                except sqlite3.IntegrityError:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'An account with this email already exists.'}).encode('utf-8'))
                finally:
                    conn.close()
                    
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                
        elif parsed_path.path == '/api/login':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                email = data.get('email')
                password = data.get('password')
                
                if not email or not password:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'Email and password are required.'}).encode('utf-8'))
                    return
                
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('SELECT id, name, passwordHash FROM users WHERE email = ?', (email,))
                user = cursor.fetchone()
                conn.close()
                
                if not user:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': 'No account found. Please register first.'}).encode('utf-8'))
                    return
                
                stored_password = user[2]
                if ':' in stored_password:
                    salt, stored_hash = stored_password.split(':')
                    if hash_password(password, salt) == stored_hash:
                        self._set_headers(200)
                        self.wfile.write(json.dumps({'message': 'Login successful', 'userId': user[0], 'name': user[1]}).encode('utf-8'))
                    else:
                        self._set_headers(400)
                        self.wfile.write(json.dumps({'error': 'Incorrect email or password.'}).encode('utf-8'))
                else:
                    self._set_headers(500)
                    self.wfile.write(json.dumps({'error': 'Invalid stored password format.'}).encode('utf-8'))
                    
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))

if __name__ == '__main__':
    init_db()
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f'Starting Python server on port {PORT}...')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print('Server stopped.')
