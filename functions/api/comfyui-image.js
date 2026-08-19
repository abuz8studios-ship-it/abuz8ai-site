// ABUZ8 — ComfyUI Image Generation endpoint (local GPU)
// Route: POST /api/comfyui-image
// Uses: ComfyUI at localhost:8188 (RTX 5090)
//
// Request: { prompt: string, width?: number, height?: number }
// Response: image/png binary or JSON error

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, error: "prompt required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const width = Math.min(Number(body.width) || 768, 1024);
  const height = Math.min(Number(body.height) || 768, 1024);

  try {
    // Test ComfyUI is alive first
    const systemStats = await fetch("http://localhost:8188/system_stats");
    if (!systemStats.ok) {
      return json({ ok: false, error: "ComfyUI engine offline", offline: true }, 503);
    }

    // Call ComfyUI API to queue a workflow
    const workflow = {
      "1": {
        "inputs": {
          "ckpt_name": "sd15.safetensors"
        },
        "class_type": "CheckpointLoader",
        "_meta": {
          "title": "Load Checkpoint"
        }
      },
      "3": {
        "inputs": {
          "text": prompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode(positive)",
        "_meta": {
          "title": "CLIP Text Encode (Positive)"
        }
      },
      "4": {
        "inputs": {
          "text": "lowquality, blurry",
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode(negative)",
        "_meta": {
          "title": "CLIP Text Encode (Negative)"
        }
      },
      "5": {
        "inputs": {
          "width": width,
          "height": height,
          "batch_size": 1
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
          "title": "Empty Latent Image"
        }
      },
      "6": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 7.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["1", 0],
          "positive": ["3", 0],
          "negative": ["4", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "8": {
        "inputs": {
          "samples": ["6", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "9": {
        "inputs": {
          "filename_prefix": "abuz8_gen",
          "images": ["8", 0]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      }
    };

    const queueResponse = await fetch("http://localhost:8188/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!queueResponse.ok) {
      return new Response(JSON.stringify({ ok: false, error: "ComfyUI queue failed", status: queueResponse.status }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    const queueData = await queueResponse.json();
    const promptId = queueData.prompt_id;

    if (!promptId) {
      return new Response(JSON.stringify({ ok: false, error: "No prompt ID returned" }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // Poll for completion (max 60 seconds)
    const startTime = Date.now();
    const maxWait = 60000;

    while (Date.now() - startTime < maxWait) {
      const historyResponse = await fetch(`http://localhost:8188/history/${promptId}`);
      const history = await historyResponse.json();

      if (history[promptId]) {
        const result = history[promptId];
        const images = result.outputs["9"]?.images || [];

        if (images.length > 0) {
          const imageName = images[0].filename;
          const imageResponse = await fetch(`http://localhost:8188/view?filename=${imageName}`);
          const imageBuffer = await imageResponse.arrayBuffer();

          return new Response(imageBuffer, {
            status: 200,
            headers: { "Content-Type": "image/png", ...CORS },
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(JSON.stringify({ ok: false, error: "ComfyUI generation timeout" }), {
      status: 504,
      headers: { "Content-Type": "application/json", ...CORS },
    });

  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
