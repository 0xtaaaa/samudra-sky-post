#!/usr/bin/env python3
"""Take the entry's screenshots from the game's own staged shots.

Chrome runs headed-off (headless=new) at 1280x720, loads ?shot=<name>&mission=<n>,
waits for window.__shotDone and captures a JPEG."""
import base64
import json
import os
import subprocess
import sys
import time

import requests
import websocket

OUT = "/home/ubuntu/ffgame/screenshots"
PORT = 9333
URL = "http://127.0.0.1:8123/index.html"

SHOTS = [
    ("1-approach", "approach", 0),
    ("2-rings", "ring", 1),
    ("3-storm", "storm", 4),
    ("4-cockpit", "cockpit", 0),
]


def chrome():
    subprocess.run(["pkill", "-f", "remote-debugging-port=%d" % PORT], check=False)
    time.sleep(1)
    p = subprocess.Popen([
        "google-chrome", "--headless=new", "--remote-debugging-port=%d" % PORT, "--remote-allow-origins=*",
        "--window-size=1280,720", "--hide-scrollbars", "--force-device-scale-factor=1",
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-cache", "--disk-cache-size=0",
        "--user-data-dir=/tmp/ffshot-profile", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            requests.get("http://127.0.0.1:%d/json/version" % PORT, timeout=1)
            return p
        except Exception:  # noqa: BLE001
            time.sleep(0.3)
    raise SystemExit("chrome did not start")


class Page:
    def __init__(self, url):
        tab = requests.put("http://127.0.0.1:%d/json/new?%s" % (PORT, url), timeout=10).json()
        self.ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=40)
        self.i = 0
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call("Emulation.setDeviceMetricsOverride", width=1280, height=720,
                  deviceScaleFactor=1, mobile=False)

    def call(self, method, **kw):
        self.i += 1
        self.ws.send(json.dumps({"id": self.i, "method": method, "params": kw}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.i:
                if "error" in msg:
                    raise RuntimeError(method + ": " + str(msg["error"]))
                return msg.get("result", {})

    def js(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")

    def close(self):
        self.ws.close()


def main():
    os.makedirs(OUT, exist_ok=True)
    proc = chrome()
    ok = True
    try:
        for name, shot, mission in SHOTS:
            p = Page("%s?shot=%s&mission=%d&t=%d" % (URL, shot, mission, int(time.time())))
            info = None
            for _ in range(120):
                info = p.js("window.__shotDone ? window.__shotInfo : null")
                if info:
                    break
                time.sleep(0.25)
            if not info:
                print(name, "NO SHOT", p.js("window.__shotError"))
                ok = False
                p.close()
                continue
            cap = p.call("Page.captureScreenshot", format="jpeg", quality=90,
                         clip={"x": 0, "y": 0, "width": 1280, "height": 720, "scale": 1})
            path = os.path.join(OUT, name + ".jpg")
            open(path, "wb").write(base64.b64decode(cap["data"]))
            print(name, json.dumps(info), os.path.getsize(path), "bytes", flush=True)
            p.close()
    finally:
        proc.terminate()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
