#!/usr/bin/env python3
"""
ABUZ8 X/Twitter Auto-Poster
Posts AI content to Twitter/X using free tier API
"""

import os
import json
import requests
from datetime import datetime

# X/Twitter API v2 credentials (get from https://developer.twitter.com)
API_KEY = os.getenv('X_API_KEY', '')
API_SECRET = os.getenv('X_API_SECRET', '')
ACCESS_TOKEN = os.getenv('X_ACCESS_TOKEN', '')
ACCESS_TOKEN_SECRET = os.getenv('X_ACCESS_TOKEN_SECRET', '')

def get_access_token():
    """Get bearer token from credentials"""
    import base64
    credentials = f"{API_KEY}:{API_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    
    response = requests.post(
        'https://api.twitter.com/2/oauth2/token',
        headers={
            'Authorization': f'Basic {encoded}',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data='grant_type=client_credentials'
    )
    
    if response.status_code == 200:
        return response.json().get('access_token')
    return None

def post_tweet(access_token, text):
    """Post a tweet"""
    url = 'https://api.twitter.com/2/tweets'
    
    response = requests.post(
        url,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        },
        json={'text': text}
    )
    
    if response.status_code == 201:
        return {'success': True, 'tweet_id': response.json().get('data', {}).get('id')}
    else:
        return {'success': False, 'error': response.text}

def generate_content():
    """Generate AI content for posting"""
    content = [
        "🚀 The future of AI is here. Sovereign AI agents working 24/7, no monthly fees, completely free. #AI #Automation #Sovereignty",
        "💡 3 free AI tools that replaced my $500/month stack: 1) Ollama (local LLM) 2) ComfyUI (video gen) 3) QADIR (agent OS). Build sovereignty. #AITools #OpenSource",
        "🔥 AI agency owners: stop paying $10K/month for tools. We built agents that work for FREE. Local, sovereign, no subscriptions. Thread 🧵 #AIAgency #Automation",
        "🌍 AI is not replacing jobs. It's replacing BUSINESSES that refuse to adapt. The ones that thrive: they use sovereign agents, free tools, local AI. #AI #Business",
        "💰 Made $10K in 3 days using free AI agents. Here's the stack: 1. Ollama for content 2. ElevenLabs free tier for audio 3. ComfyUI for video 4. Agents doing the work. #AI #Revenue",
        "⚡ The $100K AI agency stack (all free): • Local LLM: Ollama • Video: ComfyUI • Audio: ElevenLabs free • Agents: Custom Python • No monthly fees. Just skill. #AITools #Agency",
        "🎯 30 agents working 24/7 for free. No API costs. No subscriptions. Just sovereign AI. This is what the future looks like. #AI #Automation #Sovereignty",
        "🚨 STOP paying for ChatGPT if you have a GPU. Ollama + Llama 3.1 = FREE unlimited AI. Plus it works offline. Build sovereignty. #AI #OpenSource #Privacy",
        "💡 The secret to AI agency success: 1. Use free tools 2. Build sovereign agents 3. No dependencies 4. Work locally. We built this. You can too. #AI #Agency #Automation",
        "🔥 New: ABUZ8 OS v1.9.0 — 232+ agents, full sovereignty, zero monthly fees. Download now. Build the future. #AI #OS #Sovereignty"
    ]
    return content

if __name__ == '__main__':
    if not API_KEY or not API_SECRET or not ACCESS_TOKEN or not ACCESS_TOKEN_SECRET:
        print("❌ Missing X/Twitter API credentials")
        print("Set these environment variables:")
        print("  X_API_KEY")
        print("  X_API_SECRET")
        print("  X_ACCESS_TOKEN")
        print("  X_ACCESS_TOKEN_SECRET")
        print("\nGet them from: https://developer.twitter.com")
        exit(1)
    
    # Get access token
    token = get_access_token()
    if not token:
        print("❌ Failed to get access token")
        exit(1)
    
    print("✅ Access token obtained")
    
    # Generate and post content
    content = generate_content()
    
    for i, tweet in enumerate(content[:3]):  # Post 3 tweets
        print(f"\n📤 Posting tweet {i+1}/3...")
        result = post_tweet(token, tweet)
        
        if result['success']:
            print(f"✅ Posted! Tweet ID: {result['tweet_id']}")
        else:
            print(f"❌ Failed: {result['error']}")
