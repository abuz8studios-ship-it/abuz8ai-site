# -*- coding: utf-8 -*-
"""Per-page ComfyStudio configs. Each is the ONLY page-specific code needed."""

NEG = ("text, watermark, signature, blurry, low quality, jpeg artifacts, "
       "deformed, extra limbs, bad anatomy")

CONFIGS = {
"ai-anime-art-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'anime',
    promptLabel: 'Describe your anime scene or character',
    promptPlaceholder: 'a swordswoman on a rainy neon rooftop, city lights below',
    basePositive: 'masterpiece, best quality, highly detailed, sharp focus',
    negative: '%NEG%',
    sizes: [512, 768, 1024], maxBatch: 4, defaultSteps: 24,
    styles: [
      { id:'classic',  label:'Classic Anime',  pos:'anime style, clean cel shading, vibrant colors, expressive eyes' },
      { id:'cinema',   label:'Anime Film',     pos:'anime film still, cinematic lighting, painterly backgrounds, film grain' },
      { id:'manga',    label:'Manga Ink',      pos:'manga illustration, bold ink linework, screentone shading, high contrast' },
      { id:'pastel',   label:'Soft Pastel',    pos:'soft pastel anime art, gentle gradients, warm diffused light, delicate detail' }
    ],
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:c.ckpt}},
        '2':{class_type:'CLIPTextEncode',inputs:{text:c.positive,clip:['1',1]}},
        '3':{class_type:'CLIPTextEncode',inputs:{text:c.negative,clip:['1',1]}},
        '4':{class_type:'EmptyLatentImage',inputs:{width:c.size,height:c.size,batch_size:c.batch}},
        '5':{class_type:'KSampler',inputs:{seed:c.seed,steps:c.steps,cfg:7.0,
             sampler_name:'euler',scheduler:'normal',denoise:1.0,
             model:['1',0],positive:['2',0],negative:['3',0],latent_image:['4',0]}},
        '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['1',2]}},
        '7':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_anime',images:['6',0]}}
      };
    }
  }).mount();
""",

"ai-cartoon-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'cartoon',
    promptLabel: 'Describe your character',
    promptPlaceholder: 'a friendly barista with curly red hair and round glasses',
    basePositive: 'clean vector-friendly shapes, bold outlines, flat vivid colors, centered portrait',
    negative: '%NEG%',
    sizes: [512, 768, 1024], maxBatch: 4, defaultSteps: 22,
    styles: [
      { id:'toon',    label:'Modern Toon',   pos:'modern cartoon avatar, thick clean outlines, flat shading, friendly expression' },
      { id:'retro',   label:'Retro 90s',     pos:'1990s saturday morning cartoon style, retro palette, halftone texture' },
      { id:'sticker', label:'Sticker Art',   pos:'die-cut sticker illustration, thick white border, glossy highlights, plain background' },
      { id:'comic',   label:'Comic Panel',   pos:'comic book art, dynamic inking, cross-hatching, dramatic rim light' }
    ],
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:c.ckpt}},
        '2':{class_type:'CLIPTextEncode',inputs:{text:c.positive,clip:['1',1]}},
        '3':{class_type:'CLIPTextEncode',inputs:{text:c.negative,clip:['1',1]}},
        '4':{class_type:'EmptyLatentImage',inputs:{width:c.size,height:c.size,batch_size:c.batch}},
        '5':{class_type:'KSampler',inputs:{seed:c.seed,steps:c.steps,cfg:7.5,
             sampler_name:'euler',scheduler:'normal',denoise:1.0,
             model:['1',0],positive:['2',0],negative:['3',0],latent_image:['4',0]}},
        '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['1',2]}},
        '7':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_cartoon',images:['6',0]}}
      };
    }
  }).mount();
""",

