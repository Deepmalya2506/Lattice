import websockets
import json
import os
from dotenv import load_dotenv

load_dotenv()

def on_message(ws, message):
    msg = json.loads(message)
    mmsi = msg.get('MetaData', {}).get('MMSI')
    print(f"Vessel Spotted! MMSI: {mmsi}")
    with open("scripts/ais_telemetry.json", "a") as f:
        f.write(json.dumps(msg) + "\n")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("### Closed ###")

def on_open(ws):
    print("Subscription sent. Waiting...")
    # Matches your NC file: 44.08E to 67.92E
    bbox = [[-65.92, 44.08], [-48.83, 67.92]] # [LatMin, LonMin], [LatMax, LonMax]
    
    subscribe_message = {
        "APIKey": os.getenv("aisstream_api_key"),
        "BoundingBoxes": [bbox],
        "FilterMessageTypes": ["PositionReport"]
    }
    ws.send(json.dumps(subscribe_message))

if __name__ == "__main__":
    ws = websockets.WebSocketApp("wss://stream.aisstream.io/v0/stream",
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)
    # ping_interval ensures the connection stays alive
    ws.run_forever(ping_interval=20, ping_timeout=10)