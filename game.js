const c = document.getElementById("game")
const ctx = c.getContext("2d")

c.width = 360
c.height = 640

const GRID = 8
const CELL = 42
const FX = (360 - GRID * CELL) / 2
const FY = 150
const SPAWN_Y = 560

const BG_TOP = "#BEBEBE"
const BG_BOTTOM = "#B3B3B3"
const FIELD_BG = "#3E3E3E"
const FIELD_BG_DARK = "#353535"
const GRID_LINE = "#2F2F2F"
const FRAME = "#5A5A5A"

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
let particles = []
let comboText = null
let paused = false
let showMenu = false
let showGameOver = false

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
  ctx.fillStyle = "rgba(0,0,0,0.35)"
  rr(x+2,y+4,CELL-4,CELL-4,8)
  ctx.fill()

  ctx.fillStyle = col
  rr(x,y,CELL,CELL,8)
  ctx.fill()

  ctx.fillStyle = "rgba(255,255,255,0.35)"
  rr(x+6,y+6,CELL-16,6,4)
  ctx.fill()
}

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

function spawnSet(){
  figures=[]
  const slots=[80,180,280]
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
      scale:0.75,
      idleScale:0.75,
      dragScale:1
    })
  }
}

function init(){
  field=Array.from({length:GRID},()=>Array(GRID).fill(null))
  figures=[]
  dragging=null
  preview=[]
  particles=[]
  comboText=null
  score=0
  visualScore=0
  paused=false
  showMenu=false
  showGameOver=false
  spawnSet()
}

function draw(){
  const g = ctx.createLinearGradient(0,0,0,640)
  g.addColorStop(0,BG_TOP)
  g.addColorStop(1,BG_BOTTOM)
  ctx.fillStyle=g
  ctx.fillRect(0,0,360,640)

  ctx.fillStyle=FIELD_BG
  rr(FX-14,FY-14,GRID*CELL+28,GRID*CELL+28,22)
  ctx.fill()

  ctx.strokeStyle=FRAME
  ctx.lineWidth=3
  rr(FX-14,FY-14,GRID*CELL+28,GRID*CELL+28,22)
  ctx.stroke()

  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    ctx.strokeStyle=GRID_LINE
    rr(FX+x*CELL,FY+y*CELL,CELL,CELL,8)
    ctx.stroke()
    if(field[y][x]) drawBlock(FX+x*CELL,FY+y*CELL,field[y][x])
  }

  figures.forEach(f=>{
    f.x+=(f.tx-f.x)*0.8
    f.y+=(f.ty-f.y)*0.8
    let b=bounds(f.shape)
    ctx.save()
    ctx.translate(f.x+CELL*b.w/2,f.y+CELL*b.h/2)
    ctx.scale(f.scale,f.scale)
    ctx.translate(-CELL*b.w/2,-CELL*b.h/2)
    f.shape.forEach(p=>drawBlock(p[0]*CELL,p[1]*CELL,f.color))
    ctx.restore()
  })

  visualScore+=(score-visualScore)*0.12
  ctx.fillStyle="#fff"
  ctx.font="700 40px Arial"
  ctx.textAlign="center"
  ctx.fillText(Math.floor(visualScore),180,90)

  ctx.fillStyle="#F5C542"
  ctx.font="700 18px Arial"
  ctx.textAlign="left"
  ctx.fillText("👑 "+best,20,40)

  ctx.font="26px Arial"
  ctx.textAlign="right"
  ctx.fillText("⚙",350,40)
}

c.onpointerdown=e=>{
  let r=c.getBoundingClientRect()
  let mx=e.clientX-r.left,my=e.clientY-r.top
  if(mx>310&&my<60){showMenu=!showMenu;paused=showMenu;return}
  if(paused)return
  figures.forEach(f=>{
    let b=bounds(f.shape)
    if(mx>f.x&&mx<f.x+b.w*CELL&&my>f.y&&my<f.y+b.h*CELL){
      dragging=f
      f.scale=f.dragScale
    }
  })
}

c.onpointermove=e=>{
  if(!dragging||paused)return
  let r=c.getBoundingClientRect()
  dragging.tx=Math.max(0,Math.min(360, e.clientX-r.left))-CELL
  dragging.ty=Math.max(0,Math.min(640, e.clientY-r.top))-CELL*1.5
}

c.onpointerup=()=>{
  if(!dragging)return
  dragging.tx=dragging.homeX
  dragging.ty=dragging.homeY
  dragging.scale=dragging.idleScale
  dragging=null
}

function loop(){draw();requestAnimationFrame(loop)}
init()
loop()