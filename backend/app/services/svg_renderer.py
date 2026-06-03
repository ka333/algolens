# SVG Rendering Service - Profile, Benchmarking, and Topic Mastery Templates

# 1. Profile Summary Card (Commit 45)
def render_stats_card(easy: int, medium: int, hard: int, streak: int) -> str:
    total = easy + medium + hard
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#121824"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <style>
      .title {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 18px; fill: #f3f4f6; }}
      .label {{ font-family: 'Inter', system-ui, sans-serif; font-size: 11px; fill: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }}
      .value {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 800; font-size: 26px; }}
      .value-streak {{ fill: #f59e0b; }}
      .value-total {{ fill: url(#accent); }}
      .diff-title {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 600; font-size: 13px; }}
      .diff-val {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 15px; fill: #f3f4f6; }}
    </style>
  </defs>
  
  <rect width="400" height="200" rx="16" fill="url(#bg)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
  
  <!-- Header Title -->
  <text x="24" y="38" class="title">AlgoLens Solving Profile</text>
  
  <!-- Solved Streak -->
  <g transform="translate(24, 60)">
    <text x="0" y="15" class="label">Solved Streak</text>
    <text x="0" y="44" class="value value-streak">{streak} 🔥</text>
  </g>

  <!-- Total Solved -->
  <g transform="translate(180, 60)">
    <text x="0" y="15" class="label">Total Solved</text>
    <text x="0" y="44" class="value value-total">{total}</text>
  </g>

  <!-- Difficulty breakdown -->
  <g transform="translate(24, 136)">
    <!-- Easy -->
    <g transform="translate(0, 0)">
      <text x="0" y="15" class="diff-title" fill="#10b981">Easy</text>
      <text x="0" y="36" class="diff-val">{easy}</text>
      <rect x="0" y="44" width="80" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
      <rect x="0" y="44" width="{80 if easy > 0 else 0}" height="4" rx="2" fill="#10b981"/>
    </g>

    <!-- Medium -->
    <g transform="translate(120, 0)">
      <text x="0" y="15" class="diff-title" fill="#f59e0b">Medium</text>
      <text x="0" y="36" class="diff-val">{medium}</text>
      <rect x="0" y="44" width="80" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
      <rect x="0" y="44" width="{80 if medium > 0 else 0}" height="4" rx="2" fill="#f59e0b"/>
    </g>

    <!-- Hard -->
    <g transform="translate(240, 0)">
      <text x="0" y="15" class="diff-title" fill="#ef4444">Hard</text>
      <text x="0" y="36" class="diff-val">{hard}</text>
      <rect x="0" y="44" width="80" height="4" rx="2" fill="rgba(255,255,255,0.05)"/>
      <rect x="0" y="44" width="{80 if hard > 0 else 0}" height="4" rx="2" fill="#ef4444"/>
    </g>
  </g>
</svg>"""

# 2. Percentile Benchmark Card (Commit 46)
def render_benchmark_card(user_time: float, avg_time: float, percentile: float) -> str:
    user_formatted = f"{int(user_time // 60)}m {int(user_time % 60)}s" if user_time >= 60 else f"{int(user_time)}s"
    avg_formatted = f"{int(avg_time // 60)}m {int(avg_time % 60)}s" if avg_time >= 60 else f"{int(avg_time)}s"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#121824"/>
    </linearGradient>
    <linearGradient id="slider" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <style>
      .title {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 15px; fill: #f3f4f6; }}
      .metric-lbl {{ font-family: 'Inter', system-ui, sans-serif; font-size: 11px; fill: #9ca3af; }}
      .metric-val {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 700; font-size: 18px; fill: #f3f4f6; }}
      .percentile-text {{ font-family: 'Inter', system-ui, sans-serif; font-weight: 800; font-size: 14px; fill: #10b981; }}
    </style>
  </defs>

  <rect width="400" height="150" rx="16" fill="url(#bg)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

  <!-- Title -->
  <text x="24" y="34" class="title">Performance Benchmark</text>

  <!-- Metrics -->
  <g transform="translate(24, 52)">
    <text x="0" y="12" class="metric-lbl">Your Solve Time</text>
    <text x="0" y="32" class="metric-val">{user_formatted}</text>
  </g>

  <g transform="translate(160, 52)">
    <text x="0" y="12" class="metric-lbl">Global Average</text>
    <text x="0" y="32" class="metric-val">{avg_formatted}</text>
  </g>

  <!-- Percentile Badge -->
  <g transform="translate(280, 52)">
    <text x="0" y="12" class="metric-lbl">Performance</text>
    <text x="0" y="32" class="percentile-text">Top {100.0 - percentile:.1f}% ✨</text>
  </g>

  <!-- Gauge Slider Bar -->
  <g transform="translate(24, 110)">
    <rect x="0" y="0" width="352" height="8" rx="4" fill="url(#slider)"/>
    <!-- Position slider pin according to percentile -->
    <circle cx="{3.52 * percentile}" cy="4" r="7" fill="#f3f4f6" stroke="#0a0e17" stroke-width="2"/>
    <text x="0" y="-8" font-family="'Inter', sans-serif" font-size="9" fill="#6b7280">SLOWER</text>
    <text x="312" y="-8" font-family="'Inter', sans-serif" font-size="9" fill="#6b7280">FASTER</text>
  </g>
</svg>"""

# 3. Topic Radar / Mastery Card (Commit 47)
def render_radar_card(topics: list) -> str:
    # Build dynamic progress indicators for topics
    bars_svg = ""
    for idx, (topic_name, pct) in enumerate(topics[:3]):
        y_offset = idx * 36
        bars_svg += f"""
    <g transform="translate(0, {y_offset})">
      <text x="0" y="12" font-family="'Inter', sans-serif" font-weight="600" font-size="12" fill="#e5e7eb">{topic_name}</text>
      <text x="352" y="12" font-family="'Inter', sans-serif" font-weight="bold" font-size="12" fill="#8b5cf6" text-anchor="end">{pct}%</text>
      <rect x="0" y="20" width="352" height="6" rx="3" fill="rgba(255,255,255,0.05)"/>
      <rect x="0" y="20" width="{3.52 * pct}" height="6" rx="3" fill="linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" style="fill: #8b5cf6;"/>
    </g>
    """

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180" viewBox="0 0 400 180">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#121824"/>
    </linearGradient>
  </defs>

  <rect width="400" height="180" rx="16" fill="url(#bg)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

  <!-- Title -->
  <text x="24" y="34" font-family="'Inter', sans-serif" font-weight="bold" font-size="15" fill="#f3f4f6">Topic Mastery</text>

  <!-- Topic Bars -->
  <g transform="translate(24, 54)">
    {bars_svg}
  </g>
</svg>"""
