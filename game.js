const c=document.getElementById("game")
if(!c){ alert("canvas #game не найден. Проверь index.html"); throw new Error("no canvas") }
const ctx=c.getContext("2d")
if(!ctx){ alert("Не удалось получить 2D контекст"); throw new Error("no ctx") }

c.width=360
c.height=640

const GRID=8
const CELL=42
const FX=(360-GRID*CELL)/2
const FY=140

const SNAP_DIST=0.35
const DRAG_OFFSET_Y=2

const UI_BG="#F2F4F8"
const BOARD_BG="#E6EAF2"
const GRID_CELL="#CBD3E1"
const BOARD_FRAME="#9FA8DA"

const COLORS=[
  "#FF8A80",
  "#FFD180",
  "#82B1FF",
  "#A7FFEB",
  "#B388FF",
  "#FFAB91"
]

const SHAPES=[
  [[0,0]],
  [[0,0],[1,0]],
  [[0,0],[1,0],[2,0]],
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[0,1]],
  [[0,0],[1,0],[2,0],[1,1]],
  [[0,0],[1,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[0,1]],
  [[0,0],[0,1],[1,1],[2,1]],
  [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
  [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]
]

let field=[]
let figures=[]
let dragging=null
let preview=[]
let score=0
let visualScore=0
let best=+localStorage.best||0
let paused=false

let audioCtx=null
let audioReady=false

function ensureAudio(){
  if(audioReady) return
  audioReady=true
  audioCtx=new (window.AudioContext||window.webkitAudioContext)()
}

function vibrate(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms) }catch(e){} }

function sound(freq=320, dur=0.06, vol=0.08){
  if(!audioCtx) return
  const t=audioCtx.currentTime
  const o=audioCtx.createOscillator()
  const g=audioCtx.createGain()
  o.type="sine"
  o.frequency.setValueAtTime(freq,t)
  g.gain.setValueAtTime(vol,t)
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur)
  o.connect(g)
  g.connect(audioCtx.destination)
  o.start(t)
  o.stop(t+dur)
}

function bounds(s){
  let w=0,h=0
  s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
  return {w:w+1,h:h+1}
}

function canPlaceOn(f,s,gx,gy){
  return s.every(b=>{
    let x=gx+b[0],y=gy+b[1]
    return x>=0&&y>=0&&x<GRID&&y<GRID&&!f[y][x]
  })
}

function anyFitsOn(f,s){
  for(let y=0;y<GRID;y++)
    for(let x=0;x<GRID;x++)
      if(canPlaceOn(f,s,x,y)) return true
  return false
}

function cloneField(src){
  return src.map(r=>r.slice())
}

function placeOn(f,s,x,y){
  s.forEach(b=>{ f[y+b[1]][x+b[0]]=1 })
}

function anyMoveOn(f,shapes){
  for(let s of shapes){
    for(let y=0;y<GRID;y++){
      for(let x=0;x<GRID;x++){
        if(canPlaceOn(f,s,x,y)) return true
      }
    }
  }
  return false
}

function bestMoveExists(f,shapes){
  for(let s of shapes){
    for(let y=0;y<GRID;y++){
      for(let x=0;x<GRID;x++){
        if(canPlaceOn(f,s,x,y)){
          let nf=cloneField(f)
          placeOn(nf,s,x,y)
          if(anyMoveOn(nf,shapes)) return true
        }
      }
    }
  }
  return false
}

function fillRatio(){
  let cnt=0
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++) if(field[y][x]) cnt++
  return cnt/(GRID*GRID)
}

let shapeHistory=[]

function fitsAnywhere(s){
  return anyFitsOn(field,s)
}

function pickCandidateShapes(){
  let fill=fillRatio()
  let pool=SHAPES.filter(s=>fitsAnywhere(s))
  if(!pool.length) pool=[SHAPES[0]]

  pool=pool.filter(s=>!shapeHistory.includes(s) || Math.random()<0.25)

  let nearLose=fill>0.78
  if(nearLose){
    pool=pool.slice().sort((a,b)=>{
      let sa=bounds(a).w*bounds(a).h
      let sb=bounds(b).w*bounds(b).h
      return sa-sb
    }).slice(0,5)
  }else{
    pool=pool.filter(s=>{
      let size=bounds(s).w*bounds(s).h
      if(fill<0.35) return size>=4
      if(fill<0.65) return size<=6
      return size<=3
    })
    if(!pool.length) pool=SHAPES.filter(s=>fitsAnywhere(s))
    if(!pool.length) pool=[SHAPES[0]]
  }

  return pool
}

function generateSmartSet(){
  let attempts=0
  while(attempts++<14){
    let used=[]
    let set=[]
    for(let i=0;i<3;i++){
      let pool=pickCandidateShapes()
      let s
      let guard=0
      do{
        s=pool[Math.random()*pool.length|0]
      }while(used.includes(s) && guard++<20)
      used.push(s)
      set.push(s)
    }

    if(bestMoveExists(cloneField(field),set)){
      shapeHistory.push(...set)
      shapeHistory=shapeHistory.slice(-6)
      return set
    }
  }
  return [SHAPES[0],SHAPES[1],SHAPES[2]]
}

function spawnSet(){
  figures=[]
  const set=generateSmartSet()
  for(let i=0;i<3;i++){
    let s=set[i]
    let b=bounds(s)
    figures.push({
      shape:s,
      color:COLORS[Math.random()*COLORS.length|0],
      homeX:60+i*120,
      homeY:560-b.h*CELL,
      x:60+i*120,
      y:700,
      tx:60+i*120,
      ty:560-b.h*CELL,
      vy:0,
      bounce:true,
      scale:0.9
    })
  }
}

