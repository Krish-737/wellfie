import argparse
import qrcode
from PIL import Image
 
def generate(location: str, base_url: str):
    url = f"{base_url.rstrip('/')}/kiosk/start?kiosk_id={location}"
    print(f"Generating QR for: {url}")
 
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
 
    img = qr.make_image(fill_color="#031427", back_color="white")
    filename = f"qr_{location}.png"
    img.save(filename)
    print(f"Saved: {filename}")
    print(f"URL:   {url}")
 
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--location", required=True, help="Location ID, e.g. clinic-a")
    parser.add_argument("--url",      required=True, help="Frontend base URL, e.g. https://app.mywellfie.com")
    args = parser.parse_args()
    generate(args.location, args.url)