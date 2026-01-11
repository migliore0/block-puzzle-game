const c = document.getElementById("game")
const ctx = c.getContext("2d")

c.width = 360
c.height = 640

const GRID = 8
const CELL = 42
const FIELD_SIZE = GRID * CELL
const FX = (360 - FIELD_SIZE) / 2
const FY = 140
const SPAWN_Y = 560

const BG_COLOR = "#d1d1d1"
const FIELD_BG = "#3e3e3e"
const CELL_LINE = "#2b2b2b"
const FRAME_COLOR = "#4a4a4a"

const COLORS = [
  "#ff8a80",
  "#ffd180",
  "#90caf9",
  "#a5d6a7",
  "#ce93d8",
  "#ffcc80"
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

function bounds(s){
  let w=0,h=0
  s.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
  return {w:w+1,h:h+1}
}

function canPlace(s,gx,gy){
  return s.every(b=>{
    let x=gx+b[0],y=gy+b[1]
    return x>=0&&y>=0&&x<GRID&&y<GRID&&!field[y][x]
  })
}

function init(){
  field = Array.from({length:GRID},()=>Array(GRID).fill(null))
  figures = []
  preview = []
  dragging = null
  score = 0
  visualScore = 0
  spawnSet()
}

function spawnSet(){
  figures=[]
  const slots=[70,180,290]
  for(let i=0;i<3;i++){
    const shape=SHAPES[Math.random()*SHAPES.length|0]
    const b=bounds(shape)
    figures.push({
      shape,
      color:COLORS[Math.random()*COLORS.length|0],
      homeX:slots[i]-b.w*CELL/2,
      homeY:SPAWN_Y-b.h*CELL,
      x:slots[i]-b.w*CELL/2,
      y:700,
      tx:slots[i]-b.w*CELL/2,
      ty:SPAWN_Y-b.h*CELL,
      scale:0.75,
      idleScale:0.75,
      dragScale:1
    })
  }
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

function drawBlock(x,y,c){
  ctx.fillStyle="rgba(0,0,0,.25)"
  rr(x+3,y+5,CELL-6,CELL-6,8)
  ctx.fill()
  ctx.fillStyle=c
  rr(x,y,CELL-6,CELL-6,8)
  ctx.fill()
  ctx.fillStyle="rgba(255,255,255,.35)"
  rr(x+6,y+6,CELL-18,6,4)
  ctx.fill()
}

function draw(){
  ctx.clearRect(0,0,360,640)
  ctx.fillStyle=BG_COLOR
  ctx.fillRect(0,0,360,640)

  ctx.fillStyle=FIELD_BG
  rr(FX-12,FY-12,FIELD_SIZE+24,FIELD_SIZE+24,20)
  ctx.fill()

  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    ctx.strokeStyle=CELL_LINE
    rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
    ctx.stroke()
    if(field[y][x]) drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
  }

  preview.forEach(p=>{
    ctx.globalAlpha=.4
    drawBlock(FX+p[0]*CELL,FY+p[1]*CELL,"#fff")
    ctx.globalAlpha=1
  })

  figures.forEach(f=>{
    f.x+=(f.tx-f.x)*0.85
    f.y+=(f.ty-f.y)*0.85
    const b=bounds(f.shape)
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

  ctx.font="18px Arial"
  ctx.textAlign="left"
  ctx.fillText("👑 "+best,20,50)

  ctx.font="26px Arial"
  ctx.textAlign="right"
  ctx.fillText("⚙",340,50)

  if(showMenu){
    ctx.fillStyle="rgba(0,0,0,.6)"
    ctx.fillRect(0,0,360,640)
    ctx.fillStyle="#fff"
    ctx.textAlign="center"
    ctx.font="28px Arial"
    ctx.fillText("PAUSE",180,300)
  }
}

c.onpointerdown=e=>{
  let r=c.getBoundingClientRect()
  let mx=e.clientX-r.left,my=e.clientY-r.top
  if(mx>310&&my<80){showMenu=!showMenu;return}
  if(showMenu)return
  figures.forEach(f=>{
    const b=bounds(f.shape)
    if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
      dragging=f
      f.scale=f.dragScale
    }
  })
}

c.onpointermove=e=>{
  if(!dragging||showMenu)return
  let r=c.getBoundingClientRect()
  let mx=e.clientX-r.left
  let my=e.clientY-r.top
  dragging.tx=Math.min(Math.max(mx-CELL/2,0),360-CELL)
  dragging.ty=Math.min(Math.max(my-CELL*1.6,0),640-CELL)
  preview=[]
  let gx=Math.round((dragging.tx-FX)/CELL)
  let gy=Math.round((dragging.ty-FY)/CELL)
  if(canPlace(dragging.shape,gx,gy))
    dragging.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
  if(!dragging)return
  let f=dragging
  let gx=Math.round((f.tx-FX)/CELL)
  let gy=Math.round((f.ty-FY)/CELL)
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
    f.scale=f.idleScale
  }
  dragging=null
  preview=[]
}

function loop(){draw();requestAnimationFrame(loop)}
init()
loop()