import urllib.request
import urllib.parse
import json

# Test contact form with AJAX logic (POST JSON expectation or form-encoded)
# Our main.js uses FormData which is multipart/form-data or application/x-www-form-urlencoded
data = urllib.parse.urlencode({
    'name': 'Animation Test',
    'email': 'anim@test.com',
    'phone': '9999999999',
    'subject': 'Smooth Scroll Test',
    'message': 'Testing premium animations and micro-interactions.'
}).encode()

try:
    req = urllib.request.Request('http://127.0.0.1:5000/contact', data=data, method='POST')
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print(f"Contact Status: {resp.status}")
    print(f"Response: {result}")
except Exception as e:
    print(f"Contact Post Failed: {e}")

# Test all pages
for path in ['/', '/submit', '/admin/login']:
    try:
        resp = urllib.request.urlopen(f'http://127.0.0.1:5000{path}')
        content = resp.read()
        print(f"{path}: Status {resp.status}, Length {len(content)}")
        # Check for presence of CSS and JS links
        if b'style.css' in content and b'main.js' in content:
            print(f"  - CSS/JS check: PASSED")
        else:
            print(f"  - CSS/JS check: FAILED")
    except Exception as e:
        print(f"{path} Failed: {e}")
