<div align="center">
  <a href="https://github.com/JakeTurner616/js13k-2025">
    <img src="./docs/cover.png" alt="FLYKT Logo" width="460" height="300">
  </a>

<h1 align="center">FLYKT 𓆩₍^. .^₎𓆪 </h1>

<p align="center">
  A physics-based platformer where you <i>flick</i> a <b>black cat</b>  through portals to help it <i>escape</i>.<br /><br />
  <b>/flɪkt/ — An international homograph with two equal and distinct meanings;</b><br />
  <i>n.</i> <b>1.</b> <span role="img" aria-label="Swedish flag">&#x1F1F8;&#x1F1EA;</span> <i>Escape, Flight, Getaway.</i><br />
  <i>v.</i> <b>2.</b> <span role="img" aria-label="UK flag">&#x1F1EC;&#x1F1E7;</span> <i>To be propelled; launched with a swift, sharp motion.</i><br /><br />

  <a href="https://js13kgames.com"><strong>A 2025 js13k game jam entry »</strong></a>
  <br /><br />
</p>

## Controls

- **Left Click**: Shoot blue portal
- **Right Click**: Shoot orange portal  
- **Space** (hold): Jump
- **W/↑**: Increase jump power
- **S/↓**: Decrease jump power
- **A/←**: Point jump to left
- **D/→**: Point jump to right

## Nerd stuff

### Core Systems
- **Portal System**: Raycasting, velocity transformation, cooldown management
- **Physics Engine**: Custom collisions and inertia
- **Camera System**: EMA smoothing with safe zones and pixel snapping
- **Audio Engine**: ZzFX-based sound generator for sfx
- **Music**: Custom ZZfxm songs composed for a small form factor
- **Scene Management**: State machine with transition support
- **Level Data**: Support for tiled map editor