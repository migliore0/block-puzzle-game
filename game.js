const c=document.getElementById("game")
const ctx=c.getContext("2d")

const BASE_W=360
const BASE_H=640

let VIEW_W=360
let VIEW_H=640
let SCALE=1

function resize(){
  const dpr=window.devicePixelRatio||1
  const w=window.innerWidth
  const h=window.innerHeight
  VIEW_W=w
  VIEW_H=h
  SCALE=Math.min(w/BASE_W,h/BASE_H)
  c.style.width=w+"px"
  c.style.height=h+"px"
  c.width=w*dpr
  c.height=h*dpr
  ctx.setTransform(dpr,0,0,dpr,0,0)
}
window.addEventListener("resize",resize)
resize()

const GRID=8
const CELL=40
const FX=(BASE_W-GRID*CELL)/2
const FY=120

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
let particles=[]
let comboText=null
let paused=false
let showMenu=false
let showGameOver=false
let audioCtx=null

function sound(f=300,d=0.06){
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)()
  const o=audioCtx.createOscillator()
  const g=audioCtx.createGain()
  o.frequency.value=f
  g.gain.value=0.08
  o.connect(g)
  g.connect(audioCtx.destination)
  o.start()
  o.stop(audioCtx.currentTime+d)
}

function vibrate(ms){
  if(navigator.vibrate) navigator.vibrate(ms)
}

function bounds(s){
  let w=0,h=0
  s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
  return{w:w+1,h:h+1}
}

function canPlace(s,x,y){
  return s.every(b=>{
    let nx=x+b[0],ny=y+b[1]
    return nx>=0&&ny>=0&&nx<GRID&&ny<GRID&&!field[ny][nx]
  })
}

function anyMoves(){
  for(let f of figures)
    for(let y=0;y<GRID;y++)
      for(let x=0;x<GRID;x++)
        if(canPlace(f.shape,x,y)) return true
  return false
}

function pickSmart(){
  let pool=SHAPES.filter(s=>{
    for(let y=0;y<GRID;y++)
      for(let x=0;x<GRID;x++)
        if(canPlace(s,x,y)) return true
    return false
  })
  if(!pool.length) pool=[SHAPES[0]]
  return pool[Math.random()*pool.length|0]
}

function spawnSet(){
  figures=[]
  const slots=[70,180,290]
  for(let i=0;i<3;i++){
    let s=pickSmart()
    let b=bounds(s)
    figures.push({
      shape:s,
      color:COLORS[Math.random()*COLORS.length|0],
      homeX:slots[i],
      homeY:520-b.h*CELL,
      x:slots[i],
      y:BASE_H+100,
      tx:slots[i],
      ty:520-b.h*CELL,
      vy:0,
      bounce:true,
      scale:0.85
    })
  }
}

