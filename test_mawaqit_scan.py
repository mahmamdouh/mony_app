import asyncio
import mawaqit

async def main():
    # Cairo coordinates as an example: 30.0444, 31.2357
    lat = 30.0444
    lon = 31.2357
    
    print(f"Initializing Mawaqit Client with Lat: {lat}, Lon: {lon}")
    client = mawaqit.AsyncMawaqitClient(latitude=lat, longitude=lon)
    
    try:
        mosques = await client.all_mosques_neighborhood()
        print("\n=== Nearest Mosques Found ===")
        for m in mosques:
            # m is a dict containing mosque info based on the library structure
            print(f"- {m.get('name', 'Unknown')} (UUID: {m.get('uuid', 'Unknown')})")
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())
