import asyncio
from mawaqit import AsyncMawaqitClient
from datetime import datetime

async def get_azan_times():
    # YOUR ACCOUNT DETAILS
    EMAIL = "mahmoud.elmohtady@gmail.com"
    PASSWORD = "Mahmoud=2020" 
    
    # We search specifically for this mosque to get its full data packet
    SEARCH_QUERY = "Al-Fourqaan Eindhoven"

    print(f"🔄 Authenticating as {EMAIL}...")
    
    async with AsyncMawaqitClient(username=EMAIL, password=PASSWORD) as client:
        try:
            # 1. Official Login
            await client.login()
            print("✅ Login successful!")
            
            # 2. Search for the mosque
            # The search result contains the full 'calendar' for the mosque!
            print(f"🔍 Searching for {SEARCH_QUERY} data...")
            mosques = await client.fetch_mosques_by_keyword(SEARCH_QUERY)
            
            if not mosques:
                print("❌ Mosque not found in search.")
                return

            # Pick the best match
            mosque_data = mosques[0]
            print(f"📍 Found: {mosque_data['name']}")

            # 3. Extract Azan Times from the search result
            # Mawaqit search results include a 'calendar' or 'times' key
            # Usually it's in a list: [Fajr, Shuruq, Dhuhr, Asr, Maghrib, Isha]
            times = mosque_data.get('times')
            
            if not times:
                # Fallback: if 'times' is missing, we try to fetch them one last time 
                # now that the mosque UUID is 'warmed up' in the session
                client.mosque = mosque_data['uuid']
                times = await client.fetch_prayer_times()

            labels = ["Fajr", "Shuruq", "Dhuhr", "Asr", "Maghrib", "Isha"]
            
            print("\n" + "="*40)
            print(f"🕌 {mosque_data['name'].upper()} - AZAN")
            print(f"📅 {datetime.now().strftime('%A, %d %B %Y')}")
            print("="*40)
            print(f"{'Prayer':<12} | {'Time'}")
            print("-" * 40)

            # Check if we got a valid list of 6 times
            if isinstance(times, list) and len(times) >= 6:
                for i, label in enumerate(labels):
                    print(f"{label:12} | {times[i]}")
            else:
                # If we still get N/A, it means the Mosque admin has hidden 
                # the Azan times and only shows Iqamah.
                print("⚠️ Error: The mosque has hidden Azan times for this date.")
                print(f"Raw response was: {times}")
                
            print("="*40)
            print("✨ Sync Complete")

        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(get_azan_times())