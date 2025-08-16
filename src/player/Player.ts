// src/player/Player.ts
import { Idle } from "./states/Idle";
import { Run } from "./states/Run";
import { Jump } from "./states/Jump";
import { Cling } from "./states/Cling";
import { Fling } from "./states/Fling";
import { applyPhysics, type PhysicsBody } from "./Physics";
import { AnimationController, type AnimationName } from "./AnimationController";
import type { AtlasAnimator } from "../animation/AtlasAnimator";
import type { InputState } from "./states/types";

const STATES = { idle: Idle, run: Run, jump: Jump, cling: Cling, fling: Fling } as const;
const clamp = (n:number,a:number,b:number)=>n<a?a:n>b?b:n;
const { cos, sin, abs, PI } = Math;
const A = { idle:"idle", dash:"dash", jump:"jump", fall:"fall", ledge:"ledge" } as const;
const WORLD_G = 0.14;

export class Player {
  body: PhysicsBody = {
    pos:{x:48,y:48}, vel:{x:0,y:0},
    width:32, height:32,
    hit:{x:8,y:6,w:16,h:24},
    grounded:false
  };

  anim = new AnimationController();
  private current = Idle;
  atlas: AtlasAnimator;

  moveSpeed = 1.5;
  jumpSpeed = 6;

  wasJump = false;
  aiming  = false;
  clingSide = 1;      // -1 left, +1 right
  clingGrace = 0;

  // +1 right, -1 left
  facing: 1 | -1 = 1;

  // aim params
  aimAngle = PI*0.6;
  aimPower = 3.5;
  minPower = 2.0;
  maxPower = 8.0;
  chargeRate = 0.14;
  angleStep  = 2*PI/180;

  constructor(atlas: AtlasAnimator){ this.atlas = atlas; }

  setState(n: keyof typeof STATES){
    const s = STATES[n]; if (!s || s===this.current) return;
    this.current.exit?.(this); this.current = s; s.enter?.(this);
  }
  setAnimation(name: AnimationName){ this.anim.set(name); }

  update(input: Partial<InputState>, ctx: CanvasRenderingContext2D){
    const i = { left:!!input.left, right:!!input.right, jump:!!input.jump } as InputState;
    this.current.update(this, i);
    applyPhysics(this.body, ctx);
    this.updateFacing(i);
    this.wasJump = i.jump;
  }

  draw(ctx: CanvasRenderingContext2D, t:number){
    const a = this.anim.getCurrent();
    const m = this.atlas.getMeta(a);
    const frame = ((t*.001)*((m?.fps)||6) | 0) % ((m?.frameCount)||1);

    const b = this.body, flip = this.facing < 0;
    ctx.save();
    if (flip) ctx.scale(-1,1);
    this.atlas.drawFrame(ctx, a, frame, flip ? -b.pos.x - b.width : b.pos.x, b.pos.y);
    ctx.restore();

    // draw trajectory only while aiming & anchored
    if (this.aiming && (this.grounded || this.current===Cling)) this.drawAim(ctx);
  }

  // per-frame while Space is held (from Idle/Run/Cling)
  aimTick(i: InputState){
    const b:any = this.body, onWall = b.touchL || b.touchR;
    if (!this.grounded && !onWall && this.current !== Cling) return;

    this.aiming = true;

    // grounded → idle pose, wall/Cling → ledge pose
    const cur = this.anim.getCurrent();
    if (onWall || this.current===Cling) {
      if (cur !== A.ledge) this.setAnimation(A.ledge);
    } else {
      if (cur !== A.idle) this.setAnimation(A.idle);
    }

    // freeze while aiming
    b.vel.x = 0; b.vel.y = 0;

    // aim controls
    this.aimAngle = clamp(
      this.aimAngle + (i.left? +this.angleStep : 0) + (i.right? -this.angleStep : 0),
      0.05, PI-0.05
    );
    this.aimPower = clamp(this.aimPower + this.chargeRate, this.minPower, this.maxPower);
  }

  private drawAim(ctx: CanvasRenderingContext2D){
    const b = this.body, g = WORLD_G;
    const px = b.pos.x + b.width*.5, py = b.pos.y + b.height*.5;
    const vx = cos(this.aimAngle)*this.aimPower;
    const vy =-sin(this.aimAngle)*this.aimPower;

    const bad = this.isBadAim(vx, vy);

    ctx.save();
    ctx.globalAlpha = .92;
    ctx.fillStyle = bad ? "#f55" : "#fff";
    const steps = 26, dt = 1;
    for(let k=0;k<=steps;k++){
      const tt=k*dt, x=px+vx*tt, y=py+vy*tt+.5*g*tt*tt;
      ctx.fillRect(x|0, y|0, 1, 1);
    }
    ctx.restore();
  }

  // likely useless fling?
  private isBadAim(vx:number, vy:number){
    const g=WORLD_G, apex=vy*vy/(2*g), t=abs(vy)/g*2, range=abs(vx)*t;
    const b:any=this.body, onWall = this.current===Cling || b.touchL || b.touchR;
    const weak = apex<4 && range<12;
    return onWall ? (vx*this.clingSide>=0 || weak) : weak;
  }

  // state + intent aware facing
  private updateFacing(i: InputState){
    if (this.current===Cling){ this.facing = this.clingSide>=0?1:-1; return; }
    if (this.aiming && (this.grounded || this.current===Cling)){
      this.facing = cos(this.aimAngle)>=0 ? 1 : -1; return;
    }
    if (this.grounded){
      if (i.left && !i.right){ this.facing=-1; return; }
      if (i.right && !i.left){ this.facing=+1; return; }
    }
    const vx=this.body.vel.x;
    if (abs(vx)>.05) this.facing = vx>=0 ? 1 : -1;
  }

  // passthroughs (kept for ergonomics)
  get pos(){ return this.body.pos; }     set pos(p){ this.body.pos = p; }
  get vel(){ return this.body.vel; }     set vel(v){ this.body.vel = v; }
  get grounded(){ return this.body.grounded; } set grounded(v){ this.body.grounded = v; }
  get width(){ return this.body.width; } get height(){ return this.body.height; }
}