function init(){
  field=Array.from({length:GRID},()=>Array(GRID).fill(null))
  figures=[]
  preview=[]
  dragging=null
  score=0
  visualScore=0
  paused=false
  shapeHistory=[]
  spawnSet()
}

function rr(x,y,w,h,r){
  ctx.beginPath()
  ctx.moveTo(x+r,y)
  ctx.arcTo(x+w,y,x+w,y+h,r)
  ctx.arcTo(x+w,y+h,x,y+h,r)
  ctx.arcTo(x,y+h,x,y,r)
  ctx.arcTo(x,y,x+w,y,r)
  ctx.closePath()
}

function drawBlock(x,y,col){
  ctx.fillStyle="rgba(0,0,0,.12)"
  rr(x+3,y+5,CELL-6,CELL-6,10)
  ctx.fill()
  ctx.fillStyle=col
  rr(x,y,CELL-6,CELL-6,10)
  ctx.fill()
  ctx.fillStyle="rgba(255,255,255,.35)"
  rr(x+6,y+6,CELL-20,6,4)
  ctx.fill()
}

function clamp(v,a,b){ return Math.max(a,Math.min(b,v)) }

function draw(){
  ctx.fillStyle=UI_BG
  ctx.fillRect(0,0,360,640)

  ctx.fillStyle=BOARD_FRAME
  rr(FX-18,FY-18,GRID*CELL+36,GRID*CELL+36,28)
  ctx.fill()

  ctx.fillStyle=BOARD_BG
  rr(FX-10,FY-10,GRID*CELL+20,GRID*CELL+20,22)
  ctx.fill()

  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    ctx.strokeStyle=GRID_CELL
    rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
    ctx.stroke()
    if(field[y][x]) drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
  }

  preview.forEach(p=>{
    ctx.globalAlpha=.45
    drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#FFFFFF")
    ctx.globalAlpha=1
  })

  figures.forEach(f=>{
    f.x+=(f.tx-f.x)*0.8

    if(f.bounce){
      f.vy+=1.2
      f.y+=f.vy
      if(f.y>=f.ty){
        f.y=f.ty
        f.vy*=-0.4
        if(Math.abs(f.vy)<0.8) f.bounce=false
      }
    }else{
      f.y+=(f.ty-f.y)*0.8
    }

    let b=bounds(f.shape)
    ctx.save()
    ctx.translate(f.x+CELL*b.w/2,f.y+CELL*b.h/2)
    ctx.scale(f.scale,f.scale)
    ctx.translate(-CELL*b.w/2,-CELL*b.h*CELL/2)
    f.shape.forEach(p=>drawBlock(p[0]*CELL,p[1]*CELL,f.color))
    ctx.restore()
  })

  visualScore+=(score-visualScore)*0.15
  ctx.fillStyle="#333"
  ctx.font="600 36px Arial"
  ctx.textAlign="center"
  ctx.fillText(Math.floor(visualScore),180,80)
  ctx.font="14px Arial"
  ctx.fillText("BEST "+best,180,105)

  ctx.font="26px Arial"
  ctx.textAlign="right"
  ctx.fillText("⚙",350,40)
}

c.onpointerdown=e=>{
  ensureAudio()
  if(audioCtx && audioCtx.state==="suspended") audioCtx.resume().catch(()=>{})
  let r=c.getBoundingClientRect()
  let mx=e.clientX-r.left,my=e.clientY-r.top

  figures.forEach(f=>{
    let b=bounds(f.shape)
    if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
      dragging=f
      f.scale=1
      sound(520,0.05,0.07)
      vibrate(8)
    }
  })
}

c.onpointermove=e=>{
  if(!dragging||paused) return
  let r=c.getBoundingClientRect()

  let tx=e.clientX-r.left-CELL
  let ty=e.clientY-r.top-CELL*DRAG_OFFSET_Y

  let b=bounds(dragging.shape)
  tx=clamp(tx, 0, 360-b.w*CELL)
  ty=clamp(ty, 0, 640-b.h*CELL)

  dragging.tx=tx
  dragging.ty=ty

  preview=[]
  let gx=(dragging.tx-FX)/CELL
  let gy=(dragging.ty-FY)/CELL

  let rx=Math.round(gx)
  let ry=Math.round(gy)

  let dx=Math.abs(gx-rx)
  let dy=Math.abs(gy-ry)
  if(dx<=SNAP_DIST) gx=rx
  if(dy<=SNAP_DIST) gy=ry

  let igx=Math.round(gx)
  let igy=Math.round(gy)

  if(canPlaceOn(field,dragging.shape,igx,igy)){
    dragging.tx=FX+igx*CELL
    dragging.ty=FY+igy*CELL
    dragging.shape.forEach(p=>preview.push([igx+p[0],igy+p[1]]))
  }
}

c.onpointerup=()=>{
  if(!dragging||paused) return
  let f=dragging

  let gx=Math.round((f.tx-FX)/CELL)
  let gy=Math.round((f.ty-FY)/CELL)

  if(canPlaceOn(field,f.shape,gx,gy)){
    f.shape.forEach(b=> field[gy+b[1]][gx+b[0]]=f.color )
    score+=f.shape.length*10
    best=Math.max(best,score)
    localStorage.best=best
    sound(240,0.06,0.08)
    vibrate(14)
    figures=figures.filter(x=>x!==f)
    if(!figures.length) spawnSet()
  }else{
    let b=bounds(f.shape)
    f.tx=f.homeX
    f.ty=f.homeY
    f.scale=0.9
  }

  dragging=null
  preview=[]
}

function loop(){
  draw()
  requestAnimationFrame(loop)
}

init()
loop()