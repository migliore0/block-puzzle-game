const c=document.getElementById("game"),ctx=c.getContext("2d")
const DPR=window.devicePixelRatio||1
const W=360,H=640
c.style.width=W+"px";c.style.height=H+"px"
c.width=W*DPR;c.height=H*DPR
ctx.scale(DPR,DPR)

const G=8,S=40
const FX=(W-G*S)/2,FY=120
const IDLE=0.88,DRAG=1
const FOLLOW=0.85

const COLORS=["#9FD3B8","#F28B82","#F7D046","#A7C7E7","#C3AED6"]
const SHAPES={
 big:[
  [[0,0],[1,0],[2,0]],
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[1,0],[1,1]]
 ],
 mid:[
  [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[0,1]]
 ],
 small:[
  [[0,0]]
 ]
}

let field=Array.from({length:G},()=>Array(G).fill(null))
let figs=[],drag=null,preview=[]
let score=0,best=+localStorage.best||0
let audio=null

function initAudio(){
 if(audio)return
 audio=new (window.AudioContext||window.webkitAudioContext)()
}
function play(f=400,d=0.06,t="triangle",v=0.15){
 if(!audio)return
 const o=audio.createOscillator(),g=audio.createGain()
 o.type=t;o.frequency.value=f;g.gain.value=v
 o.connect(g);g.connect(audio.destination)
 o.start();o.stop(audio.currentTime+d)
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
 ctx.strokeStyle="#2b2b2b"
 rr(x,y,S,S,6)
 ctx.stroke()
}

function drawBlock(x,y,c){
 ctx.fillStyle="rgba(0,0,0,.45)"
 ctx.fillRect(x+4,y+6,S-6,S-6)
 ctx.fillStyle=c
 rr(x,y,S-6,S-6,6)
 ctx.fill()
 ctx.fillStyle="rgba(255,255,255,.22)"
 ctx.fillRect(x+6,y+6,S-18,5)
}

function bounds(sh){
 let w=0,h=0
 sh.forEach(b=>{w=Math.max(w,b[0]);h=Math.max(h,b[1])})
 return {w:w+1,h:h+1}
}

function fits(sh){
 let r=[]
 for(let y=0;y<G;y++)for(let x=0;x<G;x++){
  if(sh.every(b=>{
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

function pick(){
 let f=fillRate()
 let pool=f<0.35?SHAPES.big:f<0.65?[...SHAPES.big,...SHAPES.mid]:SHAPES.small
 return pool[Math.random()*pool.length|0]
}

function spawn(){
 while(figs.length<3){
  let sh=pick(),b=bounds(sh),i=figs.length
  figs.push({
   shape:sh,
   color:COLORS[Math.random()*COLORS.length|0],
   x:60+i*120,
   y:560-b.h*S*IDLE,
   tx:60+i*120,
   ty:560-b.h*S*IDLE,
   s:IDLE
  })
 }
 play(520,0.05)
}

function place(f,gx,gy){
 f.shape.forEach(b=>field[gy+b[1]][gx+b[0]]={c:f.color})
 score+=f.shape.length*10
 if(score>best){best=score;localStorage.best=best}
 play(320,0.05,"square",0.2)
}

function reset(){
 field=Array.from({length:G},()=>Array(G).fill(null))
 figs=[]
 score=0
 spawn()
}

function draw(){
 ctx.clearRect(0,0,W,H)

 ctx.fillStyle="#111"
 rr(FX-12,FY-12,G*S+24,G*S+24,20)
 ctx.fill()

 for(let y=0;y<G;y++)for(let x=0;x<G;x++)
  drawCell(FX+x*S,FY+y*S)

 preview.forEach(p=>{
  ctx.globalAlpha=0.5
  drawBlock(FX+p[0]*S,FY+p[1]*S,"#fff")
  ctx.globalAlpha=1
 })

 for(let y=0;y<G;y++)for(let x=0;x<G;x++){
  let b=field[y][x]
  if(b)drawBlock(FX+x*S,FY+y*S,b.c)
 }

 ctx.fillStyle="#fff"
 ctx.font="600 34px Arial"
 ctx.textAlign="center"
 ctx.fillText(score,W/2,70)
 ctx.font="14px Arial"
 ctx.fillText("BEST "+best,W/2,95)

 ctx.font="22px Arial"
 ctx.fillText("⚙",W-26,34)

 figs.forEach(f=>{
  f.x+=(f.tx-f.x)*FOLLOW
  f.y+=(f.ty-f.y)*FOLLOW
  let b=bounds(f.shape)
  ctx.save()
  ctx.translate(f.x+S*b.w/2,f.y+S*b.h/2)
  ctx.scale(f.s,f.s)
  ctx.translate(-S*b.w/2,-S*b.h/2)
  f.shape.forEach(p=>drawBlock(p[0]*S,p[1]*S,f.color))
  ctx.restore()
 })
}

c.onpointerdown=e=>{
 initAudio()
 let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top

 if(mx>W-48&&my<48){reset();play(200,0.1);return}

 figs.forEach(f=>{
  let b=bounds(f.shape)
  if(mx>f.x&&mx<f.x+b.w*S&&my>f.y&&my<f.y+b.h*S){
   drag=f
   f.s=DRAG
   play(600,0.03)
  }
 })
}

c.onpointermove=e=>{
 if(!drag)return
 let r=c.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top
 drag.tx=mx-S
 drag.ty=my-S*2.2
 preview=[]
 let gx=Math.round((drag.tx-FX)/S),gy=Math.round((drag.ty-FY)/S)
 if(fits(drag.shape).some(p=>p[0]==gx&&p[1]==gy))
  drag.shape.forEach(b=>preview.push([gx+b[0],gy+b[1]]))
}

c.onpointerup=()=>{
 if(!drag)return
 let gx=Math.round((drag.x-FX)/S),gy=Math.round((drag.y-FY)/S)
 if(fits(drag.shape).some(p=>p[0]==gx&&p[1]==gy)){
  place(drag,gx,gy)
  figs=figs.filter(q=>q!==drag)
  spawn()
 }else{
  let b=bounds(drag.shape)
  drag.ty=560-b.h*S*IDLE
  drag.s=IDLE
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