import urllib.request
import json
req = urllib.request.Request("https://huggingface.co/api/spaces/mialui/stv-bot/logs/run", headers={"Authorization": "Bearer YOUR_HF_TOKEN"})
try:
    with urllib.request.urlopen(req) as response:
        for _ in range(50):
            line = response.readline()
            if not line: break
            print(line.decode('utf-8').strip())
except Exception as e:
    print(e)
