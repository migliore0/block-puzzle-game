const c = document.getElementById("game")
const ctx = c.getContext("2d")

c.width = 360
c.height = 640

const GRID = 8
const CELL = 42
const FX = (360 - GRID * CELL) / 2
const FY = 130
const SPAWN_Y = 560

const BG = "#17181B"
const BOARD_BG = "#141518"
const GRID_LINE = "rgba(255,255,255,0.06)"
const FRAME_GLOW = "rgba(0,0,0,0.35)"

const COLORS = [
  "#F48B82",
  "#F6D365",
  "#8EC5FC",
  "#9BE7C4",
  "#C7B7E2",
  "#F7B267"
]

const SHAPES = [
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

let field, figures, dragging, preview
let score = 0, visualScore = 0
let best = +localStorage.best || 0
let paused = false
let showMenu = false
let showGameOver = false

function bounds(s){
  let w=0,h=0
  s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
  return {w:w+1,h:h+1}
}

function canPlace(s,gx,gy){
  return s.every(b=>{
    let x=gx+b[0], y=gy+b[1]
    return x>=0 && y>=0 && x<GRID && y<GRID && !field[y][x]
  })
}

function spawnSet(){
  figures=[]
  const slots=[70,180,290]
  for(let i=0;i<3;i++){
    let s=SHAPES[Math.random()*SHAPES.length|0]
    let b=bounds(s)
    let w=b.w*CELL
    let h=b.h*CELL
    figures.push({
      shape:s,
      color:COLORS[Math.random()*COLORS.length|0],
      homeX:slots[i]-w/2,
      homeY:SPAWN_Y-h,
      x:slots[i]-w/2,
      y:700,
      tx:slots[i]-w/2,
      ty:SPAWN_Y-h,
      scale:0.72,
      idle:0.72,
      active:1
    })
  }
}

function init(){
  field = Array.from({length:GRID},()=>Array(GRID).fill(null))
  figures=[]
  dragging=null
  preview=[]
  score=0
  visualScore=0
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
  ctx.fillStyle="rgba(0,0,0,.4)"
  rr(x+3,y+5,CELL-6,CELL-6,10)
  ctx.fill()
  ctx.fillStyle=col
  rr(x,y,CELL-6,CELL-6,10)
  ctx.fill()
}

function draw(){
  ctx.fillStyle=BG
  ctx.fillRect(0,0,360,640)

  ctx.fillStyle=BOARD_BG
  rr(FX-14,FY-14,GRID*CELL+28,GRID*CELL+28,26)
  ctx.fill()

  ctx.strokeStyle=GRID_LINE
  for(let y=0;y<GRID;y++)
    for(let x=0;x<GRID;x++)
      rr(FX+x*CELL,FY+y*CELL,CELL,CELL,10),ctx.stroke()

  for(let y=0;y<GRID;y++)
    for(let x=0;x<GRID;x++)
      if(field[y][x])
        drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])

  preview.forEach(p=>{
    ctx.globalAlpha=.45
    drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#fff")
    ctx.globalAlpha=1
  })

  figures.forEach(f=>{
    f.x+=(f.tx-f.x)*0.85
    f.y+=(f.ty-f.y)*0.85
    let b=bounds(f.shape)
    ctx.save()
    ctx.translate(f.x+CELL*b.w/2,f.y+CELL*b.h/2)
    ctx.scale(f.scale,f.scale)
    ctx.translate(-CELL*b.w/2,-CELL*b.h/2)
    f.shape.forEach(p=>drawBlock(p[0]*CELL,p[1]*CELL,f.color))
    ctx.restore()
  })

  visualScore+=(score-visualScore)*0.15
  ctx.fillStyle="#fff"
  ctx.font="600 36px Arial"
  ctx.textAlign="center"
  ctx.fillText(Math.floor(visualScore),180,80)
  ctx.font="14px Arial"
  ctx.fillText("BEST "+best,180,105)

  ctx.font="26px Arial"
  ctx.textAlign="right"
  ctx.fillText("⚙",350,42)

  if(showMenu||showGameOver){
    ctx.fillStyle="rgba(0,0,0,.75)"
    ctx.fillRect(0,0,360,640)
    ctx.fillStyle="#fff"
    ctx.textAlign="center"
    ctx.font="700 32px Arial"
    ctx.fillText(showGameOver?"GAME OVER":"PAUSE",180,220)
    ctx.font="22px Arial"
    ctx.fillText("🔁 Restart",180,320)
    if(!showGameOver)ctx.fillText("✕ Close",180,370)
  }
}

c.onpointerdown=e=>{
  let r=c.getBoundingClientRect()
  let mx=e.clientX-r.left,my=e.clientY-r.top

  if(mx>310&&my<60){
    showMenu=true
    paused=true
    return
  }

  if(showMenu){
    if(my>300&&my<340)init()
    if(my>350&&my<390){showMenu=false;paused=false}
    return
  }

  if(paused)return

  figures.forEach(f=>{
    let b=bounds(f.shape)
    if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
      dragging=f
      f.scale=f.active
    }
  })
}

c.onpointermove=e=>{
  if(!dragging||paused)return
  let r=c.getBoundingClientRect()
  dragging.tx=Math.max(0,Math.min(360-CELL,e.clientX-r.left-CELL/2))
  dragging.ty=Math.max(100,Math.min(640-CELL,e.clientY-r.top-CELL))
  preview=[]
  let gx=Math.round((dragging.tx+CELL/2-FX)/CELL)
  let gy=Math.round((dragging.ty+CELL/2-FY)/CELL)
  if(canPlace(dragging.shape,gx,gy))
    dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
  if(!dragging||paused)return
  let f=dragging
  let gx=Math.round((f.tx+CELL/2-FX)/CELL)
  let gy=Math.round((f.ty+CELL/2-FY)/CELL)
  if(canPlace(f.shape,gx,gy)){
    f.shape.forEach(b=>field[gy+b[1]][gx+b[0]]=f.color)
    score+=f.shape.length*10
    best=Math.max(best,score)
    localStorage.best=best
    figures=figures.filter(x=>x!==f)
    if(figures.length===0)spawnSet()
  }else{
    f.tx=f.homeX
    f.ty=f.homeY
    f.scale=f.idle
  }
  dragging=null
  preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}

init()
loop()