import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime (not edge) for multipart

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "");
    const steps = form.get("steps") ? Number(form.get("steps")) : undefined;
    const guidance = form.get("guidance") ? Number(form.get("guidance")) : undefined;
    const image = form.get("image") as File | null;
    const mask = form.get("mask") as File | null;

    if (!prompt.trim() || !image || !mask) {
      return NextResponse.json({ error: "prompt, image, and mask are required" }, { status: 400 });
    }

    const model = process.env.HF_MODEL || "stabilityai/stable-diffusion-2-inpainting";
    const url = `https://api-inference.huggingface.co/models/${model}`;

    const forward = new FormData();
    // Hugging Face inpainting accepts: image (original), mask (white = to inpaint), plus prompt in inputs
    forward.append("image", image, "image.png");
    forward.append("mask", mask, "mask.png");
    forward.append("inputs", prompt);
    const params: Record<string, any> = {};
    if (typeof steps === "number") params.num_inference_steps = steps;
    if (typeof guidance === "number") params.guidance_scale = guidance;
    forward.append("parameters", new Blob([JSON.stringify(params)], { type: "application/json" }));

    const hfRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        Accept: "image/png",
      },
      body: forward,
      cache: "no-store",
    });

    if (!hfRes.ok) {
      if (hfRes.status === 503) {
        return NextResponse.json({ error: "Model is loading or unavailable. Try again." }, { status: 503 });
      }
      const errText = await hfRes.text();
      return NextResponse.json({ error: `HF error: ${hfRes.status} ${errText}` }, { status: 500 });
    }

    const arrayBuffer = await hfRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ imageBase64: dataUrl, model });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