"ai-product-photos-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'product',
    promptLabel: 'Describe the product and the scene',
    promptPlaceholder: 'a matte black ceramic coffee mug on polished concrete, morning light',
    basePositive: 'professional product photography, studio lighting, shallow depth of field, ' +
                  'crisp focus, commercial catalog quality, 85mm lens',
    negative: '%NEG%, cluttered background, hands, people',
    sizes: [512, 768, 1024], maxBatch: 4, defaultSteps: 26,
    styles: [
      { id:'studio',  label:'Studio White',  pos:'seamless white studio backdrop, soft box lighting, subtle reflection' },
      { id:'lifestyle',label:'Lifestyle',    pos:'lifestyle product shot, natural window light, warm styled surface, soft shadows' },
      { id:'luxury',  label:'Luxury Dark',   pos:'luxury product shot on dark surface, dramatic rim lighting, gold accents, moody' },
      { id:'flatlay', label:'Flat Lay',      pos:'overhead flat lay composition, even diffused light, minimal styled props' }
    ],
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:c.ckpt}},
        '2':{class_type:'CLIPTextEncode',inputs:{text:c.positive,clip:['1',1]}},
        '3':{class_type:'CLIPTextEncode',inputs:{text:c.negative,clip:['1',1]}},
        '4':{class_type:'EmptyLatentImage',inputs:{width:c.size,height:c.size,batch_size:c.batch}},
        '5':{class_type:'KSampler',inputs:{seed:c.seed,steps:c.steps,cfg:7.0,
             sampler_name:'dpmpp_2m',scheduler:'karras',denoise:1.0,
             model:['1',0],positive:['2',0],negative:['3',0],latent_image:['4',0]}},
        '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['1',2]}},
        '7':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_product',images:['6',0]}}
      };
    }
  }).mount();
""",

"ai-image-upscaler-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'upscale',
    needsImage: true,
    promptLabel: null,
    hideSampler: true,
    goLabel: 'Upscale 4x',
    note: 'Deterministic ESRGAN upscale — no prompt, no seed, no sampler. ' +
          'Your image is enlarged 4x on your own GPU and never leaves your machine.',
    sizes: [1024], maxBatch: 1, defaultSteps: 20,
    requires: { node:'UpscaleModelLoader', field:'model_name', label:'upscale (ESRGAN)' },
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'LoadImage',inputs:{image:c.image}},
        '2':{class_type:'UpscaleModelLoader',inputs:{model_name:c.requiredModel}},
        '3':{class_type:'ImageUpscaleWithModel',inputs:{upscale_model:['2',0],image:['1',0]}},
        '4':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_upscale',images:['3',0]}}
      };
    }
  }).mount();
""",

"ai-background-remover-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'bgremove',
    needsImage: true,
    promptLabel: null,
    hideSampler: true,
    goLabel: 'Remove Background',
    note: 'Deterministic segmentation (RemBG / u2net) — no prompt, no seed, no sampler. ' +
          'Your image is processed on your own GPU and never leaves your machine.',
    sizes: [1024], maxBatch: 1, defaultSteps: 20,
    requires: { node:'RemBGSession+', field:'model', label:'background removal (RemBG)' },
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'LoadImage',inputs:{image:c.image}},
        '2':{class_type:'RemBGSession+',inputs:{model:'isnet-general-use: general purpose',providers:'CPU'}},
        '3':{class_type:'ImageRemoveBackground+',inputs:{rembg_session:['2',0],image:['1',0]}},
        '4':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_bgremove',images:['3',0]}}
      };
    }
  }).mount();
