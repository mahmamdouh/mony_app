import requests
import re
import json

r = requests.get('https://mawaqit.net/en/masjid-lsayda-zayneb-caire-00000-egypt', headers={'User-Agent': 'Mozilla/5.0'})
times = re.search(r'var confData = (\{.*?\});', r.text)
if times:
    data = json.loads(times.group(1))
    print(data.get("times"))
else:
    print("Could not find confData in HTML")
