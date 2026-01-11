const c=document.getElementById("game"),ctx=c.getContext("2d")
c.width=360;c.height=640

const G=8,S=42
const FX=(360-G*S)/2,FY=140
const IDLE_SCALE=0.88,DRAG_SCALE=1
const FOLLOW=0.85

const COLORS=["#F28B82","#F7D046","#A7C7E7","#A8D5BA","#C3AED6","#F5B971"]

const SHAPES={
  small:[
    [[0,0]],
    [[0,0],[1,0]]
  ],
  medium:[
    [[0,0],[1,0],[2,0]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[0,2]],
    [[0,0],[1,0],[0,1]]
  ],
  big:[
    [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],
    [[0,0],[1,0],[2,0],[1,1]]
  ]
}

let field=Array.from({length:G},()=>Array(G).fill(null))
let figures=[],drag=null,preview=[]
let score=0,best=+localStorage.best||0
let audioCtx=null
let lastShapes=[]

function initAudio(){
  if(audioCtx)return
  audioCtx=new (window.AudioContext||window.webkitAudioContext)()
}
function play(f=400,d=0.06,t="triangle",v=0.15){
  if(!audioCtx)return
  const o=audioCtx.createOscillator(),g=audioCtx.createGain()
  o.type=t;o.frequency.value=f
  g.gain.value=v
  o.connect(g);g.connect(audioCtx.destination)
  o.start();o.stop(audioCtx.currentTime+d)
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

function drawCell(x,y){
  ctx.strokeStyle="#2a2a2a"
  rr(x,y,S,S,6)
  ctx.stroke()
}

function drawBlock(x,y,col){
  ctx.fillStyle="rgba(0,0,0,.45)"
  ctx.fillRect(x+4,y+6,S-6,S-6)
  ctx.fillStyle=col
  rr(x,y,S-6,S-6,6)
  ctx.fill()
  ctx.fillStyle="rgba(255,255,255,.22)"
  ctx.fillRect(x+6,y+6,S-18,5)
}

function shapeBounds(shape){
  let w=0,h=0
  shape.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
  return {w:w+1,h:h+1}
}

function fits(shape){
  let r=[]
  for(let y=0;y<G;y++)for(let x=0;x<G;x++){
    if(shape.every(b=>{
      let nx=x+b[0],ny=y+b[1]
      return nx>=0&&ny>=0&&nx<G&&ny<G&&!field[ny][nx]
    }))r.push([x,y])
  }
  return r
}

function fillRate(){
  let f=0
  for(let y=0;y<G;y++)for(let x=0;x<G;x++)if(field[y][x])f++
  return f/(G*G)
}

function pickShape(){
  let fill=fillRate()
  let pool=fill<0.35?SHAPES.big:fill<0.65?[...SHAPES.medium,...SHAPES.big]:SHAPES.small
  pool=pool.filter(s=>!lastShapes.includes(s))
  let s=pool[Math.random()*pool.length|0]
  lastShapes.push(s)
  if(lastShapes.length>3)lastShapes.shift()
  return s
}

function spawnThree(){
  figures=[]
  for(let i=0;i<3;i++){
    let sh=pickShape()
    let b=shapeBounds(sh)
    figures.push({
      shape:sh,
      color:COLORS[Math.random()*COLORS.length|0],
      x:60+i*120,
      y:560-b.h*S*IDLE_SCALE,
      tx:60+i*120,
      ty:560-b.h*S*IDLE_SCALE,
      scale:IDLE_SCALE
    })
  }
  play(520,0.05)
}

function place(fig,gx,gy){
  fig.shape.forEach(b=>field[gy+b[1]][gx+b[0]]={c:fig.color})
  score+=fig.shape.length*10
  if(score>best){best=score;localStorage.best=best}
  play(320,0.05,"square",0.2)
}

function draw(){
  ctx.clearRect(0,0,c.width,c.height)

  ctx.fillStyle="#111"
  rr(FX-12,FY-12,G*S+24,G*S+24,20)
  ctx.fill()

  for(let y=0;y<G;y++)for(let x=0;x<G;x++)
    drawCell(FX+x*S,FY+y*S)

  preview.forEach(p=>{
    ctx.globalAlpha=0.5
    drawBlock(FX+p[0]*S,FY+p[1]*S,"#ffffff")
    ctx.globalAlpha=1
  })

  for(let y=0;y<G;y++)for(let x=0;x<G;x++){
    let b=field[y][x]
    if(b)drawBlock(FX+x*S,FY+y*S,b.c)
  }

  ctx.fillStyle="#fff"
  ctx.font="600 34px Arial"
  ctx.textAlign="center"
  ctx.fillText(score,c.width/2,80)
  ctx.font="14px Arial"
  ctx.fillText("BEST "+best,c.width/2,105)

  figures.forEach(f=>{
    f.x+=(f.tx-f.x)*FOLLOW
    f.y+=(f.ty-f.y)*FOLLOW
    let b=shapeBounds(f.shape)
    ctx.save()
    ctx.translate(f.x+S*b.w/2,f.y+S*b.h/2)
    ctx.scale(f.scale,f.scale)
    ctx.translate(-S*b.w/2,-S*b.h/2)
    f.shape.forEach(p=>drawBlock(p[0]*S,p[1]*S,f.color))
    ctx.restore()
  })
}

c.onpointerdown=e=>{
  initAudio()
  let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
  figures.forEach(f=>{
    let b=shapeBounds(f.shape)
    if(mx>f.x&&mx<f.x+b.w*S&&my>f.y&&my<f.y+b.h*S){
      drag={f}
      f.scale=DRAG_SCALE
      play(600,0.03)
    }
  })
}

c.onpointermove=e=>{
  if(!drag)return
  let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
  drag.f.tx=mx-S
  drag.f.ty=my-S*2.2
  preview=[]
  let gx=Math.round((drag.f.tx-FX)/S),gy=Math.round((drag.f.ty-FY)/S)
  if(fits(drag.f.shape).some(p=>p[0]==gx&&p[1]==gy))
    drag.f.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
  if(!drag)return
  let f=drag.f
  let gx=Math.round((f.x-FX)/S),gy=Math.round((f.y-FY)/S)
  if(fits(f.shape).some(p=>p[0]==gx&&p[1]==gy)){
    place(f,gx,gy)
    figures=figures.filter(q=>q!==f)
    if(figures.length===0)spawnThree()
  }else{
    let b=shapeBounds(f.shape)
    f.ty=560-b.h*S*IDLE_SCALE
    f.scale=IDLE_SCALE
  }
  drag=null
  preview=[]
}

function loop(){
  draw()
  requestAnimationFrame(loop)
}

spawnThree()
loop()