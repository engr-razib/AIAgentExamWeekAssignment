# Virtual Try-On (Inpainting) — Next.js + Hugging Face (Vercel-ready)

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

## Deploy to Vercel
- Push to a git repo and import into Vercel.
- Add environment variables in Vercel project settings:
  - `HF_API_KEY`
  - (optional) `HF_MODEL`
- Deploy.

## Notes
- Free Inference API can return 503 while the model is loading (cold start). Simply retry.
- Mask is generated on client to avoid heavy node-canvas deps.
- You can fine-tune the mask rectangle in `app/page.tsx`.
