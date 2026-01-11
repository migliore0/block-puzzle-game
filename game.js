const c=document.getElementById("game"),ctx=c.getContext("2d")

const DPR=window.devicePixelRatio||1
const W=360,H=640
c.style.width=W+"px"
c.style.height=H+"px"
c.width=W*DPR
c.height=H*DPR
ctx.scale(DPR,DPR)

const G=8,S=42
const FX=(W-G*S)/2,FY=130
const IDLE=0.82,DRAG=1
const FOLLOW=0.75

const COLORS=["#F28B82","#F7D046","#A7C7E7","#A8D5BA","#C3AED6","#F5B971"]

const SHAPES=[
 [[0,0]],
 [[0,0],[1,0]],
 [[0,0],[1,0],[2,0]],
 [[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[0,1],[1,0],[1,1]],
 [[0,0],[0,1],[0,2]],
 [[0,0],[1,0],[0,1]],
 [[0,0],[1,0],[2,0],[1,1]],
 [[0,0],[1,0],[2,0],[2,1]],
 [[0,0],[0,1],[1,1],[2,1]]
]

let field=[]
let figures=[]
let drag=null
let preview=[]
let score=0
let best=+localStorage.best||0
let gameOver=false

function resetGame(){
 field=Array.from({length:G},()=>Array(G).fill(null))
 figures=[]
 score=0
 gameOver=false
 spawnPack()
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

function canPlaceAt(shape,gx,gy){
 return shape.every(p=>{
  let x=gx+p[0],y=gy+p[1]
  return x>=0&&y>=0&&x<G&&y<G&&!field[y][x]
 })
}

function hasMoves(){
 return figures.some(f=>{
  for(let y=0;y<G;y++)for(let x=0;x<G;x++)
   if(canPlaceAt(f.shape,x,y))return true
  return false
 })
}

function spawnPack(){
 figures=[]
 const baseY=H-130
 const gap=110
 for(let i=0;i<3;i++){
  let sh=SHAPES[Math.random()*SHAPES.length|0]
  figures.push({
   shape:sh,
   color:COLORS[Math.random()*COLORS.length|0],
   x:W/2-gap+i*gap,
   y:baseY,
   tx:W/2-gap+i*gap,
   ty:baseY,
   scale:IDLE
  })
 }
}

function clearLines(){
 let rows=[],cols=[]
 for(let y=0;y<G;y++)if(field[y].every(v=>v))rows.push(y)
 for(let x=0;x<G;x++){
  let ok=true
  for(let y=0;y<G;y++)if(!field[y][x])ok=false
  if(ok)cols.push(x)
 }
 rows.forEach(y=>{for(let x=0;x<G;x++)field[y][x]=null})
 cols.forEach(x=>{for(let y=0;y<G;y++)field[y][x]=null})
 if(rows.length||cols.length)
  score+=(rows.length+cols.length)*100
}

function place(fig,gx,gy){
 fig.shape.forEach(p=>field[gy+p[1]][gx+p[0]]={c:fig.color})
 score+=fig.shape.length*10
 clearLines()
 if(score>best){best=score;localStorage.best=best}
}

function drawGameOver(){
 ctx.fillStyle="rgba(0,0,0,.65)"
 ctx.fillRect(0,0,W,H)

 ctx.fillStyle="#fff"
 ctx.textAlign="center"
 ctx.font="700 36px Arial"
 ctx.fillText("Game Over",W/2,250)

 ctx.font="16px Arial"
 ctx.fillText("Score "+score,W/2,290)

 rr(W/2-90,330,180,46,16)
 ctx.fillStyle="#1f1f1f"
 ctx.fill()
 ctx.fillStyle="#fff"
 ctx.font="18px Arial"
 ctx.fillText("Играть снова",W/2,360)
}

function draw(){
 ctx.clearRect(0,0,W,H)

 ctx.fillStyle="#111"
 rr(FX-14,FY-14,G*S+28,G*S+28,22)
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

 figures.forEach(f=>{
  f.x+=(f.tx-f.x)*FOLLOW
  f.y+=(f.ty-f.y)*FOLLOW
  let w=0,h=0
  f.shape.forEach(p=>{w=Math.max(w,p[0]);h=Math.max(h,p[1])})
  ctx.save()
  ctx.translate(f.x+S*(w+1)/2,f.y+S*(h+1)/2)
  ctx.scale(f.scale,f.scale)
  ctx.translate(-S*(w+1)/2,-S*(h+1)/2)
  f.shape.forEach(p=>drawBlock(p[0]*S,p[1]*S,f.color))
  ctx.restore()
 })

 if(gameOver)drawGameOver()
}

c.onpointerdown=e=>{
 let r=c.getBoundingClientRect()
 let mx=e.clientX-r.left,my=e.clientY-r.top

 if(gameOver){
  if(mx>W/2-90&&mx<W/2+90&&my>330&&my<376)resetGame()
  return
 }

 figures.forEach(f=>{
  let w=0,h=0
  f.shape.forEach(p=>{w=Math.max(w,p[0]);h=Math.max(h,p[1])})
  if(mx>f.x&&mx<f.x+(w+1)*S&&my>f.y&&my<f.y+(h+1)*S){
   drag={f}
   f.scale=DRAG
  }
 })
}

c.onpointermove=e=>{
 if(!drag||gameOver)return
 let r=c.getBoundingClientRect()
 let mx=e.clientX-r.left,my=e.clientY-r.top
 drag.f.tx=mx-S
 drag.f.ty=my-S*2
 preview=[]
 let gx=Math.round((drag.f.tx-FX)/S)
 let gy=Math.round((drag.f.ty-FY)/S)
 if(canPlaceAt(drag.f.shape,gx,gy))
  drag.f.shape.forEach(p=>preview.push([gx+p[0],gy+p[1]]))
}

c.onpointerup=()=>{
 if(!drag||gameOver)return
 let f=drag.f
 let gx=Math.round((f.x-FX)/S)
 let gy=Math.round((f.y-FY)/S)
 if(canPlaceAt(f.shape,gx,gy)){
  place(f,gx,gy)
  figures=figures.filter(q=>q!==f)
  if(figures.length===0){
   spawnPack()
   if(!hasMoves())gameOver=true
  }
 }else f.scale=IDLE
 drag=null
 preview=[]
}

function loop(){
 draw()
 requestAnimationFrame(loop)
}

resetGame()
loop()