""",

# ai-qr-art-pro.html: RE-ENABLED 2026-08-12 evening shift. Was blocked (SDXL
# ControlNet models with no SDXL checkpoint -> "y is None" in KSampler, see
# ERRORS.md). sd_xl_base_1.0.safetensors installed 2026-08-12 (ad-hoc run,
# SHA256 31E35C80...) and the full pipeline verified live via
# verify_new_studio_2026_08_12.py (OK, real PNG). Checkpoint + ControlNet are
# HARDCODED (not user-selectable) because only this exact SDXL pair works;
# hideSampler keeps the UI honest. Seed randomized in buildWorkflow.
"ai-qr-art-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'qrart',
    promptLabel: 'Link or text to encode',
    promptPlaceholder: 'https://your-site.com',
    hideSampler: true,
    goLabel: 'Generate QR Art',
    note: 'Scannable art QR — your link is encoded locally, styled by SDXL + ControlNet ' +
          '(canny) on your own GPU, and never leaves your machine. Always test the scan ' +
          'with your phone camera before printing.',
    sizes: [1024], maxBatch: 1, defaultSteps: 24,
    styles: [
      { id:'mosaic',  label:'Floral Mosaic',   pos:'organic mosaic of flowers and leaves, vibrant colors, highly detailed' },
      { id:'circuit', label:'Cyber Circuit',   pos:'glowing cyberpunk circuit board, neon teal and magenta traces, dark background' },
      { id:'water',   label:'Watercolor',      pos:'soft watercolor wash, ink bloom edges, artistic paper texture' },
      { id:'geo',     label:'Metallic Tiles',  pos:'geometric metallic tiles, brushed gold and steel, studio lighting' }
    ],
    requires: { node:'ControlNetLoader', field:'control_net_name', label:'ControlNet (SDXL)' },
    buildWorkflow: function (c) {
      var elp = document.getElementById('cs-qrart-prompt');
      var url = (elp && elp.value || '').trim() || 'https://abuz8ai.com';
      var looks = {
        mosaic:  'organic mosaic of flowers and leaves, vibrant colors, highly detailed',
        circuit: 'glowing cyberpunk circuit board, neon teal and magenta traces, dark background',
        water:   'soft watercolor wash, ink bloom edges, artistic paper texture',
        geo:     'geometric metallic tiles, brushed gold and steel, studio lighting'
      };
      var pos = 'masterpiece, best quality, intricate scannable qr code art, ' +
                (looks[c.styleId] || looks.mosaic);
      var seed = Math.floor(Math.random() * 4294967295);
      return {
        '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'sd_xl_base_1.0.safetensors'}},
        '2':{class_type:'CLIPTextEncode',inputs:{text:pos,clip:['1',1]}},
        '3':{class_type:'CLIPTextEncode',inputs:{text:'%NEG%',clip:['1',1]}},
        '4':{class_type:'EmptyLatentImage',inputs:{width:1024,height:1024,batch_size:1}},
        '5':{class_type:'Qr Code (mtb)',inputs:{url:url,width:1024,height:1024,error_correct:'H',box_size:10,border:4,invert:false}},
        '6':{class_type:'ControlNetLoader',inputs:{control_net_name:'canny_sdxl.safetensors'}},
        '7':{class_type:'ControlNetApply',inputs:{conditioning:['2',0],control_net:['6',0],image:['5',0],strength:0.85}},
        '8':{class_type:'KSampler',inputs:{seed:seed,steps:c.steps,cfg:7.5,
             sampler_name:'dpmpp_2m',scheduler:'karras',denoise:1.0,
             model:['1',0],positive:['7',0],negative:['3',0],latent_image:['4',0]}},
        '9':{class_type:'VAEDecode',inputs:{samples:['8',0],vae:['1',2]}},
        '10':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_qrart',images:['9',0]}}
      };
    }
  }).mount();
""",
# ai-style-transfer-pro.html: ADDED 2026-08-13 morning shift. Plain img2img —
# LoadImage -> ImageScale -> VAEEncode -> KSampler(denoise 0.62) -> VAEDecode.
# No ControlNet, no model-pair dependency: any installed checkpoint works, so the
# ckpt picker stays user-selectable (unlike qr-art's hardcoded SDXL pair).
# RepeatLatentBatch gives real multi-image batches from one encoded source.
# Live-verified via scripts/verify_styletx_2026_08_13.py before injection.
"ai-style-transfer-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'styletx',
    needsImage: true,
    promptLabel: 'Optional: extra details to steer the restyle',
    promptPlaceholder: 'golden hour light, dramatic clouds, rich texture',
    basePositive: 'masterpiece, best quality, highly detailed, sharp focus',
    negative: '%NEG%',
    sizes: [512, 768, 1024], maxBatch: 4, defaultSteps: 24,
    styles: [
      { id:'oil',     label:'Oil Painting',   pos:'classical oil painting, visible brush strokes, canvas texture, rich impasto' },
      { id:'water',   label:'Watercolor',     pos:'delicate watercolor painting, soft ink bloom, paper grain, gentle washes' },
      { id:'cyber',   label:'Cyberpunk Neon', pos:'cyberpunk digital art, neon teal and magenta rim light, rain-slick reflections' },
      { id:'sketch',  label:'Pencil Sketch',  pos:'graphite pencil sketch, fine hatching, monochrome, sketchbook shading' }
    ],
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:c.ckpt}},
        '2':{class_type:'LoadImage',inputs:{image:c.image}},
        '3':{class_type:'ImageScale',inputs:{image:['2',0],upscale_method:'lanczos',width:c.size,height:c.size,crop:'center'}},
        '4':{class_type:'VAEEncode',inputs:{pixels:['3',0],vae:['1',2]}},
        '5':{class_type:'RepeatLatentBatch',inputs:{samples:['4',0],amount:c.batch}},
        '6':{class_type:'CLIPTextEncode',inputs:{text:c.positive,clip:['1',1]}},
        '7':{class_type:'CLIPTextEncode',inputs:{text:c.negative,clip:['1',1]}},
        '8':{class_type:'KSampler',inputs:{seed:c.seed,steps:c.steps,cfg:7.0,
             sampler_name:'dpmpp_2m',scheduler:'karras',denoise:0.62,
             model:['1',0],positive:['6',0],negative:['7',0],latent_image:['5',0]}},
        '9':{class_type:'VAEDecode',inputs:{samples:['8',0],vae:['1',2]}},
        '10':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_styletx',images:['9',0]}}
      };
    }
  }).mount();
