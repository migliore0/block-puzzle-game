const c=document.getElementById("game"),ctx=c.getContext("2d")
c.width=360;c.height=640

let ysdk=null
if(window.YaGames)YaGames.init().then(s=>ysdk=s)

const G=8,S=42,FX=(360-G*S)/2,FY=140
const idleScale=0.78,dragScale=1
const FOLLOW=0.78

const COLORS=["#F28B82","#F7D046","#A7C7E7","#A8D5BA","#C3AED6","#F5B971"]

const SHAPES=[
[[0,0]],
[[0,0],[1,0]],
[[0,0],[1,0],[2,0]],
[[0,0],[1,0],[2,0],[3,0]],
[[0,0],[0,1],[1,0],[1,1]],
[[0,0],[0,1],[0,2],[1,2]],
[[0,0],[1,0],[2,0],[2,1]],
[[0,0],[1,0],[0,1]],
[[0,0],[1,0],[2,0],[1,1]]
]

let field=Array.from({length:G},()=>Array(G).fill(null))
let shapes=[],drag=null,preview=[]
let score=0,best=+localStorage.best||0,combo=0,over=false
let clears=[],lastChance=false
let lastShapes=[]

let audioCtx=null
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
  ctx.fillStyle="#1b1b1b"
  rr(x,y,S-2,S-2,6)
  ctx.fill()
}

function drawBlock(x,y,col,a=1,s=1){
  ctx.save()
  ctx.globalAlpha=a
  ctx.translate(x+S/2,y+S/2)
  ctx.scale(s,s)
  ctx.translate(-S/2,-S/2)
  ctx.fillStyle="rgba(0,0,0,.45)"
  ctx.fillRect(4,6,S-6,S-6)
  ctx.fillStyle=col
  rr(0,0,S-6,S-6,6)
  ctx.fill()
  ctx.fillStyle="rgba(255,255,255,.22)"
  ctx.fillRect(6,6,S-18,5)
  ctx.restore()
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

function pickShape(){
  let pool=SHAPES.filter(s=>!lastShapes.includes(s))
  let s=pool[Math.random()*pool.length|0]
  lastShapes.push(s)
  if(lastShapes.length>2)lastShapes.shift()
  return s
}

function shapeBounds(shape){
  let w=0,h=0
  shape.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
  return {w,h}
}

function spawn(extra=false){
  if(!extra){shapes=[]}
  let n=extra?1:3
  for(let i=0;i<n;i++){
    let sh=pickShape()
    let b=shapeBounds(sh)
    shapes.push({
      shape:sh,
      color:COLORS[Math.random()*COLORS.length|0],
      x:60+i*120,
      y:540-b.h*S*idleScale,
      tx:0,ty:0,
      scale:idleScale
    })
  }
  play(520,0.05)
}

function place(s,gx,gy){
  s.shape.forEach(b=>field[gy+b[1]][gx+b[0]]={c:s.color})
  score+=s.shape.length*10
  if(score>best){best=score;localStorage.best=best}
  play(320,0.04,"square",0.2)
}

function draw(){
  ctx.clearRect(0,0,c.width,c.height)

  ctx.fillStyle="#101010"
  rr(FX-12,FY-12,G*S+24,G*S+24,20)
  ctx.fill()

  for(let y=0;y<G;y++)for(let x=0;x<G;x++)
    drawCell(FX+x*S+1,FY+y*S+1)

  preview.forEach(p=>{
    drawBlock(FX+p[0]*S,FY+p[1]*S,"#ffffff44",0.6)
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

  shapes.forEach(s=>{
    s.x+=(s.tx-s.x)*FOLLOW
    s.y+=(s.ty-s.y)*FOLLOW
    s.shape.forEach(b=>{
      drawBlock(s.x+b[0]*S,s.y+b[1]*S,s.color,1,s.scale)
    })
  })
}

c.onpointerdown=e=>{
  initAudio()
  let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
  shapes.forEach(s=>s.shape.forEach(b=>{
    let px=s.x+b[0]*S,py=s.y+b[1]*S
    if(mx>px&&mx<px+S&&my>py&&my<py+S){
      drag={s}
      s.scale=dragScale
      play(600,0.03)
    }
  }))
}

c.onpointermove=e=>{
  if(!drag)return
  let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
  drag.s.tx=mx-S
  drag.s.ty=my-S*2.2
  preview=[]
  let gx=Math.round((drag.s.tx-FX)/S),gy=Math.round((drag.s.ty-FY)/S)
  if(fits(drag.s.shape).some(p=>p[0]==gx&&p[1]==gy))
    drag.s.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
  if(!drag)return
  let s=drag.s
  let gx=Math.round((s.x-FX)/S),gy=Math.round((s.y-FY)/S)
  if(fits(s.shape).some(p=>p[0]==gx&&p[1]==gy)){
    place(s,gx,gy)
    shapes=shapes.filter(q=>q!==s)
    if(!shapes.length)spawn()
  }else{
    s.ty=540
    s.scale=idleScale
  }
  drag=null
  preview=[]
}

function loop(){
  draw()
  requestAnimationFrame(loop)
}

spawn()
loop()