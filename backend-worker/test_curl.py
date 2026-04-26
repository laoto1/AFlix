from curl_cffi import requests

try:
    response = requests.get("https://metruyenchu.com.vn/cao-vo-boi-luyen-muoi-nam-mot-chieu-xuat-thu-thien-ha-biet", impersonate="chrome")
    print(response.status_code)
    import re
    match = re.search(r'<meta property="og:image" content="([^"]+)"', response.text)
    print("Image:", match.group(1) if match else "No match")
except Exception as e:
    print("Error:", e)