function init(){
  field=Array.from({length:GRID},()=>Array(GRID).fill(null))
  figures=[]
  preview=[]
  particles=[]
  score=visualScore=0
  paused=false
  showMenu=false
  showGameOver=false
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

function clearLines(){
  let rows=[],cols=[]
  for(let y=0;y<GRID;y++) if(field[y].every(c=>c)) rows.push(y)
  for(let x=0;x<GRID;x++) if(field.every(r=>r[x])) cols.push(x)
  let cleared=rows.length+cols.length
  if(!cleared) return
  rows.forEach(y=>{
    for(let x=0;x<GRID;x++){
      particles.push({x:FX+x*CELL+CELL/2,y:FY+y*CELL+CELL/2,vx:(Math.random()-.5)*4,vy:(Math.random()-.8)*4,l:30,c:field[y][x]})
      field[y][x]=null
    }
  })
  cols.forEach(x=>{
    for(let y=0;y<GRID;y++){
      particles.push({x:FX+x*CELL+CELL/2,y:FY+y*CELL+CELL/2,vx:(Math.random()-.5)*4,vy:(Math.random()-.8)*4,l:30,c:field[y][x]})
      field[y][x]=null
    }
  })
  score+=cleared*150
  comboText={t:"COMBO x"+cleared,a:60}
  sound(220+cleared*60)
  vibrate(20)
}

function getPointer(e){
  const r=c.getBoundingClientRect()
  return{
    x:(e.clientX-r.left-(VIEW_W-BASE_W*SCALE)/2)/SCALE,
    y:(e.clientY-r.top-(VIEW_H-BASE_H*SCALE)/2)/SCALE
  }
}

function draw(){
  ctx.clearRect(0,0,VIEW_W,VIEW_H)
  ctx.save()
  ctx.translate((VIEW_W-BASE_W*SCALE)/2,(VIEW_H-BASE_H*SCALE)/2)
  ctx.scale(SCALE,SCALE)

  ctx.fillStyle=UI_BG
  ctx.fillRect(0,0,BASE_W,BASE_H)

  ctx.fillStyle=BOARD_FRAME
  rr(FX-16,FY-16,GRID*CELL+32,GRID*CELL+32,26)
  ctx.fill()

  ctx.fillStyle=BOARD_BG
  rr(FX-8,FY-8,GRID*CELL+16,GRID*CELL+16,20)
  ctx.fill()

  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    ctx.strokeStyle=GRID_CELL
    rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
    ctx.stroke()
    if(field[y][x]) drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
  }

  preview.forEach(p=>{
    ctx.globalAlpha=.45
    drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#fff")
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
    }else f.y+=(f.ty-f.y)*0.8
    let b=bounds(f.shape)
    ctx.save()
    ctx.translate(f.x+CELL*b.w/2,f.y+CELL*b.h/2)
    ctx.scale(f.scale,f.scale)
    ctx.translate(-CELL*b.w/2,-CELL*b.h/2)
    f.shape.forEach(p=>drawBlock(p[0]*CELL,p[1]*CELL,f.color))
    ctx.restore()
  })

  visualScore+=(score-visualScore)*0.15
  ctx.fillStyle="#333"
  ctx.font="600 36px Arial"
  ctx.textAlign="center"
  ctx.fillText(Math.floor(visualScore),BASE_W/2,80)
  ctx.font="14px Arial"
  ctx.fillText("BEST "+best,BASE_W/2,105)

  if(comboText){
    ctx.font="20px Arial"
    ctx.fillStyle="rgba(0,0,0,"+(comboText.a/60)+")"
    ctx.fillText(comboText.t,BASE_W/2,140)
    comboText.a--
    if(comboText.a<=0) comboText=null
  }

  particles.forEach(p=>{
    ctx.globalAlpha=p.l/30
    ctx.fillStyle=p.c
    ctx.fillRect(p.x,p.y,4,4)
    p.x+=p.vx
    p.y+=p.vy
    p.vy+=0.15
    p.l--
  })
  particles=particles.filter(p=>p.l>0)
  ctx.globalAlpha=1

  ctx.font="26px Arial"
  ctx.textAlign="right"
  ctx.fillText("⚙",BASE_W-10,36)

  ctx.restore()
}

c.onpointerdown=e=>{
  let {x,y}=getPointer(e)
  if(x>BASE_W-50&&y<50){paused=true;showMenu=true;return}
  figures.forEach(f=>{
    let b=bounds(f.shape)
    if(x>f.x&&x<f.x+b.w*CELL&&y>f.y&&y<f.y+b.h*CELL){
      dragging=f
      f.scale=1
      sound(500)
      vibrate(10)
    }
  })
}

c.onpointermove=e=>{
  if(!dragging||paused) return
  let {x,y}=getPointer(e)
  dragging.tx=x-CELL
  dragging.ty=y-CELL*2
  preview=[]
  let gx=Math.round((dragging.tx-FX)/CELL)
  let gy=Math.round((dragging.ty-FY)/CELL)
  if(canPlace(dragging.shape,gx,gy))
    dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
  if(!dragging||paused) return
  let f=dragging
  let gx=Math.round((f.x-FX)/CELL)
  let gy=Math.round((f.y-FY)/CELL)
  if(canPlace(f.shape,gx,gy)){
    f.shape.forEach(b=>field[gy+b[1]][gx+b[0]]=f.color)
    score+=f.shape.length*10
    best=Math.max(best,score)
    localStorage.best=best
    clearLines()
    figures=figures.filter(x=>x!==f)
    if(!figures.length) spawnSet()
    if(!anyMoves()){showGameOver=true;paused=true}
    sound(220)
    vibrate(20)
  }else{
    let b=bounds(f.shape)
    f.ty=520-b.h*CELL
    f.scale=0.85
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