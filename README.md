# Virtual Try-On (Inpainting) — Next.js + Hugging Face (Vercel-ready)

Virtual Try-On AI Agent 👕👖✨

An AI-powered Virtual Try-On system built with Next.js and Hugging Face Inference API.
Users can upload their photo, select a clothing region (upper/lower), enter a prompt (e.g. “A Hawaiian shirt”), and see the result applied to their own image.

🚀 Features
🖼️ Image Upload – upload your own photo
🎯 Region Selection – choose Upper (shirt, jacket, top) or Lower (pants, skirt)
✍️ Text Prompt Input – describe the clothing item
🖌️ Mask Generation – auto-masks the selected region (white = inpainted, black = preserved)

🤖 AI Inpainting – uses Hugging Face Stable Diffusion Inpainting models

👀 Preview – view both the mask image and final try-on image

🛠️ Tech Stack

Next.js 14 (App Router)
TypeScript
Tailwind CSS
Hugging Face Inference API
Vercel Serverless Functions


Features:
- Upload image
- Select region (Upper/Lower)
- Client-side mask generation (white=edit, black=keep)
- Inpainting via Hugging Face Inference API
- Displays both final image and mask used

## Setup

1) Install deps
```bash
npm install
```

2) Create `.env.local`
```
HF_API_KEY=your_huggingface_token_here
# Default model is stabilityai/stable-diffusion-2-inpainting
# You may also try: runwayml/stable-diffusion-inpainting
HF_MODEL=stabilityai/stable-diffusion-2-inpainting
```

3) Run locally
```bash
npm run dev
# open http://localhost:3000
```

## 🚀 Deployment (Vercel)

Push this repo to GitHub/GitLab
Import into Vercel
Set Environment Variables in Project Settings:
HF_API_KEY → your Hugging Face token
HF_MODEL (optional) → default: stabilityai/stable-diffusion-2-inpainting

## Deploy 🎉

🖥️ Usage
Upload your photo
Select Upper or Lower region
Enter a clothing prompt (e.g. "red leather jacket")
Click Generate
See the mask image + final try-on result

## 🔮 Future Enhancements

Brush-based custom masking 🎨
Prompt Refinement with LangChain.js 🤖
User authentication & gallery 🗂️
Faster models (SD Turbo / LCM) ⚡

## Notes
- Free Inference API can return 503 while the model is loading (cold start). Simply retry.



- Mask is generated on client to avoid heavy node-canvas deps.
- You can fine-tune the mask rectangle in `app/page.tsx`.
