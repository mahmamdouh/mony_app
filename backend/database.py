import sqlite3
from contextlib import contextmanager

DB_PATH = "/data/mony.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS alarms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                time TEXT NOT NULL,
                label TEXT,
                days TEXT,
                sound_file TEXT,
                active BOOLEAN DEFAULT 1
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                datetime TEXT NOT NULL,
                label TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS mawaqit_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mosque_uuid TEXT,
                mosque_name TEXT,
                fajr_adhan TEXT,
                dhuhr_adhan TEXT,
                asr_adhan TEXT,
                maghrib_adhan TEXT,
                isha_adhan TEXT
            )
        ''')
        
    # Attempt to gracefully add sound_file if we are upgrading
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("ALTER TABLE alarms ADD COLUMN sound_file TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
        
init_db()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
