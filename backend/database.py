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
                label TEXT,
                sound_file TEXT,
                notified BOOLEAN DEFAULT 0
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

    # Graceful column migrations
    migrations = [
        ("alarms",  "ALTER TABLE alarms ADD COLUMN sound_file TEXT"),
        ("events",  "ALTER TABLE events ADD COLUMN sound_file TEXT"),
        ("events",  "ALTER TABLE events ADD COLUMN notified BOOLEAN DEFAULT 0"),
    ]
    for _, sql in migrations:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute(sql)
        except sqlite3.OperationalError:
            pass  # Column already exists

init_db()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
