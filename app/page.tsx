"use client";
import { useRef, useState } from "react";

type Region = "upper" | "lower";

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [region, setRegion] = useState<Region>("upper");
  const [prompt, setPrompt] = useState(""); 
  const [steps, setSteps] = useState<number | "">(25);
  const [guidance, setGuidance] = useState<number | "">(7.0);
  const [result, setResult] = useState<string>("");
  const [maskPreview, setMaskPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>(""); 
  const imgEl = useRef<HTMLImageElement | null>(null);

  const onFile = (f: File | null) => {
    setImageFile(f);
    setResult(""); setMaskPreview(""); setError(""); 
    if (f) setImageUrl(URL.createObjectURL(f));
    else setImageUrl(""); 
  };

  // Create mask on the client as a white region to inpaint, black elsewhere
  const makeMask = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width, h = img.height;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        // Fill black (keep area)
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, w, h);
        // Compute region rectangle
        let y1 = region === "upper" ? Math.round(0.15 * h) : Math.round(0.50 * h);
        let y2 = region === "upper" ? Math.round(0.60 * h) : Math.round(0.95 * h);
        const x1 = Math.round(0.10 * w);
        const x2 = Math.round(0.90 * w);
        // Draw white mask for inpaint area
        ctx.fillStyle = "white";
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Failed to create mask"));
          // preview
          setMaskPreview(canvas.toDataURL("image/png"));
          resolve(blob);
        }, "image/png");
      };
      img.onerror = reject;
      if (!imageUrl) return reject(new Error("No image"));
      img.src = imageUrl;
    });
  };

  const generate = async () => {
    try {
      if (!imageFile) { setError("Please upload an image."); return; }
      if (!prompt.trim()) { setError("Please enter a clothing prompt."); return; }
      setLoading(true); setResult(""); setError(""); 

      const maskBlob = await makeMask();

      const form = new FormData();
      form.append("prompt", prompt);
      if (steps !== "") form.append("steps", String(steps));
      if (guidance !== "") form.append("guidance", String(guidance));
      form.append("image", imageFile, imageFile.name);
      form.append("mask", maskBlob, "mask.png");
      form.append("region", region);

      const res = await fetch("/api/tryon", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data.imageBase64);
      // maskPreview already set
    } catch (e:any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">🧥 Virtual Try-On (Inpainting)</h1>
        <p className="text-sm text-gray-600">Upload photo → Select region → Describe clothing → Generate</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium">Upload Image</label>
            <input
              type="file" accept="image/*"
              onChange={(e)=>onFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgEl} src={imageUrl} alt="uploaded" className="rounded-xl shadow max-h-[360px]" />
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Region</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="region" value="upper" checked={region==="upper"} onChange={()=>setRegion("upper")} />
                Upper (shirt, jacket, top)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="region" value="lower" checked={region==="lower"} onChange={()=>setRegion("lower")} />
                Lower (pants, skirt)
              </label>
            </div>

            <label className="block text-sm font-medium">Clothing Prompt</label>
            <input
              value={prompt}
              onChange={(e)=>setPrompt(e.target.value)}
              placeholder={region==="upper" ? "A Hawaiian shirt" : "Black denim jeans"}
              className="border rounded-lg p-2 w-full"
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Steps</span>
                <input type="number" min={5} max={40} value={steps}
                  onChange={(e)=>setSteps(e.target.value===""?"":Number(e.target.value))}
                  className="border rounded-lg p-2" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Guidance</span>
                <input type="number" step="0.5" min={1} max={15} value={guidance}
                  onChange={(e)=>setGuidance(e.target.value===""?"":Number(e.target.value))}
                  className="border rounded-lg p-2" />
              </label>
            </div>

            <button onClick={generate} disabled={loading || !imageFile || !prompt.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
              {loading?"Generating...":"Generate Try-On"}
            </button>
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </div>
        </div>

        {maskPreview && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Mask Preview (white = clothing area)</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={maskPreview} alt="mask" className="rounded-xl shadow max-h-[360px]" />
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Final Try-On</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result} alt="result" className="rounded-xl shadow max-h-[512px] mx-auto" />
            <div className="text-center">
              <a download="tryon.png" href={result} className="text-blue-600 underline">Download PNG</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
