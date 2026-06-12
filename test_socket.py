import socket
import sys

def test_port(host, port):
    try:
        s = socket.create_connection((host, port), timeout=5)
        print(f"SUCCESS: Port {port} on {host} is open!")
        s.close()
    except Exception as e:
        print(f"FAILED: {e}")

print("Testing direct connection (5432):")
test_port("db.ymhjvrnukrfigpcdoisd.supabase.co", 5432)

print("\nTesting pooler (6543):")
test_port("aws-1-ap-southeast-2.pooler.supabase.com", 6543)

print("\nTesting pooler (5432):")
test_port("aws-1-ap-southeast-2.pooler.supabase.com", 5432)