""",
# ai-headshot-pro.html: ADDED 2026-08-13 afternoon shift. Identity-preserving
# img2img — same LoadImage -> ImageScale -> VAEEncode -> RepeatLatentBatch ->
# KSampler chain as style-transfer, but denoise 0.50 / cfg 6.5 to keep the
# subject's likeness while relighting into a professional headshot. Checkpoint
# stays user-selectable (no model-pair dependency). Live-verified via
# scripts/verify_headshot_2026_08_13.py before injection.
"ai-headshot-pro.html": """
  new ComfyStudio({
    mount: '#abuz8-studio', slug: 'headshot',
    needsImage: true,
    promptLabel: 'Optional: extra details (attire, background, mood)',
    promptPlaceholder: 'navy suit, soft grey studio background, confident smile',
    basePositive: 'professional headshot photograph, sharp focus on eyes, flattering studio lighting, ' +
                  '85mm portrait lens, shallow depth of field, natural skin texture',
    negative: '%NEG%, cartoon, anime, painting, illustration, oversaturated',
    sizes: [512, 768, 1024], maxBatch: 4, defaultSteps: 26,
    styles: [
      { id:'corporate', label:'Corporate',      pos:'clean corporate headshot, business attire, neutral light grey backdrop, soft even key light' },
      { id:'bw',        label:'Studio B&W',     pos:'black and white studio portrait, dramatic monochrome, fine film grain, classic rembrandt lighting' },
      { id:'executive', label:'Executive Dark', pos:'executive portrait on dark charcoal background, moody rim light, premium editorial look' },
      { id:'natural',   label:'Natural Light',  pos:'natural window light portrait, warm golden tones, soft bokeh office background' }
    ],
    buildWorkflow: function (c) {
      return {
        '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:c.ckpt}},
        '2':{class_type:'LoadImage',inputs:{image:c.image}},
        '3':{class_type:'ImageScale',inputs:{image:['2',0],upscale_method:'lanczos',width:c.size,height:c.size,crop:'center'}},
        '4':{class_type:'VAEEncode',inputs:{pixels:['3',0],vae:['1',2]}},
        '5':{class_type:'RepeatLatentBatch',inputs:{samples:['4',0],amount:c.batch}},
        '6':{class_type:'CLIPTextEncode',inputs:{text:c.positive,clip:['1',1]}},
        '7':{class_type:'CLIPTextEncode',inputs:{text:c.negative,clip:['1',1]}},
        '8':{class_type:'KSampler',inputs:{seed:c.seed,steps:c.steps,cfg:6.5,
             sampler_name:'dpmpp_2m',scheduler:'karras',denoise:0.5,
             model:['1',0],positive:['6',0],negative:['7',0],latent_image:['5',0]}},
        '9':{class_type:'VAEDecode',inputs:{samples:['8',0],vae:['1',2]}},
        '10':{class_type:'SaveImage',inputs:{filename_prefix:'abuz8_headshot',images:['9',0]}}
      };
    }
  }).mount();
""",
}

for k in CONFIGS:
    CONFIGS[k] = CONFIGS[k].replace("%NEG%", NEG)
