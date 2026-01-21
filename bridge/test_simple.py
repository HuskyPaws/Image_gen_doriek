#!/usr/bin/env python3
"""
Simple test to verify Flask is working
"""

print("Testing Flask installation...")

try:
    import flask
    print("✓ Flask imported successfully")
    print(f"  Version: {flask.__version__}")
except ImportError as e:
    print("✗ Flask import failed!")
    print(f"  Error: {e}")
    print("\n  Fix: pip install flask")
    input("\nPress Enter to exit...")
    exit(1)

try:
    import flask_cors
    print("✓ Flask-CORS imported successfully")
except ImportError as e:
    print("✗ Flask-CORS import failed!")
    print(f"  Error: {e}")
    print("\n  Fix: pip install flask-cors")
    input("\nPress Enter to exit...")
    exit(1)

print("\n" + "=" * 50)
print("Creating test Flask server...")
print("=" * 50)

app = flask.Flask(__name__)
flask_cors.CORS(app)

@app.route('/test')
def test():
    return flask.jsonify({"status": "working"})

print("\nStarting server on http://localhost:8765/test")
print("If you see * Running on http://localhost:8765 below, Flask is working!")
print("\nPress Ctrl+C to stop\n")

try:
    app.run(host='localhost', port=8765, debug=False)
except Exception as e:
    print(f"\n✗ Server failed to start: {e}")
    print("\nCommon causes:")
    print("1. Port 8765 already in use")
    print("2. Firewall blocking")
    print("3. Permission issue")
    input("\nPress Enter to exit...")
    exit(1)
































