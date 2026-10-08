import argparse,asyncio,json
from pathlib import Path
import edge_tts

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--text",required=True);ap.add_argument("--voice",required=True);ap.add_argument("--audio",required=True);ap.add_argument("--timings",required=True)
    a=ap.parse_args()
    async def run():
        communicate=edge_tts.Communicate(a.text,a.voice);words=[]
        with open(a.audio,"wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"]=="audio": f.write(chunk["data"])
                elif chunk["type"]=="WordBoundary":
                    s=chunk["offset"]/10000000;d=chunk["duration"]/10000000
                    words.append({"text":chunk["text"],"start":s,"end":s+d})
        Path(a.timings).write_text(json.dumps({"words":words},ensure_ascii=False),encoding="utf8")
    asyncio.run(run())
if __name__=="__main__": main()
